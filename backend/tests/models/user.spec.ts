import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { User, USER_MODEL_NAME, type UserDocument } from '../../src/models/entities/user.model.js';
import { AccountDisabledError, InvariantViolationError } from '../../src/domain/errors/index.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';
import { validatedErrorPaths } from '../helpers/schema-validation.js';

const EMAIL_A = 'dev-a@example.com';
const EMAIL_B = 'dev-b@example.com';

const registerValid = async (
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<UserDocument> =>
  User.register({
    name: 'Developer A',
    email: EMAIL_A,
    password: 'correct-horse',
    ...overrides,
  });

beforeAll(async () => {
  await connectTestingModule('users_unit_test');
  await User.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  // Purge active + deactivated rows (the soft-delete guard preserves deleted).
  await User.deleteMany({}).setOptions({ withDeleted: true });
});

describe('User model', () => {
  describe('field validation', () => {
    it('creates a valid user', async () => {
      const user = await registerValid();

      expect(user.name).toBe('Developer A');
      expect(user.email).toBe(EMAIL_A.toLowerCase());
      expect(user.role).toBe('DEVELOPER');
    });

    it('rejects a name shorter than 2 characters', async () => {
      const user = new User({ name: 'a', email: EMAIL_A, passwordHash: 'h' });
      expect(await validatedErrorPaths(user)).toContain('name');
    });

    it('rejects a name longer than 100 characters', async () => {
      const user = new User({ name: 'x'.repeat(101), email: EMAIL_A, passwordHash: 'h' });
      expect(await validatedErrorPaths(user)).toContain('name');
    });

    it('trims the name', async () => {
      const user = await registerValid({ name: '  Spaced Name ' });
      expect(user.name).toBe('Spaced Name');
    });

    it('rejects an invalid email', async () => {
      const user = new User({ name: 'Dev', email: 'not-an-email', passwordHash: 'h' });
      expect(await validatedErrorPaths(user)).toContain('email');
    });

    it('lowercases the email', async () => {
      const user = await registerValid({ email: '  MiXeD@Example.COM ' });
      expect(user.email).toBe('mixed@example.com');
    });

    it('defaults role to DEVELOPER and rejects an unknown role', async () => {
      expect((await registerValid()).role).toBe('DEVELOPER');

      const user = new User({ name: 'Dev', email: EMAIL_A, passwordHash: 'h', role: 'SUPERUSER' });
      expect(await validatedErrorPaths(user)).toContain('role');
    });
  });

  describe('register()', () => {
    it('hashes the password and never stores the plain text', async () => {
      const user = await registerValid({ password: 'super-secret-pass' });
      const hash = user.get('passwordHash') as string;

      expect(hash.startsWith('$argon2')).toBe(true);
      expect(hash).not.toBe('super-secret-pass');
      const serialized = JSON.stringify(user.toJSON());
      expect(serialized).not.toContain('super-secret-pass');
      expect(serialized).not.toContain('passwordHash');
    });

    it('rejects a password shorter than 8 characters', async () => {
      await expect(registerValid({ password: 'short' })).rejects.toThrowError(InvariantViolationError);
      await expect(registerValid({ password: 'short' })).rejects.toThrowError(/at least 8/);
    });

    it('enforces unique email, even against soft-deleted users', async () => {
      const first = await registerValid();
      await first.softDelete();
      await expect(
        User.register({ name: 'Bob', email: EMAIL_A, password: 'another-pass-1' }),
      ).rejects.toThrowError(/duplicate key|E11000/);
    });
  });

  describe('password behavior', () => {
    it('setPassword rehashes and verifies', async () => {
      const user = await registerValid();
      await user.setPassword('brand-new-pass');
      const stored = (await User.findById(user.id).select('+passwordHash')) as UserDocument;

      expect(await stored.verifyPassword('brand-new-pass')).toBe(true);
      expect(await stored.verifyPassword('wrong-pass-99')).toBe(false);
    });

    it('verifyPassword without a loaded hash throws an invariant', async () => {
      const user = await registerValid();
      const withoutHash = (await User.findById(user.id)) as UserDocument;

      await expect(withoutHash.verifyPassword('12345678')).rejects.toThrowError(
        InvariantViolationError,
      );
    });
  });

  describe('lifecycle', () => {
    it('recordLogin sets lastLoginAt', async () => {
      const user = await registerValid();
      const after = await user.recordLogin();

      expect(after.lastLoginAt).toBeInstanceOf(Date);
    });

    it('updateProfile changes the name', async () => {
      const user = await registerValid();
      const after = await user.updateProfile({ name: 'New Name' });

      expect(after.name).toBe('New Name');
    });

    it('changeRole flips DEVELOPER -> ADMIN and isAdmin() reflects it', async () => {
      const user = await registerValid();
      expect(user.isAdmin()).toBe(false);

      const admin = await user.changeRole('ADMIN');
      expect(admin.role).toBe('ADMIN');
      expect(admin.isAdmin()).toBe(true);
    });

    it('isAdmin() is true for ADMIN role', async () => {
      const user = await User.register({
        name: 'Admin',
        email: EMAIL_B,
        password: 'admin-pass-1',
        role: 'ADMIN',
      });

      expect(user.isAdmin()).toBe(true);
    });
  });

  describe('account lifecycle (approval machine)', () => {
    it('new accounts are PENDING and cannot authenticate until approved', async () => {
      const user = await registerValid();
      expect(user.status).toBe('PENDING');
      expect(() => user.assertCanAuthenticate()).toThrowError(/not approved/);

      const approved = await user.approve();
      expect(approved.status).toBe('ACTIVE');
      expect(() => approved.assertCanAuthenticate()).not.toThrow();
    });

    it('ACTIVE -> DISABLED -> ACTIVE (reactivate), NEVER soft-deletes', async () => {
      const user = await registerValid();
      await user.approve();

      const deactivated = await user.deactivate();
      expect(deactivated.status).toBe('DISABLED');
      expect(deactivated.isDeleted).toBe(false);
      await expect(deactivated.deactivate()).rejects.toThrowError(/Invalid state transition/);

      const reactivated = await deactivated.reactivate();
      expect(reactivated.status).toBe('ACTIVE');
    });

    it('PENDING -> REJECTED is terminal; approved() from REJECTED throws', async () => {
      const user = await registerValid();
      const rejected = await user.reject();
      expect(rejected.status).toBe('REJECTED');
      await expect(rejected.reject()).rejects.toThrowError(/Invalid state transition/);
      await expect(rejected.approve()).rejects.toThrowError(/Invalid state transition/);
    });

    it('soft delete (plugin) remains reserved for hard deletion', async () => {
      const user = await registerValid();
      const deleted = (await user.softDelete()) as UserDocument;
      expect(deleted.isDeleted).toBe(true);
      expect(() => deleted.assertCanAuthenticate()).toThrowError(AccountDisabledError);
    });
  });

  it('exposes the model name constant', () => {
    expect(USER_MODEL_NAME).toBe('User');
  });
});
