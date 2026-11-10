
import {
  Router,
  type RequestHandler,
} from 'express';

import {
  generateDockerfileProposalsHandler,
  inspectDockerfileProposalsHandler,
} from '../controllers/dockerfile-proposals.controller.js';

import type {
  DockerfileProposalService,
} from '../services/dockerfile-proposals/dockerfile-proposals.service.js';

export function createDockerfileProposalsRouter(
  service: DockerfileProposalService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get(
    '/:projectId/analyses/:analysisId/dockerfiles',
    requireAuth,
    inspectDockerfileProposalsHandler(service),
  );

  router.post(
    '/:projectId/analyses/:analysisId/dockerfiles',
    requireAuth,
    generateDockerfileProposalsHandler(service),
  );

  return router;
}
