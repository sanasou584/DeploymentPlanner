
import { Router } from 'express';
import type { RequestHandler } from 'express';

import type { AuthService } from '../services/auth/auth.service.js';
import type {
  SessionTokenService,
} from '../types/index.js';

import {
  createRegisterController,
  createLoginController,
  createLogoutController,
} from '../controllers/auth.controller.js';

export function createAuthRouter(
  authService: AuthService,
  sessions: SessionTokenService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post(
    '/register',
    createRegisterController(authService),
  );

  router.post(
    '/login',
    createLoginController(authService, sessions),
  );

  // Route-line enforcement (src/routes/README.md): a valid Bearer token is
  // required before the controller can deny-list it.
  router.post(
    '/logout',
    requireAuth,
    createLogoutController(sessions),
  );

  return router;
}
