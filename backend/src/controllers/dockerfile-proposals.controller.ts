
import type { RequestHandler } from 'express';

import {
  parseOrThrow,
} from '../shared/validation/request-validation.js';

import type {
  DockerfileProposalService,
} from '../services/dockerfile-proposals/dockerfile-proposals.service.js';

import {
  dockerfileParamsSchema,
  generateDockerfilesBodySchema,
} from '../services/dockerfile-proposals/dockerfile-proposals.schema.js';

export function inspectDockerfileProposalsHandler(
  service: DockerfileProposalService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, analysisId } = parseOrThrow(
        dockerfileParamsSchema,
        req.params,
        'Invalid Dockerfile proposal parameters',
      );

      const result = await service.inspect(
        res.locals.userId as string,
        projectId,
        analysisId,
      );

      res.json({
        message: 'Dockerfile proposals inspected',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export function generateDockerfileProposalsHandler(
  service: DockerfileProposalService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, analysisId } = parseOrThrow(
        dockerfileParamsSchema,
        req.params,
        'Invalid Dockerfile proposal parameters',
      );

      const body = parseOrThrow(
        generateDockerfilesBodySchema,
        req.body,
        'Invalid Dockerfile generation request',
      );

      const result = await service.generate(
        res.locals.userId as string,
        projectId,
        analysisId,
        body,
      );

      res.status(201).json({
        message: 'Dockerfile proposals generated',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
