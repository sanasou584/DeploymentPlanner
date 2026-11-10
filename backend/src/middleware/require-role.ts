
import type { RequestHandler } from 'express';

import {
  ForbiddenError,
  UnauthorizedError,
} from '../domain/errors/index.js';

import type { AuthUser } from '../types/index.js';
import type { UserRole } from '../domain/enums/user.enums.js';

export function requireRole(
  role: UserRole,
): RequestHandler {
  return (_req, res, next) => {
    const user = res.locals.authUser as
      | AuthUser
      | undefined;

    if (!user) {
      throw new UnauthorizedError(
        'Authentication required',
      );
    }

    if (user.role !== role) {
      throw new ForbiddenError(
        'Insufficient permissions',
      );
    }

    next();
  };
}
