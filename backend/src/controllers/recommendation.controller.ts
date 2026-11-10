import type { RequestHandler } from 'express';

import { parseOrThrow } from '../shared/validation/request-validation.js';
import {
  aiRecommendationsBodySchema,
  analysisRecommendationsParamsSchema,
  recommendationParamsSchema,
  recommendationWorkflowParamsSchema,
  rejectRecommendationBodySchema,
} from '../services/recommendations/recommendation.schema.js';
import type { RecommendationService } from '../services/recommendations/recommendation.service.js';

export function createListRecommendationsHandler(service: RecommendationService): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, analysisId } = parseOrThrow(
        analysisRecommendationsParamsSchema,
        req.params,
        'Invalid analysis id',
      );
      const items = await service.list(res.locals.userId as string, projectId, analysisId);

      res.json({ message: 'Recommendations retrieved', data: items });
    } catch (error) {
      next(error);
    }
  };
}

export function createRunAuditHandler(service: RecommendationService): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, analysisId } = parseOrThrow(
        analysisRecommendationsParamsSchema,
        req.params,
        'Invalid analysis id',
      );
      const { created, items } = await service.runAudit(
        res.locals.userId as string,
        projectId,
        analysisId,
      );

      res.json({ message: 'Audit completed', data: { created, recommendations: items } });
    } catch (error) {
      next(error);
    }
  };
}

export function createAcceptRecommendationHandler(service: RecommendationService): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, analysisId, recommendationId } = parseOrThrow(
        recommendationParamsSchema,
        req.params,
        'Invalid recommendation id',
      );
      const recommendation = await service.accept(
        res.locals.userId as string,
        projectId,
        analysisId,
        recommendationId,
      );

      res.json({ message: 'Recommendation accepted', data: recommendation });
    } catch (error) {
      next(error);
    }
  };
}

export function createRejectRecommendationHandler(service: RecommendationService): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, analysisId, recommendationId } = parseOrThrow(
        recommendationParamsSchema,
        req.params,
        'Invalid recommendation id',
      );
      const body = parseOrThrow(
        rejectRecommendationBodySchema,
        req.body ?? {},
        'Invalid rejection payload',
      );
      const recommendation = await service.reject(
        res.locals.userId as string,
        projectId,
        analysisId,
        recommendationId,
        body.note,
      );

      res.json({ message: 'Recommendation rejected', data: recommendation });
    } catch (error) {
      next(error);
    }
  };
}

export function createRecordAiRecommendationsHandler(
  service: RecommendationService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { analysisId } = parseOrThrow(
        recommendationWorkflowParamsSchema,
        req.params,
        'Invalid analysis id',
      );
      const body = parseOrThrow(
        aiRecommendationsBodySchema,
        req.body,
        'Invalid recommendations payload',
      );
      const result = await service.recordAiRecommendations(analysisId, body);

      res.json({ message: 'Recommendations recorded', data: result });
    } catch (error) {
      next(error);
    }
  };
}