import { randomUUID } from 'node:crypto';

import { SignJWT, jwtVerify } from 'jose';

import { UnauthorizedError } from '../../domain/errors/index.js';

import {
  SessionRevocationRepository,
} from '../../repositories/session-revocation.repository.js';

/**
 * Functional service factory (docs/conventions.md, "Services"). The secret is
 * injected by the composition root (routes/index.ts), never read from config.
 * The revocation store is injectable so tests can pass a fake; the default
 * self-wires the real repository.
 */
export function createSessionTokenService(
  secret: string,
  revocations: SessionRevocationRepository = new SessionRevocationRepository(),
) {
  const key = new TextEncoder().encode(secret);

  if (key.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 bytes');
  }

  async function parse(
    token: string,
    failMessage: string,
  ): Promise<{ payload: Record<string, unknown>; sub: string }> {
    try {
      const { payload } = await jwtVerify(token, key, {
        issuer: 'deploymentplanner-ai',
        audience: 'deploymentplanner-web',
        algorithms: ['HS256'],
      });

      if (typeof payload.sub !== 'string') {
        throw new Error('Invalid session');
      }

      return { payload, sub: payload.sub };
    } catch {
      throw new UnauthorizedError(failMessage);
    }
  }

  async function create(userId: string): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuer('deploymentplanner-ai')
      .setAudience('deploymentplanner-web')
      .setIssuedAt()
      .setExpirationTime('1h')
      // Logout needs a stable identity to deny-list (logout revocation).
      .setJti(randomUUID())
      .sign(key);
  }

  async function verify(token: string): Promise<string> {
    const { payload, sub } = await parse(token, 'Invalid session');

    // Tokens issued before the jti claim existed (or hand-crafted ones)
    // have no identity to look up: their check degrades to signature +
    // expiry validation only.
    const jti = payload.jti;

    if (
      typeof jti === 'string' &&
      (await revocations.isRevoked(jti))
    ) {
      throw new UnauthorizedError('Session was revoked');
    }

    return sub;
  }

  /** Deny-lists the presented session immediately (idempotent). */
  async function revoke(token: string): Promise<void> {
    const { payload } = await parse(
      token,
      'Invalid or expired session token',
    );

    const jti = payload.jti;

    if (typeof jti !== 'string') {
      throw new UnauthorizedError('Session token cannot be revoked');
    }

    const exponent =
      typeof payload.exp === 'number' ? payload.exp : 0;

    await revocations.ensureRevoked(jti, new Date(exponent * 1000));
  }

  return { create, verify, revoke };
}
