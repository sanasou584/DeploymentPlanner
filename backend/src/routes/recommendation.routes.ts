import { Router, type RequestHandler } from 'express';

import {
  createAcceptRecommendationHandler,
  createListRecommendationsHandler,
  createRejectRecommendationHandler,
  createRunAuditHandler,
} from '../controllers/recommendation.controller.js';
import type { RecommendationService } from '../services/recommendations/recommendation.service.js';

export function createRecommendationRouter(
  recommendationService: RecommendationService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get(
    '/:projectId/analyses/:analysisId/recommendations',
    requireAuth,
    createListRecommendationsHandler(recommendationService),
  );
  router.post(
    '/:projectId/analyses/:analysisId/audit',
    requireAuth,
    createRunAuditHandler(recommendationService),
  );
  router.post(
    '/:projectId/analyses/:analysisId/recommendations/:recommendationId/accept',
    requireAuth,
    createAcceptRecommendationHandler(recommendationService),
  );
  router.post(
    '/:projectId/analyses/:analysisId/recommendations/:recommendationId/reject',
    requireAuth,
    createRejectRecommendationHandler(recommendationService),
  );

  return router;
}