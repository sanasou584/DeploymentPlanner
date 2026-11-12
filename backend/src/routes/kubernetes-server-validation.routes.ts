
import {
  Router,
  type RequestHandler,
} from 'express';

import type {
  KubernetesServerValidationService,
} from '../services/kubernetes-server-validation/kubernetes-server-validation.service.js';

import {
  validateKubernetesServerHandler,
} from '../controllers/kubernetes-server-validation.controller.js';

export function createKubernetesServerValidationRouter(
  service: KubernetesServerValidationService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post(
    '/:projectId/plans/:planId/manifests/validate-server',
    requireAuth,
    validateKubernetesServerHandler(service),
  );

  return router;
}
