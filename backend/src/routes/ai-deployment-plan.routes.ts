
import {
  Router,
  type RequestHandler,
} from 'express';

import {
  createGenerateAiPlanHandler,
} from '../controllers/ai-deployment-plan.controller.js';

import type {
  AiDeploymentPlanService,
} from '../services/ai-deployment-plan/ai-deployment-plan.service.js';

export function createAiDeploymentPlanRouter(
  service: AiDeploymentPlanService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post(
    '/:projectId/plans/generate-ai',
    requireAuth,
    createGenerateAiPlanHandler(service),
  );

  return router;
}
