import { Router, type RequestHandler } from 'express';

import { createRecordAiRecommendationsHandler } from '../controllers/recommendation.controller.js';
import type { RecommendationService } from '../services/recommendations/recommendation.service.js';

export function createRecommendationInternalRouter(
  recommendationService: RecommendationService,
  requireInternalSecret: RequestHandler,
): Router {
  const router = Router();

  router.post(
    '/:analysisId/recommendations',
    requireInternalSecret,
    createRecordAiRecommendationsHandler(recommendationService),
  );

  return router;
}