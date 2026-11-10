import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';

import {
  GithubConnection,
  type GithubConnectionDocument,
} from '../../src/models/entities/github-connection.model.js';
import { User } from '../../src/models/entities/user.model.js';
import { InvariantViolationError } from '../../src/domain/errors/index.js';
import { encrypt } from '../../src/shared/crypto/token-crypto.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';
import { validatedErrorPaths } from '../helpers/schema-validation.js';

const KEY = new Uint8Array(32).map((_, i) => (i + 3) % 256);
const USER_ID = '64b1f6274190d8fe2ee1ba0a' as unknown as Types.ObjectId;
const OWNER_ID = USER_ID;

const connectValid = async (overrides: { login?: string; token?: string; userId?: Types.ObjectId } = {}) =>
  GithubConnection.connect(KEY, {
    userId: OWNER_ID,
    login: 'octocat',
    token: 'ghp_superSecretToken',
    scopes: ['repo'],
    ...overrides,
  });

const fetchFull = async (userId: Types.ObjectId): Promise<GithubConnectionDocument> =>
  (await GithubConnection.findOne({ user: userId }).select('+accessToken')) as GithubConnectionDocument;

beforeAll(async () => {
  await connectTestingModule('github_connections_test');
  await GithubConnection.init();
  await User.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await GithubConnection.deleteMany({}).setOptions({ withDeleted: true });
  await User.deleteMany({}).setOptions({ withDeleted: true });
});

describe('GithubConnection model', () => {
  describe('connect()', () => {
    it('stores an encrypted token, never the plain text', async () => {
      const conn = await connectValid();

      expect(conn.githubLogin).toBe('octocat');
      expect(conn.scopes).toEqual(['repo']);
      const payload = conn.get('accessToken') as { keyVersion: number; iv: string; cipherText: string };
      expect(payload.keyVersion).toBe(1);
      expect(payload.iv).toBeTruthy();
      expect(payload.cipherText).toBeTruthy();
      expect(JSON.stringify(conn.toJSON())).not.toContain('ghp_superSecretToken');
      expect(JSON.stringify(conn.toJSON())).not.toContain('accessToken');
    });

    it('round-trips decrypt via getAccessToken', async () => {
      const conn = await connectValid();
      const full = await fetchFull(conn.user as Types.ObjectId);

      expect(full.getAccessToken(KEY)).toBe('ghp_superSecretToken');
    });

    it('enforces one connection per user (unique user)', async () => {
      await connectValid();
      await expect(connectValid()).rejects.toThrowError(/duplicate key|E11000/);
    });
  });

  describe('field validation', () => {
    it('rejects a missing githubLogin', async () => {
      const conn = new GithubConnection({ user: USER_ID });
      const accessToken = encrypt(KEY, 'tok');
      conn.set('accessToken', accessToken);
      expect(await validatedErrorPaths(conn)).toContain('githubLogin');
    });

    it('rejects a partial encrypted payload', async () => {
      const conn = new GithubConnection({ user: USER_ID, githubLogin: 'octo' });
      conn.set('accessToken', { iv: 'only-iv' } as unknown as Record<string, never>);
      expect((await validatedErrorPaths(conn)).some((k) => k.startsWith('accessToken'))).toBe(true);
    });

    it('defaults scopes=[] and connectedAt=now', async () => {
      const conn = await GithubConnection.connect(KEY, {
        userId: OWNER_ID,
        login: 'octocat',
        token: 'tok-1',
      });

      expect(conn.scopes).toEqual([]);
      expect(conn.connectedAt).toBeInstanceOf(Date);
    });
  });

  describe('getAccessToken()', () => {
    it('throws an invariant when the ciphertext is not loaded', async () => {
      const conn = await connectValid();
      const withoutToken = (await GithubConnection.findOne({
        user: conn.user as Types.ObjectId,
      })) as GithubConnectionDocument;

      expect(() => (withoutToken as GithubConnectionDocument).getAccessToken(KEY)).toThrowError(
        InvariantViolationError,
      );
    });

    it('throws an invariant when revoked', async () => {
      const conn = await connectValid();
      const full = await fetchFull(conn.user as Types.ObjectId);
      const revoked = await full.revoke();

      expect(() => revoked.getAccessToken(KEY)).toThrowError(InvariantViolationError);
      expect(() => revoked.getAccessToken(KEY)).toThrowError(/revoked/);
    });

    it('fails with a wrong key (payload tampering semantics)', async () => {
      const conn = await connectValid();
      const full = await fetchFull(conn.user as Types.ObjectId);
      const wrongKey = new Uint8Array(32).map((_, i) => (i + 5) % 256);

      expect(() => (full as GithubConnectionDocument).getAccessToken(wrongKey)).toThrowError(
        /tampered or key mismatch/,
      );
    });
  });

  describe('rotateToken()', () => {
    it('re-encrypts and round-trips the new token', async () => {
      const conn = await connectValid();
      const full = await fetchFull(conn.user as Types.ObjectId);
      const rotated = await full.rotateToken(KEY, 'ghp_rotatedToken');

      expect(rotated.getAccessToken(KEY)).toBe('ghp_rotatedToken');
    });

    it('refuses on a revoked connection', async () => {
      const conn = await connectValid();
      const full = await fetchFull(conn.user as Types.ObjectId);
      const revoked = await full.revoke();

      await expect(revoked.rotateToken(KEY, 'newtok')).rejects.toThrowError(InvariantViolationError);
    });
  });

  describe('revoke()', () => {
    it('sets revokedAt, wipes the ciphertext and flips isActive', async () => {
      const conn = await connectValid();
      expect(conn.isActive).toBe(true);

      const full = await fetchFull(conn.user as Types.ObjectId);
      const revoked = await full.revoke();

      expect(revoked.isActive).toBe(false);
      expect(revoked.revokedAt).toBeInstanceOf(Date);
      const stored = (await GithubConnection.findOne({ user: revoked.user }).setOptions({
        withDeleted: true,
      })) as GithubConnectionDocument | null;
      expect(stored?.get('accessToken')).toBeUndefined();
      const serialized = JSON.stringify(stored?.toJSON());
      expect(serialized).not.toContain('cipherText');
      expect(serialized).not.toContain('authTag');
      expect(serialized).not.toContain('ghp_');
      // the stored record still exists and still carries the user's login
      expect(stored?.get('githubLogin')).toBe('octocat');
    });

    it('double revoke throws an invariant', async () => {
      const conn = await connectValid();
      const full = await fetchFull(conn.user as Types.ObjectId);
      const revoked = await full.revoke();

      await expect(revoked.revoke()).rejects.toThrowError(InvariantViolationError);
      await expect(revoked.revoke()).rejects.toThrowError(/already revoked/);
    });
  });
});
