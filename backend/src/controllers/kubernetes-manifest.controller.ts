
import type { RequestHandler } from 'express';

import { parseOrThrow } from '../shared/validation/request-validation.js';

import { manifestParamsSchema } from '../services/kubernetes-manifests/kubernetes-manifest.schema.js';

import type { KubernetesManifestService } from '../services/kubernetes-manifests/kubernetes-manifest.service.js';

export function generateKubernetesManifestsHandler(
  service: KubernetesManifestService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, planId } = parseOrThrow(
        manifestParamsSchema,
        req.params,
        'Invalid Kubernetes manifest parameters',
      );

      const files = await service.generate(
        res.locals.userId as string,
        projectId,
        planId,
      );

      res.status(201).json({
        message: 'Kubernetes manifests generated successfully',
        data: files,
      });
    } catch (error) {
      next(error);
    }
  };
}

export function listKubernetesManifestsHandler(
  service: KubernetesManifestService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, planId } = parseOrThrow(
        manifestParamsSchema,
        req.params,
        'Invalid Kubernetes manifest parameters',
      );

      const files = await service.list(
        res.locals.userId as string,
        projectId,
        planId,
      );

      res.status(200).json({
        message: 'Kubernetes manifests retrieved successfully',
        data: files,
      });
    } catch (error) {
      next(error);
    }
  };
}
