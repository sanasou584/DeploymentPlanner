
import { Types } from 'mongoose';

import {
  assertPlanImagesReady,
} from '../plan-quality/container-image-quality.js';

import {
  ConflictError,
  NotFoundError,
} from '../../domain/errors/index.js';

import {
  DeploymentPlan,
  type AnalysisDocument,
  type DeploymentPlanDocument,
} from '../../models/entities/index.js';

import { PlanRepository } from '../../repositories/plan.repository.js';
import { ProjectRepository } from '../../repositories/project.repository.js';
import { AnalysisRepository } from '../../repositories/analysis.repository.js';
import { RecommendationRepository } from '../../repositories/recommendation.repository.js';
import { AuditLogRepository } from '../../repositories/audit-log.repository.js';

import type {
  CreatePlanBody,
  UpdatePlanComponentBody,
} from './deployment-plan.schema.js';

import {
  proposeImageReferences,
} from '../image-references/image-reference.service.js';

import {
  DockerfileRepository,
} from '../../repositories/dockerfile.repository.js';

import {
  assertDockerPortsMatch,
} from '../plan-quality/docker-port-quality.js';

function validateComponents(
  analysis: AnalysisDocument,
  components: CreatePlanBody['components'],
): void {
  const expected = new Map(
    analysis.components.map((component) => [
      component.name.toLowerCase(),
      component.type,
    ]),
  );

  if (expected.size === 0) {
    throw new ConflictError(
      'Analysis contains no deployable components',
    );
  }

  if (components.length !== expected.size) {
    throw new ConflictError(
      'Plan must contain every detected component',
    );
  }

  const seen = new Set<string>();

  for (const component of components) {
    const key = component.name.toLowerCase();

    if (seen.has(key) || expected.get(key) !== component.type) {
      throw new ConflictError(
        `Invalid or duplicate plan component: ${component.name}`,
      );
    }

    seen.add(key);
  }
}

export function createDeploymentPlanService(
  plans = new PlanRepository(),
  projects = new ProjectRepository(),
  analyses = new AnalysisRepository(),
  recommendations = new RecommendationRepository(),
  audit = new AuditLogRepository(),
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
        const project = await projects.findByIdForOwner(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundError(
        'Project not found',
      );
    }

    if (!project.repository?.isValid) {
      throw new ConflictError(
        'A verified GitHub repository is required',
      );
    }

    const plan = await plans.findOne({
      _id: planId,
      project: projectId,
    });

    if (!plan) {
      throw new NotFoundError('Deployment plan not found');
    }

    return plan;
  }

    async function create(
    userId: string,
    projectId: string,
    input: CreatePlanBody,
  ): Promise<DeploymentPlanDocument> {
    const project = await projects.findByIdForOwner(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (!project.repository?.isValid) {
      throw new ConflictError(
        'A verified GitHub repository is required',
      );
    }

    const analysis = await analyses.findOneForOwner(
      input.analysisId,
      projectId,
      userId,
    );

    if (!analysis) {
      throw new NotFoundError('Analysis not found');
    }

    if (analysis.status !== 'COMPLETED') {
      throw new ConflictError(
        'Only completed analyses can generate deployment plans',
      );
    }

    validateComponents(
      analysis,
      input.components,
    );

    const allRecommendations =
      await recommendations.listByAnalysis(analysis._id);

    const accepted = allRecommendations.filter(
      (item) => item.status === 'ACCEPTED',
    );

        const version = await plans.nextVersionFor(projectId);

    const proposedComponents = proposeImageReferences({
      repository: {
        owner: project.repository.owner,
        name: project.repository.name,
      },
      version,
      components: input.components,
    });

    const actor = new Types.ObjectId(userId);

    const plan = await DeploymentPlan.draft({
      projectId: new Types.ObjectId(projectId),
      analysisId: analysis._id,
      createdBy: actor,
      version,
      components: proposedComponents,
      recommendations: accepted.map(
        (item) => item._id,
      ),
    });

    await audit.record({
      actor,
      action: 'PLAN_CREATED',
      entity: {
        type: 'DeploymentPlan',
        id: plan._id,
      },
      message: `Deployment plan version ${version} created`,
    });

    return plan;
  }

  async function list(
    userId: string,
    projectId: string,
  ): Promise<DeploymentPlanDocument[]> {
    await requireProject(userId, projectId);

    return plans.listByProject(projectId);
  }

  async function get(
    userId: string,
    projectId: string,
    planId: string,
  ): Promise<DeploymentPlanDocument> {
    return requirePlan(
      userId,
      projectId,
      planId,
    );
  }

  async function updateComponent(
    userId: string,
    projectId: string,
    planId: string,
    name: string,
    input: UpdatePlanComponentBody,
  ): Promise<DeploymentPlanDocument> {
    const plan = await requirePlan(
      userId,
      projectId,
      planId,
    );

    const updated = await plan.updateComponent(
      name,
      input,
    );

    await audit.record({
      actor: new Types.ObjectId(userId),
      action: 'PLAN_UPDATED',
      entity: {
        type: 'DeploymentPlan',
        id: updated._id,
      },
      message: `Plan component ${name} updated`,
    });

    return updated;
  }

  async function approve(
    userId: string,
    projectId: string,
    planId: string,
  ): Promise<DeploymentPlanDocument> {
    const plan = await requirePlan(
      userId,
      projectId,
      planId,
    );

        const generatedDockerfiles =
      await dockerfiles.listForAnalysis(
        projectId,
        String(plan.analysis),
      );

    assertDockerPortsMatch(
      plan.components,
      generatedDockerfiles,
    );

    assertPlanImagesReady(plan.components);

    const approved = await plan.approve(
      new Types.ObjectId(userId),
    );

    await audit.record({
      actor: new Types.ObjectId(userId),
      action: 'PLAN_APPROVED',
      entity: {
        type: 'DeploymentPlan',
        id: approved._id,
      },
      message: 'Deployment plan approved',
    });

    return approved;
  }

  async function reject(
    userId: string,
    projectId: string,
    planId: string,
    reason: string,
  ): Promise<DeploymentPlanDocument> {
    const plan = await requirePlan(
      userId,
      projectId,
      planId,
    );

    const rejected = await plan.reject(
      new Types.ObjectId(userId),
      reason,
    );

    await audit.record({
      actor: new Types.ObjectId(userId),
      action: 'PLAN_REJECTED',
      entity: {
        type: 'DeploymentPlan',
        id: rejected._id,
      },
      message: reason,
    });

    return rejected;
  }

  return {
    create,
    list,
    get,
    updateComponent,
    approve,
    reject,
  };
}

export type DeploymentPlanService = ReturnType<
  typeof createDeploymentPlanService
>;
