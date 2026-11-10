import type { RequestHandler } from 'express';

import { connectRepositorySchema } from '../services/repository-link/repository-link.schema.js';
import type { RepositoryLinkService } from '../services/repository-link/repository-link.service.js';
import { hexIdSchema, parseOrThrow } from '../shared/validation/request-validation.js';

export function createConnectRepositoryController(
  repositoryLink: RepositoryLinkService,
): RequestHandler {
  return async (req, res) => {
    const projectId = parseOrThrow(hexIdSchema, req.params.id, 'Invalid project id');
    const input = parseOrThrow(
      connectRepositorySchema,
      req.body,
      'Invalid repository data',
    );
    const project = await repositoryLink.connect(
      res.locals.userId,
      projectId,
      input,
    );

    res.status(200).json({
      message: 'Repository connected',
      data: project,
    });
  };
}

export function createVerifyRepositoryController(
  repositoryLink: RepositoryLinkService,
): RequestHandler {
  return async (req, res) => {
    const projectId = parseOrThrow(hexIdSchema, req.params.id, 'Invalid project id');
    const project = await repositoryLink.verify(res.locals.userId, projectId);

    res.status(200).json({
      message: 'Repository verification completed',
      data: project,
    });
  };
}