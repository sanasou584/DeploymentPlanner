import { Router, type RequestHandler } from 'express';

import {
  createCompleteAnalysisHandler,
  createFailAnalysisHandler,
  createStartAnalysisHandler,
} from '../controllers/analysis.controller.js';
import type { AnalysisService } from '../services/analysis/analysis.service.js';

export function createAnalysisInternalRouter(
  analysisService: AnalysisService,
  requireInternalSecret: RequestHandler,
): Router {
  const router = Router();

  router.post(
    '/:analysisId/start',
    requireInternalSecret,
    createStartAnalysisHandler(analysisService),
  );
  router.post(
    '/:analysisId/complete',
    requireInternalSecret,
    createCompleteAnalysisHandler(analysisService),
  );
  router.post(
    '/:analysisId/fail',
    requireInternalSecret,
    createFailAnalysisHandler(analysisService),
  );

  return router;
}