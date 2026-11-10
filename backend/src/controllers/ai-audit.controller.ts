import type { RequestHandler } from 'express';

import { parseOrThrow } from '../shared/validation/request-validation.js';
import {
  aiAuditLaunchParamsSchema,
  aiAuditWorkflowParamsSchema,
  failAiAuditBodySchema,
} from '../services/ai-audit/ai-audit.schema.js';
import type { AiAuditService } from '../services/ai-audit/ai-audit.service.js';

export function createLaunchAiAuditHandler(service: AiAuditService): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, analysisId } = parseOrThrow(
        aiAuditLaunchParamsSchema,
        req.params,
        'Invalid analysis id',
      );
      const result = await service.launch(res.locals.userId as string, projectId, analysisId);

      res.status(202).json({ message: 'AI audit requested', data: result });
    } catch (error) {
      next(error);
    }
  };
}

export function createAiAuditContextHandler(service: AiAuditService): RequestHandler {
  return async (req, res, next) => {
    try {
      const { analysisId } = parseOrThrow(
        aiAuditWorkflowParamsSchema,
        req.params,
        'Invalid analysis id',
      );
      const context = await service.getContext(analysisId);

      res.json({ message: 'AI audit context retrieved', data: context });
    } catch (error) {
      next(error);
    }
  };
}

export function createFailAiAuditHandler(service: AiAuditService): RequestHandler {
  return async (req, res, next) => {
    try {
      const { analysisId } = parseOrThrow(
        aiAuditWorkflowParamsSchema,
        req.params,
        'Invalid analysis id',
      );
      const body = parseOrThrow(failAiAuditBodySchema, req.body, 'Invalid error payload');
      const result = await service.fail(analysisId, body);

      res.json({ message: 'AI audit failure recorded', data: result });
    } catch (error) {
      next(error);
    }
  };
}
