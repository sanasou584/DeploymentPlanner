
import {
  Router,
  type RequestHandler,
} from 'express';

import type {
  KubernetesValidationService,
} from '../services/kubernetes-validation/kubernetes-validation.service.js';

import {
  validateKubernetesManifestsHandler,
} from '../controllers/kubernetes-validation.controller.js';

export function createKubernetesValidationRouter(
  service: KubernetesValidationService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post(
    '/:projectId/plans/:planId/manifests/validate',
    requireAuth,
    validateKubernetesManifestsHandler(service),
  );

  return router;
}
