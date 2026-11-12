
import type {
  RequestHandler,
} from 'express';

import {
  parseOrThrow,
} from '../shared/validation/request-validation.js';

import {
  planParamsSchema,
} from '../services/deployment-plans/deployment-plan.schema.js';

import type {
  CicdBuildStatusService,
} from '../services/cicd-monitor/cicd-build-status.service.js';

export function getCicdBuildStatusHandler(
  service: CicdBuildStatusService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, planId } = parseOrThrow(
        planParamsSchema,
        req.params,
        'Invalid CI/CD status parameters',
      );

      const result = await service.getStatus(
        res.locals.userId as string,
        projectId,
        planId,
      );

      res.json({
        message: 'CI/CD build status retrieved',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
export function requestCicdBuildHandler(
  service: CicdBuildStatusService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, planId } = parseOrThrow(
        planParamsSchema,
        req.params,
        'Invalid CI/CD build parameters',
      );

      const result = await service.requestBuild(
        res.locals.userId as string,
        projectId,
        planId,
      );

      res.status(202).json({
        message: 'Docker build requested',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}