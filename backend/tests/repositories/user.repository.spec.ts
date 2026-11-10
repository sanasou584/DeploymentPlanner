import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { User, type UserDocument } from '../../src/models/entities/index.js';
import { UserRepository } from '../../src/repositories/index.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';

let users: UserDocument[] = [];

beforeAll(async () => {
  await connectTestingModule('user_repo_test');
  await User.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await User.deleteMany({}).setOptions({ withDeleted: true });
  users = [];
  for (let i = 0; i < 4; i += 1) {
    users.push(
      await User.register({ name: `dev ${i}`, email: `dev${i}@example.com`, password: 'LongEnough1!' }),
    );
  }
  await users[0]?.changeRole('ADMIN');
});

describe('UserRepository', () => {
  describe('findByEmail', () => {
    it('is case-insensitive and tolerant of whitespace', async () => {
      const found = await new UserRepository().findByEmail('  DEV1@Example.com ');
      expect(found?.email).toBe('dev1@example.com');
    });

    it('excludes deactivated accounts unless opted in', async () => {
      const target = users[2];
      if (!target) throw new Error('missing fixture');
      await target.softDelete();

      const repo = new UserRepository();
      expect(await repo.findByEmail('dev2@example.com')).toBeNull();
      expect((await repo.findByEmail('dev2@example.com', { withDeleted: true }))?.name).toBe('dev 2');
    });
  });

  describe('search (admin list)', () => {
    it('returns everything when no criteria given, newest first', async () => {
      const result = await new UserRepository().search({});
      expect(result.items).toHaveLength(4);
      expect(result.items[0]?.email).toBe('dev3@example.com');
      expect(result.total).toBe(4);
    });

    it('matches q against name OR email case-insensitively (regex-safe)', async () => {
      const byName = await new UserRepository().search({ q: 'DEV 1' });
      expect(byName.items).toHaveLength(1);
      expect(byName.items[0]?.name).toBe('dev 1');

      const byEmail = await new UserRepository().search({ q: 'dev3@' });
      expect(byEmail.items).toHaveLength(1);
      expect(byEmail.items[0]?.email).toBe('dev3@example.com');

      const regexInjection = await new UserRepository().search({ q: '.*' });
      expect(regexInjection.items).toHaveLength(0);
    });

    it('filters by role', async () => {
      const admins = await new UserRepository().search({ role: 'ADMIN' });
      expect(admins.items).toHaveLength(1);
      expect(admins.items[0]?.role).toBe('ADMIN');

      const developers = await new UserRepository().search({ role: 'DEVELOPER' });
      expect(developers.items).toHaveLength(3);
    });

    it('combines q + role + role-only listings', async () => {
      const result = await new UserRepository().search({ q: 'dev1', role: 'ADMIN' });
      expect(result.items).toHaveLength(0);
    });

    it('excludes deactivated users unless includeDeleted', async () => {
      const target = users[3];
      if (!target) throw new Error('missing fixture');
      await target.softDelete();

      const visible = await new UserRepository().search({});
      expect(visible.items).toHaveLength(3);

      const withDeleted = await new UserRepository().search({ includeDeleted: true });
      expect(withDeleted.items).toHaveLength(4);
      expect(withDeleted.total).toBe(4);
    });

    it('paginates', async () => {
      const page = await new UserRepository().search({ page: 2, limit: 3 });
      expect(page.page).toBe(2);
      expect(page.limit).toBe(3);
      expect(page.items).toHaveLength(1);
      expect(page.pageCount).toBe(2);
    });
  });
});

describe('strictQuery throw (UserRepository)', () => {
  it('unknown filter keys throw instead of being stripped', async () => {
    await expect(new UserRepository().exists({ notARealField: 1 })).rejects.toThrowError(/not in schema/);
  });
});
