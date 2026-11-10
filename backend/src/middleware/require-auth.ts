
import type { RequestHandler } from 'express';
import { Types } from 'mongoose';

import {
  UnauthorizedError,
} from '../domain/errors/index.js';

// Contracts come from src/types: middleware must not import services
// (docs/conventions.md, "Dependency direction").
import type {
  SessionTokenService,
  UserService,
} from '../types/index.js';

import {
  extractBearerToken,
} from '../shared/security/bearer-token.js';

export function createRequireAuth(
  sessions: SessionTokenService,
  users: UserService,
): RequestHandler {
  return async (req, res, next) => {
    const token = extractBearerToken(
      req.headers.authorization,
    );

    let userId: string;

    try {
      userId = await sessions.verify(token);
    } catch {
      throw new UnauthorizedError(
        'Invalid or expired access token',
      );
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new UnauthorizedError(
        'Invalid token subject',
      );
    }

    // Important : recharger le compte à chaque requête.
    // Cela permet de rejeter les comptes désactivés
    // et de prendre en compte les changements de rôle.
    const user = await users.getAuthenticatedUser(userId);

    // The guard is the ONLY writer of the request principal:
    // - `res.locals.userId` — the id string, for controllers that need just it;
    // - `res.locals.authUser` — the full DTO (id, name, email, role).
    // Reading the principal from anywhere else (res.user, req.user...) is a
    // route-order/typing bug.
    res.locals.userId = user.id;
    res.locals.authUser = user;

    next();
  };
}
