
import type { RequestHandler } from 'express';
import { z } from 'zod';

import {
  hexIdSchema,
  parseOrThrow,
} from '../shared/validation/request-validation.js';

import type { AiDeploymentPlanService } from '../services/ai-deployment-plan/ai-deployment-plan.service.js';

const paramsSchema = z.strictObject({
  projectId: hexIdSchema,
});

const bodySchema = z.strictObject({
  analysisId: hexIdSchema,
});

export function createGenerateAiPlanHandler(
  service: AiDeploymentPlanService,
): RequestHandler {
  return async (req, res) => {
    const { projectId } = parseOrThrow(
      paramsSchema,
      req.params,
      'Invalid project id',
    );

    const { analysisId } = parseOrThrow(
      bodySchema,
      req.body,
      'Invalid AI plan request',
    );

    const result = await service.generate(
      res.locals.userId as string,
      projectId,
      analysisId,
    );

    res.status(201).json({
      message: 'AI deployment plan generated',
      data: result.plan,
      assumptions: result.assumptions,
    });
  };
}
