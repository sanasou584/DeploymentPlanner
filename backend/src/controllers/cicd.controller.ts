
import type { RequestHandler } from 'express';

import {
  parseOrThrow,
} from '../shared/validation/request-validation.js';

import {
  planParamsSchema,
} from '../services/deployment-plans/deployment-plan.schema.js';

import type {
  CicdService,
} from '../services/cicd/cicd.service.js';

export function previewCicdHandler(
  service: CicdService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, planId } = parseOrThrow(
        planParamsSchema,
        req.params,
        'Invalid CI/CD preview parameters',
      );

      const result = await service.preview(
        res.locals.userId as string,
        projectId,
        planId,
      );

      res.json({
        message: 'CI/CD workflow generated',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export function createCicdPullRequestHandler(
  service: CicdService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, planId } = parseOrThrow(
        planParamsSchema,
        req.params,
        'Invalid CI/CD integration parameters',
      );

      const result = await service.createPullRequest(
        res.locals.userId as string,
        projectId,
        planId,
      );

      res.status(201).json({
        message: 'CI/CD pull request created',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
