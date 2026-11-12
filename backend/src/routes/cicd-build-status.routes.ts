
import {
  Router,
  type RequestHandler,
} from 'express';

import type {
  CicdBuildStatusService,
} from '../services/cicd-monitor/cicd-build-status.service.js';

import {
  getCicdBuildStatusHandler,
} from '../controllers/cicd-build-status.controller.js';

import {
  requestCicdBuildHandler,
} from '../controllers/cicd-build-status.controller.js';

export function createCicdBuildStatusRouter(
  service: CicdBuildStatusService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get(
    '/:projectId/plans/:planId/cicd/build-status',
    requireAuth,
    getCicdBuildStatusHandler(service),
  );
    router.post(
    '/:projectId/plans/:planId/cicd/build',
    requireAuth,
    requestCicdBuildHandler(service),
  );
  return router;
}
