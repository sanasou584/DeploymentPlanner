
import {
  Router,
  type RequestHandler,
} from 'express';

import type { KubernetesManifestService } from '../services/kubernetes-manifests/kubernetes-manifest.service.js';

import {
  generateKubernetesManifestsHandler,
  listKubernetesManifestsHandler,
} from '../controllers/kubernetes-manifest.controller.js';

export function createKubernetesManifestRouter(
  service: KubernetesManifestService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post(
    '/:projectId/plans/:planId/manifests',
    requireAuth,
    generateKubernetesManifestsHandler(service),
  );

  router.get(
    '/:projectId/plans/:planId/manifests',
    requireAuth,
    listKubernetesManifestsHandler(service),
  );

  return router;
}
