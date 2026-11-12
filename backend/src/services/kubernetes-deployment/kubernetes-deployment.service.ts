
import {
  ConflictError,
  NotFoundError,
} from '../../domain/errors/index.js';

import {
  contentHashOf,
} from '../../models/entities/index.js';

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

import type {
  KubectlDeploymentClient,
} from './kubectl-deployment.client.js';

export interface DeploymentResult {
  status: 'APPLIED';
  context: string;
  namespace: string;
  planVersion: number;
  appliedAt: string;
  output: string;
}

export function createKubernetesDeploymentService(
  kubectl: KubectlDeploymentClient,
  projects = new ProjectRepository(),
  plans = new PlanRepository(),
  files = new GeneratedFileRepository(),
) {
  async function deploy(
    userId: string,
    projectId: string,
    planId: string,
  ): Promise<DeploymentResult> {
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
        'Deployment requires an approved plan',
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

    if (
      expected.length === 0 ||
      stored.length !== expected.length
    ) {
      throw new ConflictError(
        'The generated manifest set is incomplete',
      );
    }

    for (const output of expected) {
      const matches = stored.filter(
        (file) =>
          file.kind === output.kind &&
          file.componentName === output.componentName,
      );

      if (matches.length !== 1) {
        throw new ConflictError(
          `Missing or duplicate manifest: ${output.path}`,
        );
      }

      const file = matches[0];

      if (
        !file ||
        file.validation.status !== 'VALID' ||
        file.planVersion !== plan.version ||
        file.path !== output.path ||
        file.content !== output.content ||
        file.contentHash !== contentHashOf(file.content)
      ) {
        throw new ConflictError(
          `Manifest is not valid for the approved plan: ${output.path}`,
        );
      }
    }

    const namespaceReady =
      await kubectl.namespaceExists();

    if (!namespaceReady) {
      throw new ConflictError(
        'The deployment namespace is unavailable',
      );
    }

    const manifestContent = expected
      .map((file) => file.content.trim())
      .join('\n---\n') + '\n';

    const validation = await kubectl.dryRun(
      manifestContent,
    );

    if (!validation.success) {
      throw new ConflictError(
        `Kubernetes server validation failed: ${validation.output}`,
      );
    }

    const applied = await kubectl.apply(
      manifestContent,
    );

    if (!applied.success) {
      throw new ConflictError(
        `Kubernetes apply failed: ${applied.output}`,
      );
    }

    return {
      status: 'APPLIED',
      context: 'minikube',
      namespace: 'deploymentplanner-dev',
      planVersion: plan.version,
      appliedAt: new Date().toISOString(),
      output: applied.output,
    };
  }

  return {
    deploy,
  };
}

export type KubernetesDeploymentService =
  ReturnType<typeof createKubernetesDeploymentService>;
