
import {
  ConflictError,
  NotFoundError,
} from '../../domain/errors/index.js';

import {
  ProjectRepository,
} from '../../repositories/project.repository.js';

import {
  PlanRepository,
} from '../../repositories/plan.repository.js';

import {
  GeneratedFileRepository,
} from '../../repositories/generated-file.repository.js';

import {
  buildKubernetesManifests,
} from '../kubernetes-manifests/kubernetes-manifest.builder.js';

import {
  assertManifestsReadyForServerValidation,
} from './kubernetes-server-validation.rules.js';

import type {
  KubectlValidationClient,
} from './kubectl-validation.client.js';

export function createKubernetesServerValidationService(
  kubectl: KubectlValidationClient,
  projects = new ProjectRepository(),
  plans = new PlanRepository(),
  files = new GeneratedFileRepository(),
) {
  async function validate(
    userId: string,
    projectId: string,
    planId: string,
  ) {
    const project = await projects.findByIdForOwner(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundError(
        'Project not found',
      );
    }

    const plan = await plans.findOne({
      _id: planId,
      project: projectId,
    });

    if (!plan) {
      throw new NotFoundError(
        'Deployment plan not found',
      );
    }

    if (plan.status !== 'APPROVED') {
      throw new ConflictError(
        'Only approved deployment plans can be validated by Kubernetes',
      );
    }

    const expected = buildKubernetesManifests(
      plan.components,
    );

    const stored = (
      await files.listByPlan(planId)
    ).filter(
      (file) => file.kind.startsWith('K8S_'),
    );

    assertManifestsReadyForServerValidation(
      stored,
      expected,
      plan.version,
    );

    const availability = await kubectl.check();

    if (!availability.ready) {
      return {
        status: 'UNAVAILABLE' as const,
        cluster: 'minikube',
        namespace: 'default',
        details: availability.details,
        validatedAt: new Date().toISOString(),
        results: [],
      };
    }

    const results = [];

    for (const output of expected) {
      const result = await kubectl.validate(
        output.content,
      );

      results.push({
        path: output.path,
        kind: output.kind,
        status: result.valid
          ? ('VALID' as const)
          : ('INVALID' as const),
        details: result.details,
      });
    }

    const invalid = results.some(
      (result) => result.status === 'INVALID',
    );

    return {
      status: invalid
        ? ('INVALID' as const)
        : ('VALID' as const),
      cluster: 'minikube',
      namespace: 'default',
      details: invalid
        ? 'One or more manifests failed Kubernetes server validation'
        : 'All manifests passed Kubernetes server validation',
      validatedAt: new Date().toISOString(),
      results,
    };
  }

  return {
    validate,
  };
}

export type KubernetesServerValidationService =
  ReturnType<typeof createKubernetesServerValidationService>;
