
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
  KubernetesServerValidationService,
} from '../services/kubernetes-server-validation/kubernetes-server-validation.service.js';

export function validateKubernetesServerHandler(
  service: KubernetesServerValidationService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, planId } = parseOrThrow(
        manifestParamsSchema,
        req.params,
        'Invalid Kubernetes server validation parameters',
      );

      const result = await service.validate(
        res.locals.userId as string,
        projectId,
        planId,
      );

      res.status(200).json({
        message: 'Kubernetes server validation completed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
