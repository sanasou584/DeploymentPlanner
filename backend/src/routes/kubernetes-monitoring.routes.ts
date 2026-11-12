
import {
  Router,
  type RequestHandler,
} from 'express';

import type {
  KubernetesMonitoringService,
} from '../services/kubernetes-monitoring/kubernetes-monitoring.service.js';

import {
  getKubernetesMonitoringHandler,
} from '../controllers/kubernetes-monitoring.controller.js';

export function createKubernetesMonitoringRouter(
  service: KubernetesMonitoringService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get(
    '/:projectId/plans/:planId/kubernetes/status',
    requireAuth,
    getKubernetesMonitoringHandler(service),
  );

  return router;
}
