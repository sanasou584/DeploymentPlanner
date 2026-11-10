import { Router, type RequestHandler } from 'express';

import {
  createAiAuditContextHandler,
  createFailAiAuditHandler,
} from '../controllers/ai-audit.controller.js';
import type { AiAuditService } from '../services/ai-audit/ai-audit.service.js';

export function createAiAuditInternalRouter(
  aiAuditService: AiAuditService,
  requireInternalSecret: RequestHandler,
): Router {
  const router = Router();

  router.get(
    '/:analysisId/context',
    requireInternalSecret,
    createAiAuditContextHandler(aiAuditService),
  );
  router.post(
    '/:analysisId/audit-fail',
    requireInternalSecret,
    createFailAiAuditHandler(aiAuditService),
  );

  return router;
}
