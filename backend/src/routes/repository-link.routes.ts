import { Router } from 'express';
import type { RequestHandler } from 'express';

import {
  createConnectRepositoryController,
  createVerifyRepositoryController,
} from '../controllers/repository-link.controller.js';
import type { RepositoryLinkService } from '../services/repository-link/repository-link.service.js';

export function createRepositoryLinkRouter(
  repositoryLink: RepositoryLinkService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.put(
    '/:id/repository',
    requireAuth,
    createConnectRepositoryController(repositoryLink),
  );

  router.post(
    '/:id/repository/verify',
    requireAuth,
    createVerifyRepositoryController(repositoryLink),
  );

  return router;
}