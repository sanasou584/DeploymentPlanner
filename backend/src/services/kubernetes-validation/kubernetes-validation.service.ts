
import {
  ConflictError,
  NotFoundError,
} from '../../domain/errors/index.js';

import type {
  GeneratedFileDocument,
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
  type ManifestOutput,
} from '../kubernetes-manifests/kubernetes-manifest.builder.js';

import {
  validateManifestContent,
} from './kubernetes-validation.rules.js';

function isKubernetesManifest(
  file: GeneratedFileDocument,
): boolean {
  return file.kind.startsWith('K8S_');
}

function findGeneratedFile(
  files: readonly GeneratedFileDocument[],
  expected: ManifestOutput,
): GeneratedFileDocument | undefined {
  return files.find(
    (file) =>
      file.kind === expected.kind &&
      file.componentName === expected.componentName,
  );
}

function verifyFileSet(
  actual: readonly GeneratedFileDocument[],
  expected: readonly ManifestOutput[],
): void {
  if (actual.length !== expected.length) {
    throw new ConflictError(
      'Kubernetes manifest set is incomplete or contains unexpected files',
    );
  }

  for (const output of expected) {
    const matches = actual.filter(
      (file) =>
        file.kind === output.kind &&
        file.componentName === output.componentName,
    );

    if (matches.length !== 1) {
      throw new ConflictError(
        `Expected exactly one generated manifest: ${output.path}`,
      );
    }
  }
}

export function createKubernetesValidationService(
  projects = new ProjectRepository(),
  plans = new PlanRepository(),
  files = new GeneratedFileRepository(),
) {
  async function validate(
    userId: string,
    projectId: string,
    planId: string,
  ): Promise<GeneratedFileDocument[]> {
    const project = await projects.findByIdForOwner(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundError('Project not found');
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
        'Only approved deployment plans can validate manifests',
      );
    }

    const expected = buildKubernetesManifests(
      plan.components,
    );

    const stored = (
      await files.listByPlan(planId)
    ).filter(isKubernetesManifest);

    verifyFileSet(stored, expected);

    const results: GeneratedFileDocument[] = [];

    for (const output of expected) {
      const file = findGeneratedFile(
        stored,
        output,
      );

      if (!file) {
        throw new ConflictError(
          `Missing manifest: ${output.path}`,
        );
      }

      const issues = validateManifestContent(
        file,
        output,
        plan.version,
      );

      const updated = issues.length === 0
        ? await file.markValid()
        : await file.markInvalid(issues);

      results.push(updated);
    }

    return results;
  }

  return {
    validate,
  };
}

export type KubernetesValidationService =
  ReturnType<typeof createKubernetesValidationService>;
