
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

import type {
  GitHubActionsClient,
  GitHubWorkflowRun,
} from './github-actions.client.js';

const WORKFLOW_PATH =
  '.github/workflows/build-images.yml';

function latestRelevantRun(
  runs: readonly GitHubWorkflowRun[],
  approvedAt?: Date,
): GitHubWorkflowRun | null {
  const approvedTimestamp = approvedAt?.getTime();

  const relevant = runs.filter((run) => {
    if (approvedTimestamp === undefined) {
      return true;
    }

    return (
      new Date(run.created_at).getTime() >=
      approvedTimestamp
    );
  });

  return relevant.sort(
    (a, b) =>
      Date.parse(b.created_at) -
      Date.parse(a.created_at),
  )[0] ?? null;
}

export function createCicdBuildStatusService(
  github: GitHubActionsClient,
  projects = new ProjectRepository(),
  plans = new PlanRepository(),
) {
  async function getStatus(
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
        'Only approved plans support CI/CD status',
      );
    }

    const repository = project.repository;

    if (!repository?.isValid) {
      throw new ConflictError(
        'A verified GitHub repository is required',
      );
    }

    const owner = repository.owner;
    const name = repository.name;
    const branch = repository.branch;

    const content = await github.getWorkflowContent(
      owner,
      name,
      branch,
    );

    if (!content) {
      return {
        workflowPath: WORKFLOW_PATH,
        workflowInstalled: false,
        workflowMatchesPlan: false,
        status: 'NOT_INSTALLED',
        run: null,
      };
    }

    const images = plan.components
      .map((component) => component.image?.trim())
      .filter(
        (image): image is string =>
          Boolean(image?.startsWith('ghcr.io/')),
      );

    const matchesPlan =
      images.length > 0 &&
      images.every((image) =>
        content.includes(image),
      );

    if (!matchesPlan) {
      return {
        workflowPath: WORKFLOW_PATH,
        workflowInstalled: true,
        workflowMatchesPlan: false,
        status: 'OUTDATED',
        run: null,
      };
    }

    const runs = await github.listWorkflowRuns(
      owner,
      name,
      branch,
    );

    const run = latestRelevantRun(
      runs,
      plan.review?.decidedAt,
    );

    if (!run) {
      return {
        workflowPath: WORKFLOW_PATH,
        workflowInstalled: true,
        workflowMatchesPlan: true,
        status: 'NOT_STARTED',
        run: null,
      };
    }

    return {
      workflowPath: WORKFLOW_PATH,
      workflowInstalled: true,
      workflowMatchesPlan: true,
      status:
        run.status === 'completed'
          ? run.conclusion === 'success'
            ? 'SUCCESS'
            : 'FAILURE'
          : 'IN_PROGRESS',
      run: {
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        url: run.html_url,
        event: run.event,
        branch: run.head_branch,
        commit: run.head_sha,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
      },
    };
  }
    async function requestBuild(
    userId: string,
    projectId: string,
    planId: string,
  ) {
    const status = await getStatus(
      userId,
      projectId,
      planId,
    );

    if (
      !status.workflowInstalled ||
      !status.workflowMatchesPlan
    ) {
      throw new ConflictError(
        'Install the workflow for this deployment plan before starting a build',
      );
    }

    if (status.status === 'IN_PROGRESS') {
      throw new ConflictError(
        'A workflow execution is already in progress',
      );
    }

    const project = await projects.findByIdForOwner(
      projectId,
      userId,
    );

    if (!project?.repository?.isValid) {
      throw new NotFoundError(
        'Verified project repository not found',
      );
    }

    await github.dispatchWorkflow(
      project.repository.owner,
      project.repository.name,
      project.repository.branch,
    );

    return {
      accepted: true,
      message: 'GitHub Actions workflow dispatch accepted',
    };
  }
  return {
    getStatus,
    requestBuild
  };
}

export type CicdBuildStatusService =
  ReturnType<typeof createCicdBuildStatusService>;
