import type { RequestHandler } from 'express';

import { parseOrThrow } from '../shared/validation/request-validation.js';
import {
  analysisParamsSchema,
  completeAnalysisBodySchema,
  failAnalysisBodySchema,
  listAnalysesQuerySchema,
  projectAnalysesParamsSchema,
  workflowAnalysisParamsSchema,
} from '../services/analysis/analysis.schema.js';
import type { AnalysisService } from '../services/analysis/analysis.service.js';

export function createLaunchAnalysisHandler(service: AnalysisService): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId } = parseOrThrow(
        projectAnalysesParamsSchema,
        req.params,
        'Invalid project id',
      );
      const analysis = await service.launch(res.locals.userId as string, projectId);

      res.status(202).json({ message: 'Analysis requested', data: analysis });
    } catch (error) {
      next(error);
    }
  };
}

export function createListAnalysesHandler(service: AnalysisService): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId } = parseOrThrow(
        projectAnalysesParamsSchema,
        req.params,
        'Invalid project id',
      );
      const query = parseOrThrow(listAnalysesQuerySchema, req.query, 'Invalid query');
      const { items, pagination } = await service.list(
        res.locals.userId as string,
        projectId,
        query,
      );

      res.json({ message: 'Analyses retrieved', data: items, pagination });
    } catch (error) {
      next(error);
    }
  };
}

export function createGetAnalysisHandler(service: AnalysisService): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, analysisId } = parseOrThrow(
        analysisParamsSchema,
        req.params,
        'Invalid analysis id',
      );
      const analysis = await service.get(res.locals.userId as string, projectId, analysisId);

      res.json({ message: 'Analysis retrieved', data: analysis });
    } catch (error) {
      next(error);
    }
  };
}

export function createStartAnalysisHandler(service: AnalysisService): RequestHandler {
  return async (req, res, next) => {
    try {
      const { analysisId } = parseOrThrow(
        workflowAnalysisParamsSchema,
        req.params,
        'Invalid analysis id',
      );
      const analysis = await service.start(analysisId);

      res.json({ message: 'Analysis started', data: analysis });
    } catch (error) {
      next(error);
    }
  };
}

export function createCompleteAnalysisHandler(service: AnalysisService): RequestHandler {
  return async (req, res, next) => {
    try {
      const { analysisId } = parseOrThrow(
        workflowAnalysisParamsSchema,
        req.params,
        'Invalid analysis id',
      );
      const body = parseOrThrow(completeAnalysisBodySchema, req.body, 'Invalid analysis result');
      const analysis = await service.complete(analysisId, body);

      res.json({ message: 'Analysis completed', data: analysis });
    } catch (error) {
      next(error);
    }
  };
}

export function createFailAnalysisHandler(service: AnalysisService): RequestHandler {
  return async (req, res, next) => {
    try {
      const { analysisId } = parseOrThrow(
        workflowAnalysisParamsSchema,
        req.params,
        'Invalid analysis id',
      );
      const body = parseOrThrow(failAnalysisBodySchema, req.body, 'Invalid error payload');
      const analysis = await service.fail(analysisId, body);

      res.json({ message: 'Analysis failed', data: analysis });
    } catch (error) {
      next(error);
    }
  };
}