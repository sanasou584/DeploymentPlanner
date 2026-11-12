
import {
  Router,
  type RequestHandler,
} from 'express';

import type {
  KubernetesDeploymentService,
} from '../services/kubernetes-deployment/kubernetes-deployment.service.js';

import {
  deployKubernetesManifestsHandler,
} from '../controllers/kubernetes-deployment.controller.js';

export function createKubernetesDeploymentRouter(
  service: KubernetesDeploymentService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post(
    '/:projectId/plans/:planId/deploy',
    requireAuth,
    deployKubernetesManifestsHandler(service),
  );

  return router;
}
