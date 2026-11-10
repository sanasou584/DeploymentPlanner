import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { User, type UserDocument } from '../../src/models/entities/index.js';
import type { UserFields, UserMethods, UserVirtuals } from '../../src/models/entities/index.js';
import { InvariantViolationError } from '../../src/domain/errors/index.js';
import {
  BaseRepository,
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  normalizedLimit,
  normalizedPage,
} from '../../src/repositories/index.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';

type UserRepo = BaseRepository<UserFields, UserMethods, UserVirtuals>;

let users: UserDocument[] = [];

beforeAll(async () => {
  await connectTestingModule('base_repo_test');
  await User.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await User.deleteMany({}).setOptions({ withDeleted: true });
  users = [];
  for (let i = 0; i < 7; i += 1) {
    users.push(
      await User.register({ name: `user ${i}`, email: `user${i}@example.com`, password: 'LongEnough1!' }),
    );
  }
});

function repo(): UserRepo {
  return new BaseRepository<UserFields, UserMethods, UserVirtuals>(User);
}

describe('BaseRepository (via User)', () => {
  describe('normalization helpers', () => {
    it('normalizedPage/normalizedLimit defaults and guards', () => {
      expect(normalizedPage(undefined)).toBe(DEFAULT_PAGE);
      expect(normalizedLimit(undefined)).toBe(DEFAULT_LIMIT);
      expect(() => normalizedPage(0)).toThrowError(InvariantViolationError);
      expect(() => normalizedPage(2.5)).toThrowError(InvariantViolationError);
      expect(() => normalizedLimit(0)).toThrowError(InvariantViolationError);
    });
  });

  describe('create/save', () => {
    it('create materializes a document; save() persists changes', async () => {
      const created = await repo().create({
        name: 'new user',
        email: 'newuser@example.com',
        passwordHash: 'hash',
        role: 'DEVELOPER',
      });

      created.name = 'renamed';
      await repo().save(created);
      const reloaded = await repo().findOne({ email: 'newuser@example.com' });
      expect(reloaded?.name).toBe('renamed');
    });
  });

  describe('queries + withDeleted', () => {
    it('findOne/find/count/exists exclude soft-deleted docs by default', async () => {
      const target = users[1];
      if (!target) throw new Error('missing fixture');
      await target.softDelete();

      expect(await repo().exists({ email: 'user1@example.com' })).toBe(false);
      expect(await repo().exists({ email: 'user1@example.com' }, { withDeleted: true })).toBe(true);
      expect(await repo().count({})).toBe(6);
      expect(await repo().count({}, { withDeleted: true })).toBe(7);
      expect((await repo().find({})).length).toBe(6);
      expect((await repo().find({}, { withDeleted: true })).length).toBe(7);
      expect((await repo().findOne({ email: 'user1@example.com' }, { withDeleted: true }))?.email).toBe(
        'user1@example.com',
      );
    });

    it('findById excludes soft-deleted docs unless withDeleted', async () => {
      const target = users[2];
      if (!target) throw new Error('missing fixture');
      await target.softDelete();

      expect(await repo().findById(target._id)).toBeNull();
      expect((await repo().findById(target._id, { withDeleted: true }))?.name).toBe('user 2');
    });
  });

  describe('paginate', () => {
    it('defaults page=1 limit=20, newest first, with paging math', async () => {
      const first = await repo().paginate({}, {});
      expect(first.total).toBe(7);
      expect(first.page).toBe(DEFAULT_PAGE);
      expect(first.limit).toBe(DEFAULT_LIMIT);
      expect(first.items).toHaveLength(7);
      expect(first.pageCount).toBe(1);
      expect(String(first.items[0]?.email)).toBe('user6@example.com');

      const middle = await repo().paginate({}, { page: 2, limit: 3 });
      expect(middle.items).toHaveLength(3);
      expect(middle.pageCount).toBe(3);
      expect(middle.items.map((item) => item.email)).toEqual([
        'user3@example.com',
        'user2@example.com',
        'user1@example.com',
      ]);

      const last = await repo().paginate({}, { page: 3, limit: 3 });
      expect(last.items.map((item) => item.email)).toEqual(['user0@example.com']);
    });

    it('supports caller-provided sort order', async () => {
      const page = await repo().paginate({}, { sort: { email: 1 }, limit: 2 });
      expect(page.items.map((item) => item.email)).toEqual(['user0@example.com', 'user1@example.com']);
    });
  });
});


describe('strictQuery throw (base methods)', () => {
  it('unknown filter keys throw instead of being stripped', async () => {
    await expect(repo().findOne({ notARealField: 'x' })).rejects.toThrowError(/not in schema/);
    await expect(repo().find({ notARealField: 1 })).rejects.toThrowError(/not in schema/);
    await expect(repo().exists({ notARealField: 'x' })).rejects.toThrowError(/not in schema/);
    await expect(repo().count({ notARealField: 'x' })).rejects.toThrowError(/not in schema/);
    await expect(
      repo().paginate({ notARealField: 'x' }, { page: 1, limit: 5 }),
    ).rejects.toThrowError(/not in schema/);
  });
});
