import { Router, type RequestHandler } from 'express';

import {
  createGetAnalysisHandler,
  createLaunchAnalysisHandler,
  createListAnalysesHandler,
} from '../controllers/analysis.controller.js';
import type { AnalysisService } from '../services/analysis/analysis.service.js';

export function createAnalysisRouter(
  analysisService: AnalysisService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post('/:projectId/analyses', requireAuth, createLaunchAnalysisHandler(analysisService));
  router.get('/:projectId/analyses', requireAuth, createListAnalysesHandler(analysisService));
  router.get(
    '/:projectId/analyses/:analysisId',
    requireAuth,
    createGetAnalysisHandler(analysisService),
  );

  return router;
}