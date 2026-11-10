import { Router, type RequestHandler } from 'express';

import { createLaunchAiAuditHandler } from '../controllers/ai-audit.controller.js';
import type { AiAuditService } from '../services/ai-audit/ai-audit.service.js';

export function createAiAuditRouter(
  aiAuditService: AiAuditService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post(
    '/:projectId/analyses/:analysisId/audit/ai',
    requireAuth,
    createLaunchAiAuditHandler(aiAuditService),
  );

  return router;
}
