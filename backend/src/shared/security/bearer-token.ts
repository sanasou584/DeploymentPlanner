import { UnauthorizedError } from '../../domain/errors/index.js';

/**
 * The ONE Authorization-header parser for `Bearer <token>` — used by the
 * require-auth guard and by the logout controller (which must reach the raw
 * token to revoke it).
 */
export function extractBearerToken(
  authorization: string | undefined,
): string {
  if (!authorization) {
    throw new UnauthorizedError(
      'Bearer token required',
    );
  }

  const match = /^Bearer ([^\s]+)$/i.exec(authorization);

  if (!match?.[1]) {
    throw new UnauthorizedError(
      'Invalid Authorization header',
    );
  }

  return match[1];
}
