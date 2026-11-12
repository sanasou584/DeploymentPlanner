
import { Types } from 'mongoose';

import {
  groundPlanComponents,
} from './grounded-plan-components.js';

import {
  assertAiProposalImages,
} from '../plan-quality/container-image-quality.js';

import {
  ConflictError,
  NotFoundError,
} from '../../domain/errors/index.js';

import {
  DeploymentPlan,
} from '../../models/entities/index.js';

import {
  PlanRepository,
} from '../../repositories/plan.repository.js';

import {
  ProjectRepository,
} from '../../repositories/project.repository.js';

import {
  AnalysisRepository,
} from '../../repositories/analysis.repository.js';

import {
  RecommendationRepository,
} from '../../repositories/recommendation.repository.js';

import {
  AuditLogRepository,
} from '../../repositories/audit-log.repository.js';

import {
  parseOrThrow,
} from '../../shared/validation/request-validation.js';

import {
  aiPlanResultSchema,
  type AiPlanResult,
} from './ai-deployment-plan.schema.js';

import type {
  AiPlanContext,
  N8nAiPlanTrigger,
} from './n8n-ai-plan-trigger.js';

import {
  proposeImageReferences,
} from '../image-references/image-reference.service.js';

import {
  DockerfileRepository,
} from '../../repositories/dockerfile.repository.js';

import {
  alignGeneratedDockerPorts,
} from '../plan-quality/docker-port-quality.js';

function validateComponents(
  expected: AiPlanContext['components'],
  generated: AiPlanResult['components'],
): void {
  if (expected.length !== generated.length) {
    throw new ConflictError(
      'AI plan does not contain every detected component',
    );
  }

  const expectedTypes = new Map(
    expected.map((component) => [
      component.name.toLowerCase(),
      component.type,
    ]),
  );

  const seen = new Set<string>();

  for (const component of generated) {
    const key = component.name.toLowerCase();

    if (
      seen.has(key) ||
      expectedTypes.get(key) !== component.type
    ) {
      throw new ConflictError(
        `Invalid AI-generated component: ${component.name}`,
      );
    }

    seen.add(key);
  }
}

export function createAiDeploymentPlanService(
  workflow: N8nAiPlanTrigger,
  plans = new PlanRepository(),
  projects = new ProjectRepository(),
  analyses = new AnalysisRepository(),
  recommendations = new RecommendationRepository(),
    audit = new AuditLogRepository(),
  dockerfiles = new DockerfileRepository(),
) {
  async function generate(
    userId: string,
    projectId: string,
    analysisId: string,
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

    const analysis = await analyses.findOneForOwner(
      analysisId,
      projectId,
      userId,
    );

    if (!analysis) {
      throw new NotFoundError(
        'Analysis not found',
      );
    }

    if (analysis.status !== 'COMPLETED') {
      throw new ConflictError(
        'Only completed analyses can generate deployment plans',
      );
    }

    if (analysis.components.length === 0) {
      throw new ConflictError(
        'Analysis has no detected deployment components',
      );
    }

    const allRecommendations =
      await recommendations.listByAnalysis(
        analysis._id,
      );

    const accepted = allRecommendations.filter(
      (item) => item.status === 'ACCEPTED',
    );

    const context: AiPlanContext = {
      analysisId,
      branch: analysis.branch,
      environment: project.environment,

      components: analysis.components.map(
        (component) => ({
          name: component.name,
          type: component.type,
          rootPath: component.rootPath,

          ...(component.kubernetes
            ? {
                kubernetes: {
                  containerPort:
                    component.kubernetes.containerPort,
                  servicePort:
                    component.kubernetes.servicePort,
                  targetPort:
                    component.kubernetes.targetPort,
                  image:
                    component.kubernetes.image,
                  resources:
                    component.kubernetes.resources,
                  manifestPaths: [
                    ...component.kubernetes.manifestPaths,
                  ],
                  requiresReview:
                    component.kubernetes.requiresReview,
                },
              }
            : {}),
        }),
      ),

      technologies: analysis.technologies.map(
        (technology) => ({
          name: technology.name,
          category: technology.category,

          ...(technology.version !== undefined
            ? { version: technology.version }
            : {}),
        }),
      ),

      detectedFiles: [
        ...analysis.detectedFiles,
      ],

      docker: {
        hasDockerfile:
          analysis.docker.hasDockerfile,
        hasCompose:
          analysis.docker.hasCompose,
      },

      recommendations: accepted.map(
        (item) => ({
          type: item.type,
          title: item.title,
          description: item.description,

          ...(item.componentName
            ? {
                componentName:
                  item.componentName,
              }
            : {}),

          ...(item.suggestedValue
            ? {
                suggestedValue:
                  item.suggestedValue,
              }
            : {}),
        }),
      ),
    };

    const raw = await workflow.generate(
      context,
    );

    const proposal = parseOrThrow(
      aiPlanResultSchema,
      raw,
      'Invalid AI deployment plan proposal',
    );

    validateComponents(
      context.components,
      proposal.components,
    );

    const grounded = groundPlanComponents(
      proposal.components,
      context.components,
    );

        const generatedDockerfiles =
      await dockerfiles.listForAnalysis(
        projectId,
        analysisId,
      );

    const aligned = alignGeneratedDockerPorts(
      grounded.components,
      analysis.components,
      generatedDockerfiles,
    );

    assertAiProposalImages(
      aligned.components,
    );

        const version =
      await plans.nextVersionFor(
        projectId,
      );

    if (!project.repository?.isValid) {
      throw new ConflictError(
        'A verified GitHub repository is required',
      );
    }

    const proposedComponents =
      proposeImageReferences({
        repository: {
          owner: project.repository.owner,
          name: project.repository.name,
        },
        version,
        components: aligned.components,
      });

    assertAiProposalImages(
      proposedComponents,
    );

    const actor =
      new Types.ObjectId(userId);

    const plan = await DeploymentPlan.draft({
      projectId: project._id,
      analysisId: analysis._id,
      createdBy: actor,
      version,
      components: proposedComponents,
      recommendations: accepted.map(
        (item) => item._id,
      ),
    });

    const assumptions = [
      ...proposal.assumptions,
      ...grounded.warnings,
      ...aligned.warnings,
    ];

    await audit.record({
      actor,
      action: 'PLAN_CREATED',
      entity: {
        type: 'DeploymentPlan',
        id: plan._id,
      },
      message: 'AI deployment plan generated',
      metadata: {
        source: 'AI',
        version,
        assumptions,
      },
    });

    return {
      plan,
      assumptions,
    };
  }

  return {
    generate,
  };
}

export type AiDeploymentPlanService =
  ReturnType<
    typeof createAiDeploymentPlanService
  >;
