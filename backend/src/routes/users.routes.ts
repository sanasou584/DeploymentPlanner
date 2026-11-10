
import { Router, type RequestHandler } from 'express';

import type { UserService } from '../types/index.js';

import { requireRole } from '../middleware/require-role.js';

import {
  createListUsersController,
  createGetUserController,
  createUpdateUserController,
  createChangeRoleController,
  createDeactivateUserController,
  createReactivateUserController,
} from '../controllers/user.controller.js';

/**
 * User management routes.
 *
 * Responsibilities:
 * - Declare HTTP endpoints.
 * - Apply authentication and authorization.
 * - Inject the user service into controllers.
 *
 * No database queries or business logic.
 */
export function createUsersRouter(
  userService: UserService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get(
    '/users',
    requireAuth,
    requireRole('ADMIN'),
    createListUsersController(userService),
  );

  router.get(
    '/users/:id',
    requireAuth,
    requireRole('ADMIN'),
    createGetUserController(userService),
  );

  router.patch(
    '/users/:id',
    requireAuth,
    requireRole('ADMIN'),
    createUpdateUserController(userService),
  );

  router.patch(
    '/users/:id/role',
    requireAuth,
    requireRole('ADMIN'),
    createChangeRoleController(userService),
  );

  router.post(
    '/users/:id/deactivate',
    requireAuth,
    requireRole('ADMIN'),
    createDeactivateUserController(userService),
  );

  router.post(
    '/users/:id/reactivate',
    requireAuth,
    requireRole('ADMIN'),
    createReactivateUserController(userService),
  );

  return router;
}
