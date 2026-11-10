import { describe, expect, it } from 'vitest';

import { createSessionTokenService } from '../../src/services/auth/session-token.service.js';
import { SessionRevocationRepository } from '../../src/repositories/session-revocation.repository.js';
import { UnauthorizedError } from '../../src/domain/errors/index.js';
import type { SessionRevocationDocument } from '../../src/models/entities/index.js';

/**
 * In-memory stand-in for the deny-list store, overriding the repository's
 * methods only — the same narrow fake every unit test of the service uses.
 */
class InMemoryRevocations extends SessionRevocationRepository {
  private rows = new Map<string, Date>();

  override async ensureRevoked(
    jti: string,
    expiresAt: Date,
  ): Promise<SessionRevocationDocument> {
    this.rows.set(jti, expiresAt);
    return { jti, expiresAt } as SessionRevocationDocument;
  }

  override async isRevoked(jti: string): Promise<boolean> {
    return this.rows.has(jti);
  }
}

describe('session token service (revocation)', () => {
  it('issues a verifiable token that revocation denies afterwards', async () => {
    const sessions = createSessionTokenService(
      'a'.repeat(40),
      new InMemoryRevocations(),
    );

    const token = await sessions.create('user-1');
    expect(token.split('.').length).toBe(3);
    expect(await sessions.verify(token)).toBe('user-1');

    await sessions.revoke(token);

    await expect(sessions.verify(token)).rejects.toThrowError(
      UnauthorizedError,
    );
  });

  it('rejects garbage and foreign tokens when revoking', async () => {
    const sessions = createSessionTokenService(
      'a'.repeat(40),
      new InMemoryRevocations(),
    );

    await expect(sessions.revoke('not-a-jwt')).rejects.toThrowError(
      UnauthorizedError,
    );

    const foreign = createSessionTokenService('b'.repeat(40));
    const foreignToken = await foreign.create('intruder');

    await expect(
      sessions.revoke(foreignToken),
    ).rejects.toThrowError(UnauthorizedError);
  });

  it('stays idempotent when the same session logs out twice', async () => {
    const sessions = createSessionTokenService(
      'a'.repeat(40),
      new InMemoryRevocations(),
    );

    const token = await sessions.create('user-1');

    await sessions.revoke(token);
    await sessions.revoke(token);

    await expect(sessions.verify(token)).rejects.toThrowError(
      UnauthorizedError,
    );
  });
});
