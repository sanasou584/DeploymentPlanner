
import type {
  RequestHandler,
} from 'express';

import {
  parseOrThrow,
} from '../shared/validation/request-validation.js';

import {
  manifestParamsSchema,
} from '../services/kubernetes-manifests/kubernetes-manifest.schema.js';

import type {
  KubernetesMonitoringService,
} from '../services/kubernetes-monitoring/kubernetes-monitoring.service.js';

export function getKubernetesMonitoringHandler(
  service: KubernetesMonitoringService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, planId } = parseOrThrow(
        manifestParamsSchema,
        req.params,
        'Invalid Kubernetes monitoring parameters',
      );

      const data = await service.monitor(
        res.locals.userId as string,
        projectId,
        planId,
      );

      res.setHeader('Cache-Control', 'no-store');

      res.status(200).json({
        message: 'Kubernetes monitoring retrieved',
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}
