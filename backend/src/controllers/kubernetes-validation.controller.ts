
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
  KubernetesValidationService,
} from '../services/kubernetes-validation/kubernetes-validation.service.js';

export function validateKubernetesManifestsHandler(
  service: KubernetesValidationService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, planId } = parseOrThrow(
        manifestParamsSchema,
        req.params,
        'Invalid Kubernetes validation parameters',
      );

      const files = await service.validate(
        res.locals.userId as string,
        projectId,
        planId,
      );

      res.status(200).json({
        message: 'Kubernetes manifest validation completed',
        data: files,
      });
    } catch (error) {
      next(error);
    }
  };
}
