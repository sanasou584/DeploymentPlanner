import { Router, type RequestHandler } from 'express';

import type { ProfileService } from '../services/profile/profile.service.js';

import {
  createGetProfileController,
  createUpdateProfileController,
  createChangePasswordController,
} from '../controllers/profile.controller.js';

/**
 * HTTP wiring ONLY: relative paths so this router mounts under /profile.
 * The user profile is self-scoped: the actor id comes from the verified
 * token (requireAuth), never from a path parameter.
 */
export function createProfileRouter(
  profileService: ProfileService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get('/', requireAuth, createGetProfileController(profileService));

  router.patch('/', requireAuth, createUpdateProfileController(profileService));

  router.post('/password', requireAuth, createChangePasswordController(profileService));

  return router;
}
