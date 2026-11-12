
import { ConflictError, NotFoundError } from '../../domain/errors/index.js';

import { ProjectRepository } from '../../repositories/project.repository.js';
import { PlanRepository } from '../../repositories/plan.repository.js';
import { AnalysisRepository } from '../../repositories/analysis.repository.js';
import { DockerfileRepository } from '../../repositories/dockerfile.repository.js';

import {
  generateBuildWorkflow,
  type WorkflowComponent,
} from './workflow-generator.service.js';

import type {
  GitHubCicdClient,
  GitHubCicdFile,
} from './github-cicd.client.js';

const WORKFLOW_PATH =
  '.github/workflows/build-images.yml';

function normalizedPath(value: string): string {
  const path = value
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/$/, '');

  if (
    path.startsWith('/') ||
    path.split('/').some((segment) => segment === '..') ||
    !/^[a-zA-Z0-9_./-]*$/.test(path)
  ) {
    throw new ConflictError(
      'Invalid component source path',
    );
  }

  return path;
}

function dockerfilePath(rootPath: string): string {
  const root = normalizedPath(rootPath);
  return root ? `${root}/Dockerfile` : 'Dockerfile';
}

export function createCicdService(
  github: GitHubCicdClient,
  projects = new ProjectRepository(),
  plans = new PlanRepository(),
  analyses = new AnalysisRepository(),
  dockerfiles = new DockerfileRepository(),
) {
  async function prepare(
    userId: string,
    projectId: string,
    planId: string,
  ) {
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
        'Only approved plans can prepare CI/CD',
      );
    }

    const repository = project.repository;

    if (!repository?.isValid) {
      throw new ConflictError(
        'A verified GitHub repository is required',
      );
    }

    const analysis = await analyses.findOneForOwner(
      plan.analysis,
      projectId,
      userId,
    );

    if (!analysis || analysis.status !== 'COMPLETED') {
      throw new ConflictError(
        'A completed analysis is required',
      );
    }

    const existingPaths = new Set(
      analysis.detectedFiles.map(normalizedPath),
    );

    const generated = await dockerfiles.listForAnalysis(
      projectId,
      String(plan.analysis),
    );

        const proposedFiles = new Map(
      generated.map((file) => [
        normalizedPath(file.path),
        file.content,
      ]),
    );

    const components: WorkflowComponent[] = [];
    const files: GitHubCicdFile[] = [];
    const warnings: string[] = [];

    for (const component of plan.components) {
      const image = component.image?.trim();

      if (!image) {
        throw new ConflictError(
          `${component.name}: container image is missing`,
        );
      }

      if (!image.toLowerCase().startsWith('ghcr.io/')) {
        warnings.push(
          `${component.name}: external image will be reused`,
        );
        continue;
      }

      const namespace = image
        .split('/')[1]?.toLowerCase();

      if (namespace !== repository.owner.toLowerCase()) {
        throw new ConflictError(
          `${component.name}: GHCR namespace must match the connected repository owner`,
        );
      }

      const detected = analysis.components.find(
        (item) =>
          item.name.toLowerCase() ===
          component.name.toLowerCase(),
      );

      if (!detected) {
        throw new ConflictError(
          `${component.name}: source component not found`,
        );
      }

      const root = normalizedPath(detected.rootPath);
      const path = dockerfilePath(root);

      if (!existingPaths.has(path)) {
        const content = proposedFiles.get(path);

        if (!content) {
          throw new ConflictError(
            `${component.name}: no Dockerfile exists or has been generated`,
          );
        }

        files.push({
          path,
          content,
        });

        warnings.push(
          `${component.name}: generated Dockerfile requires review and build validation`,
        );
      }

            const additionalFiles = generated.filter(
        (file) =>
          file.componentName === component.name &&
          file.kind === 'DOCKER_ASSET',
      );

      for (const asset of additionalFiles) {
        const assetPath = normalizedPath(asset.path);

        if (existingPaths.has(assetPath)) {
          continue;
        }

        if (!files.some((item) => item.path === assetPath)) {
          files.push({
            path: assetPath,
            content: asset.content,
          });
        }
      }

      components.push({
        name: component.name,
        rootPath: root || '.',
        dockerfilePath: path,
        image,
      });
    }

    if (components.length === 0) {
      throw new ConflictError(
        'No GHCR images require building',
      );
    }

    const workflow = generateBuildWorkflow({
      components,
      branch: repository.branch,
    });

    files.push({
      path: WORKFLOW_PATH,
      content: workflow,
    });

    return {
      repository: {
        owner: repository.owner,
        name: repository.name,
        branch: repository.branch,
      },
      planId,
      workflow,
      files,
      components,
      warnings,
    };
  }

  async function preview(
    userId: string,
    projectId: string,
    planId: string,
  ) {
    const result = await prepare(
      userId,
      projectId,
      planId,
    );

    return {
      workflowPath: WORKFLOW_PATH,
      workflow: result.workflow,
      components: result.components,
      files: result.files.map((file) => file.path),
      warnings: result.warnings,
    };
  }

  async function createPullRequest(
    userId: string,
    projectId: string,
    planId: string,
  ) {
    const result = await prepare(
      userId,
      projectId,
      planId,
    );

    const pullRequest =
      await github.createWorkflowPullRequest({
        owner: result.repository.owner,
        repository: result.repository.name,
        baseBranch: result.repository.branch,
        planId,
        files: result.files,
      });

    return {
      ...pullRequest,
      repository:
        `${result.repository.owner}/${result.repository.name}`,
      files: result.files.map((file) => file.path),
    };
  }

  return {
    preview,
    createPullRequest,
  };
}

export type CicdService =
  ReturnType<typeof createCicdService>;
