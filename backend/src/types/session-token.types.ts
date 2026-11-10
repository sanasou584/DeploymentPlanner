import type { createSessionTokenService } from '../services/auth/session-token.service.js';

/**
 * Session token contract - derived from its factory at ONE source, exposed
 * here because it is consumed by the auth-guard MIDDLEWARE too (middleware
 * must not import services directly, docs/conventions.md "Dependency
 * direction").
 */
export type SessionTokenService =
  ReturnType<typeof createSessionTokenService>;
