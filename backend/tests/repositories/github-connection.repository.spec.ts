import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';

import { GithubConnection, User } from '../../src/models/entities/index.js';
import { GithubConnectionRepository } from '../../src/repositories/index.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';

const TOKEN_KEY = new Uint8Array(32).map((_, index) => (index + 3) % 256);
const FOREIGN_USER_ID = '64b1f6274190d8fe2ee1ba32' as unknown as Types.ObjectId;

beforeAll(async () => {
  await connectTestingModule('github_conn_repo_test');
  await User.init();
  await GithubConnection.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await GithubConnection.deleteMany({}).setOptions({ withDeleted: true });
  await User.deleteMany({}).setOptions({ withDeleted: true });
});

describe('GithubConnectionRepository', () => {
  it('findByUser returns null when no connection exists', async () => {
    expect(await new GithubConnectionRepository().findByUser(FOREIGN_USER_ID)).toBeNull();
  });

  it('returns the connection bound to the user', async () => {
    const user = await User.register({ name: 'dev', email: 'dev@example.com', password: 'LongEnough1!' });
    await GithubConnection.connect(TOKEN_KEY, {
      userId: user._id,
      login: 'octocat',
      token: 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
      scopes: ['repo'],
    });

    const found = await new GithubConnectionRepository().findByUser(user._id);
    expect(found?.githubLogin).toBe('octocat');
    expect(String(found?.user)).toBe(String(user._id));
    expect(found?.isActive).toBe(true);

    expect(await new GithubConnectionRepository().findByUser('64b1f6274190d8fe2ee1ba33')).toBeNull();
  });

  it('still finds a revoked connection (history) via explicit withDeleted=undefined default behaviour', async () => {
    const user = await User.register({ name: 'dev2', email: 'dev2@example.com', password: 'LongEnough1!' });
    const connection = await GithubConnection.connect(TOKEN_KEY, {
      userId: user._id,
      login: 'octocat',
      token: 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
    });
    await connection.revoke();

    const found = await new GithubConnectionRepository().findByUser(user._id);
    expect(found?.isActive).toBe(false);
  });
});

describe('strictQuery throw (GithubConnectionRepository)', () => {
  it('unknown filter keys throw instead of being stripped', async () => {
    await expect(new GithubConnectionRepository().exists({ notARealField: 1 })).rejects.toThrowError(/not in schema/);
  });
});
