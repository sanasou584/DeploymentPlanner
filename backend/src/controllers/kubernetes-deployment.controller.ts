
import type {
  RequestHandler,
} from 'express';

import { z } from 'zod';

import {
  parseOrThrow,
} from '../shared/validation/request-validation.js';

import {
  manifestParamsSchema,
} from '../services/kubernetes-manifests/kubernetes-manifest.schema.js';

import type {
  KubernetesDeploymentService,
} from '../services/kubernetes-deployment/kubernetes-deployment.service.js';

const deploymentConfirmationSchema = z.strictObject({
  confirm: z.literal(true),
});

export function deployKubernetesManifestsHandler(
  service: KubernetesDeploymentService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, planId } = parseOrThrow(
        manifestParamsSchema,
        req.params,
        'Invalid Kubernetes deployment parameters',
      );

      parseOrThrow(
        deploymentConfirmationSchema,
        req.body,
        'Explicit deployment confirmation is required',
      );

      const result = await service.deploy(
        res.locals.userId as string,
        projectId,
        planId,
      );

      res.status(200).json({
        message: 'Kubernetes manifests applied successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
