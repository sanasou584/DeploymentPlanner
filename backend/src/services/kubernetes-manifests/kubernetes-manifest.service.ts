
import {
  ConflictError,
  NotFoundError,
} from '../../domain/errors/index.js';

import {
  GeneratedFile,
  contentHashOf,
  type GeneratedFileDocument,
  type DeploymentPlanDocument,
} from '../../models/entities/index.js';

import { PlanRepository } from '../../repositories/plan.repository.js';
import { ProjectRepository } from '../../repositories/project.repository.js';
import { GeneratedFileRepository } from '../../repositories/generated-file.repository.js';

import {
  buildKubernetesManifests,
  type ManifestOutput,
} from './kubernetes-manifest.builder.js';

import {
  DockerfileRepository,
} from '../../repositories/dockerfile.repository.js';

import {
  assertDockerPortsMatch,
} from '../plan-quality/docker-port-quality.js';

export function createKubernetesManifestService(
  plans = new PlanRepository(),
  projects = new ProjectRepository(),
  files = new GeneratedFileRepository(),
  dockerfiles = new DockerfileRepository(),
) {
  async function requireProject(
    userId: string,
    projectId: string,
  ): Promise<void> {
    const project = await projects.findByIdForOwner(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundError('Project not found');
    }
  }

  async function requirePlan(
    userId: string,
    projectId: string,
    planId: string,
  ): Promise<DeploymentPlanDocument> {
    await requireProject(userId, projectId);

    const plan = await plans.findOne({
      _id: planId,
      project: projectId,
    });

    if (!plan) {
      throw new NotFoundError(
        'Deployment plan not found',
      );
    }

    return plan;
  }

  function assertApproved(
    plan: DeploymentPlanDocument,
  ): void {
    if (plan.status !== 'APPROVED') {
      throw new ConflictError(
        'Only APPROVED deployment plans can generate Kubernetes manifests',
      );
    }
  }

  function existingFileFor(
    current: GeneratedFileDocument[],
    output: ManifestOutput,
  ): GeneratedFileDocument | undefined {
    return current.find(
      (item) =>
        item.kind === output.kind &&
        item.componentName === output.componentName,
    );
  }

  function assertUnchanged(
    existing: GeneratedFileDocument,
    output: ManifestOutput,
  ): void {
    if (
      existing.path !== output.path ||
      existing.contentHash !== contentHashOf(output.content)
    ) {
      throw new ConflictError(
        `Generated manifest already exists with different content: ${output.path}`,
      );
    }
  }

  async function list(
    userId: string,
    projectId: string,
    planId: string,
  ): Promise<GeneratedFileDocument[]> {
    await requirePlan(
      userId,
      projectId,
      planId,
    );

        const generated = await files.listByPlan(
      planId,
    );

    return generated.filter(
      (file) => file.kind.startsWith('K8S_'),
    );
  }

  async function generate(
    userId: string,
    projectId: string,
    planId: string,
  ): Promise<GeneratedFileDocument[]> {
    const plan = await requirePlan(
      userId,
      projectId,
      planId,
    );

        assertApproved(plan);

    const generatedDockerfiles =
      await dockerfiles.listForAnalysis(
        projectId,
        String(plan.analysis),
      );

    assertDockerPortsMatch(
      plan.components,
      generatedDockerfiles,
    );

    const manifests = buildKubernetesManifests(
      plan.components,
    );

    const existing = (
      await files.listByPlan(planId)
    ).filter(
      (file) => file.kind.startsWith('K8S_'),
    );

    for (const output of manifests) {
      const previous = existingFileFor(
        existing,
        output,
      );

      if (previous) {
        assertUnchanged(previous, output);
      }
    }

    const result: GeneratedFileDocument[] = [];

    for (const output of manifests) {
      const previous = existingFileFor(
        existing,
        output,
      );

      if (previous) {
        result.push(previous);
        continue;
      }

      const generated = await GeneratedFile.generate({
        projectId: plan.project,
        planId: plan._id,
        planVersion: plan.version,
        analysisId: plan.analysis,
        kind: output.kind,
        componentName: output.componentName,
        fileName: output.fileName,
        path: output.path,
        content: output.content,
      });

      result.push(generated);
    }

    return result;
  }

  return {
    generate,
    list,
  };
}

export type KubernetesManifestService = ReturnType<
  typeof createKubernetesManifestService
>;
