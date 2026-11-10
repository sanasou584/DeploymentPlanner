
import { Router, type RequestHandler } from 'express';

import type {
  DeploymentPlanService,
} from '../services/deployment-plans/deployment-plan.service.js';

import {
  approvePlanHandler,
  createPlanHandler,
  getPlanHandler,
  listPlansHandler,
  rejectPlanHandler,
  updatePlanComponentHandler,
} from '../controllers/deployment-plan.controller.js';

export function createDeploymentPlanRouter(
  service: DeploymentPlanService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post(
    '/:projectId/plans',
    requireAuth,
    createPlanHandler(service),
  );

  router.get(
    '/:projectId/plans',
    requireAuth,
    listPlansHandler(service),
  );

  router.get(
    '/:projectId/plans/:planId',
    requireAuth,
    getPlanHandler(service),
  );

  router.patch(
    '/:projectId/plans/:planId/components/:name',
    requireAuth,
    updatePlanComponentHandler(service),
  );

  router.post(
    '/:projectId/plans/:planId/approve',
    requireAuth,
    approvePlanHandler(service),
  );

  router.post(
    '/:projectId/plans/:planId/reject',
    requireAuth,
    rejectPlanHandler(service),
  );

  return router;
}
