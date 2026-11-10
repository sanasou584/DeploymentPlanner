import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';

import { User } from '../../src/models/entities/index.js';
import { createProfileService } from '../../src/services/profile/profile.service.js';
import {
  AccountDisabledError,
  ForbiddenError,
  NotFoundError,
} from '../../src/domain/errors/index.js';
import {
  connectTestingModule,
  disconnectTestingModule,
} from '../integration/test-database.js';

/**
 * Creates an ACTIVE local-password user directly on the model: the profile
 * service asserts account state itself, so registrations start approved here
 * except where a test pins a non-ACTIVE state.
 */
async function createActiveUser(email: string, name = 'Ahmed Profile') {
  const created = await User.register({ name, email, password: 'strong-pass-1' });
  await created.approve();
  return created;
}

let service: ReturnType<typeof createProfileService>;

beforeAll(async () => {
  await connectTestingModule('profile_service_test');
  await User.init();
  service = createProfileService();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await User.deleteMany({}).setOptions({ withDeleted: true });
});

describe('Profile service', () => {
  it('getProfile returns the whitelisted DTO and never the password hash', async () => {
    const user = await createActiveUser('dto@example.com');

    const profile = await service.getProfile(user.id);

    expect(profile).toMatchObject({
      id: user.id,
      name: 'Ahmed Profile',
      email: 'dto@example.com',
      role: 'DEVELOPER',
      avatarUrl: null,
    });
    expect(profile).not.toHaveProperty('passwordHash');
  });

  it('updateProfile applies name and avatarUrl and trims', async () => {
    const user = await createActiveUser('update@example.com');

    const named = await service.updateProfile(user.id, {
      name: '  Fatma Profile  ',
      avatarUrl: 'https://cdn.example.com/avatars/fatma.png',
    });

    expect(named.name).toBe('Fatma Profile');
    expect(named.avatarUrl).toBe('https://cdn.example.com/avatars/fatma.png');

    const cleared = await service.updateProfile(user.id, { avatarUrl: null });

    expect(cleared.avatarUrl).toBeNull();
  });

  it('profiles are NOT FOUND for unknown ids', async () => {
    const unknownId = new Types.ObjectId().toHexString();

    await expect(service.getProfile(unknownId)).rejects.toThrowError(NotFoundError);
    await expect(
      service.updateProfile(unknownId, { name: 'Nobody' }),
    ).rejects.toThrowError(NotFoundError);
    await expect(
      service.changePassword(unknownId, {
        currentPassword: 'strong-pass-1',
        newPassword: 'fresh-pass-1234',
      }),
    ).rejects.toThrowError(NotFoundError);
  });

  it('profiles are FORBIDDEN for non-ACTIVE accounts (PENDING, DISABLED, deleted)', async () => {
    const pending = await User.register({
      name: 'Pending Dev',
      email: 'pending@example.com',
      password: 'strong-pass-1',
    });

    await expect(service.getProfile(pending.id)).rejects.toThrowError(ForbiddenError);

    const disabled = await createActiveUser('disabled@example.com', 'Disabled Dev');
    await disabled.deactivate();

    await expect(service.getProfile(disabled.id)).rejects.toThrowError(ForbiddenError);
    await expect(
      service.updateProfile(disabled.id, { name: 'Ghost Patch' }),
    ).rejects.toThrowError(ForbiddenError);

    const deleted = await createActiveUser('deleted@example.com', 'Deleted Dev');
    await deleted.softDelete();

    await expect(service.getProfile(deleted.id)).rejects.toThrowError(AccountDisabledError);
  });

  it('changePassword refuses a wrong current password before touching the model', async () => {
    const user = await createActiveUser('wrongpass@example.com');

    await expect(
      service.changePassword(user.id, {
        currentPassword: 'not-the-password',
        newPassword: 'fresh-pass-1234',
      }),
    ).rejects.toThrowError(ForbiddenError);

    expect(await user.verifyPassword('strong-pass-1')).toBe(true);
  });

  it('changePassword stores the new hash; old password stops verifying', async () => {
    const user = await createActiveUser('rotate@example.com');

    await service.changePassword(user.id, {
      currentPassword: 'strong-pass-1',
      newPassword: 'fresh-pass-1234',
    });

    // The stored doc is the source of truth: reload it with the hash selected.
    const reloaded = await User.findById(user.id).select('+passwordHash').exec();

    if (!reloaded) throw new Error('user vanished');
    expect(await reloaded.verifyPassword('fresh-pass-1234')).toBe(true);
    expect(await reloaded.verifyPassword('strong-pass-1')).toBe(false);
  });

  it('changePassword is FORBIDDEN for accounts without a local password (GitHub-only)', async () => {
    const githubUser = await User.create({
      name: 'Github Dev',
      email: 'github-only@example.com',
    });
    await githubUser.approve();

    await expect(
      service.changePassword(githubUser.id, {
        currentPassword: 'whatever-pass-1',
        newPassword: 'fresh-pass-1234',
      }),
    ).rejects.toThrowError(ForbiddenError);
  });
});
