import { Types } from 'mongoose';

import { ConflictError, NotFoundError } from '../../domain/errors/index.js';
import type { AnalysisDocument, ProjectDocument } from '../../models/entities/index.js';
import type { AnalysisRepository } from '../../repositories/analysis.repository.js';
import type { AuditLogRepository } from '../../repositories/audit-log.repository.js';
import type { ProjectRepository } from '../../repositories/project.repository.js';
import type { RecommendationService } from '../recommendations/recommendation.service.js';
import type {
  CompleteAnalysisBody,
  FailAnalysisBody,
  ListAnalysesQuery,
} from './analysis.schema.js';
import type { AnalysisTrigger } from './n8n-analysis-trigger.js';

type CompleteAnalysisInput = Parameters<AnalysisDocument['complete']>[0];

export interface AnalysisListResult {
  items: AnalysisDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
  };
}

const entityOf = (analysis: AnalysisDocument) => ({ type: 'Analysis', id: analysis._id });

export function createAnalysisService(
  analyses: AnalysisRepository,
  projects: ProjectRepository,
  workflow: AnalysisTrigger,
  recommendations: RecommendationService,
  audit: AuditLogRepository,
) {
  async function findOwnedProject(
    userId: string,
    projectId: string,
  ): Promise<ProjectDocument> {
    const project = await projects.findByIdForOwner(projectId, userId);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    return project;
  }

  async function findForWorkflow(analysisId: string): Promise<AnalysisDocument> {
    const analysis = await analyses.findForWorkflow(analysisId);

    if (!analysis) {
      throw new NotFoundError('Analysis not found');
    }

    return analysis;
  }

  async function recordCompleted(analysis: AnalysisDocument): Promise<void> {
    let created = 0;

    try {
      created = await recommendations.generateForAnalysis(analysis);
    } catch (error) {
      await audit.record({
        action: 'SYSTEM_ERROR',
        level: 'ERROR',
        entity: entityOf(analysis),
        message: 'Recommendation audit failed',
        metadata: { reason: error instanceof Error ? error.message : 'unknown' },
      });
    }

    await audit.record({
      action: 'ANALYSIS_COMPLETED',
      entity: entityOf(analysis),
      metadata: { recommendationsCreated: created },
    });
  }

  async function launch(userId: string, projectId: string): Promise<AnalysisDocument> {
    const project = await findOwnedProject(userId, projectId);
    const { repository } = project;

    if (!repository) {
      throw new NotFoundError('Project has no connected repository');
    }

    if (await analyses.hasActive(projectId)) {
      throw new ConflictError('An analysis is already in progress for this project');
    }

    const analysis = await analyses.request(project, userId);
    const actor = new Types.ObjectId(userId);

    await audit.record({
      actor,
      action: 'ANALYSIS_REQUESTED',
      entity: entityOf(analysis),
      metadata: { projectId, branch: repository.branch },
    });

    try {
      await workflow.trigger({
        analysisId: String(analysis.id),
        repository: {
          owner: repository.owner,
          name: repository.name,
          branch: repository.branch,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Analysis workflow could not be started';

      await analysis.fail({ code: 'WORKFLOW_TRIGGER_FAILED', message });
      await audit.record({
        actor,
        action: 'ANALYSIS_FAILED',
        level: 'ERROR',
        entity: entityOf(analysis),
        message,
        metadata: { code: 'WORKFLOW_TRIGGER_FAILED' },
      });
      throw error;
    }

    return analysis;
  }

  async function list(
    userId: string,
    projectId: string,
    query: ListAnalysesQuery,
  ): Promise<AnalysisListResult> {
    await findOwnedProject(userId, projectId);
    const { items, total } = await analyses.findPage(projectId, userId, query);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pageCount: Math.ceil(total / query.limit),
      },
    };
  }

  async function get(
    userId: string,
    projectId: string,
    analysisId: string,
  ): Promise<AnalysisDocument> {
    const analysis = await analyses.findOneForOwner(analysisId, projectId, userId);

    if (!analysis) {
      throw new NotFoundError('Analysis not found');
    }

    return analysis;
  }

  async function start(analysisId: string): Promise<AnalysisDocument> {
    const analysis = await findForWorkflow(analysisId);

    return analysis.start();
  }

  async function complete(
    analysisId: string,
    input: CompleteAnalysisBody,
  ): Promise<AnalysisDocument> {
    const analysis = await findForWorkflow(analysisId);
    const completed = await analysis.complete(input as CompleteAnalysisInput);

    await recordCompleted(completed);

    return completed;
  }

  async function fail(analysisId: string, error: FailAnalysisBody): Promise<AnalysisDocument> {
    const analysis = await findForWorkflow(analysisId);
    const failed = await analysis.fail(error);

    await audit.record({
      action: 'ANALYSIS_FAILED',
      level: 'ERROR',
      entity: entityOf(failed),
      message: error.message,
      metadata: { code: error.code },
    });

    return failed;
  }

  return { launch, list, get, start, complete, fail };
}

export type AnalysisService = ReturnType<typeof createAnalysisService>;