
import {
  Router,
  type RequestHandler,
} from 'express';

import {
  requireRole,
} from '../middleware/require-role.js';

import type {
  UserApprovalService,
} from '../services/users/user-approval.service.js';

import {
  createListPendingController,
  createApproveUserController,
  createRejectUserController,
} from '../controllers/user-approval.controller.js';

export function createUserApprovalRouter(
  service: UserApprovalService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get(
    '/users/pending',
    requireAuth,
    requireRole('ADMIN'),
    createListPendingController(service),
  );

  router.post(
    '/users/:id/approve',
    requireAuth,
    requireRole('ADMIN'),
    createApproveUserController(service),
  );

  router.post(
    '/users/:id/reject',
    requireAuth,
    requireRole('ADMIN'),
    createRejectUserController(service),
  );

  return router;
}
