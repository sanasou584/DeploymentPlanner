
import {
  Router,
  type RequestHandler,
} from 'express';

import type {
  CicdService,
} from '../services/cicd/cicd.service.js';

import {
  previewCicdHandler,
  createCicdPullRequestHandler,
} from '../controllers/cicd.controller.js';

export function createCicdRouter(
  service: CicdService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get(
    '/:projectId/plans/:planId/cicd/preview',
    requireAuth,
    previewCicdHandler(service),
  );

  router.post(
    '/:projectId/plans/:planId/cicd/pull-request',
    requireAuth,
    createCicdPullRequestHandler(service),
  );

  return router;
}
