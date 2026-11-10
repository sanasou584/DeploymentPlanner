import { Types } from 'mongoose';

import type { AuditAction } from '../../domain/enums/audit.enums.js';
import { ConflictError, InvariantViolationError, NotFoundError } from '../../domain/errors/index.js';
import type { AnalysisDocument, AuditLogDocument } from '../../models/entities/index.js';
import type { AnalysisRepository } from '../../repositories/analysis.repository.js';
import type { AuditLogRepository } from '../../repositories/audit-log.repository.js';
import type { ProjectRepository } from '../../repositories/project.repository.js';
import type { FailAiAuditBody } from './ai-audit.schema.js';
import type { AiAuditTrigger } from './n8n-ai-audit-trigger.js';

const ANALYSIS_ENTITY = 'Analysis';
const ACTIVE_WINDOW_MS = 10 * 60 * 1000;
const RUN_ACTIONS: readonly AuditAction[] = [
  'AI_AUDIT_REQUESTED',
  'AI_AUDIT_FAILED',
  'RECOMMENDATIONS_GENERATED',
];

export function isAuditRunActive(events: readonly AuditLogDocument[], now: number): boolean {
  const last = events.find((event) => RUN_ACTIONS.includes(event.get('action') as AuditAction));

  if (last === undefined || last.get('action') !== 'AI_AUDIT_REQUESTED') {
    return false;
  }

  return now - (last.get('createdAt') as Date).getTime() < ACTIVE_WINDOW_MS;
}

export function createAiAuditService(
  workflow: AiAuditTrigger,
  analyses: AnalysisRepository,
  projects: ProjectRepository,
  audit: AuditLogRepository,
) {
  function ensureCompleted(analysis: AnalysisDocument | null): AnalysisDocument {
    if (!analysis) {
      throw new NotFoundError('Analysis not found');
    }

    if (analysis.status !== 'COMPLETED') {
      throw new InvariantViolationError('Only a completed analysis can be audited by the AI');
    }

    return analysis;
  }

  async function findConnectedRepository(userId: string, projectId: string) {
    const project = await projects.findByIdForOwner(projectId, userId);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const { repository } = project;

    if (!repository) {
      throw new NotFoundError('Project has no connected repository');
    }

    return repository;
  }

  async function assertActiveRun(analysis: AnalysisDocument): Promise<void> {
    const events = await audit.listForEntity(ANALYSIS_ENTITY, analysis._id);

    if (!isAuditRunActive(events, Date.now())) {
      throw new ConflictError('No AI audit is in progress for this analysis');
    }
  }

  async function recordFailure(analysis: AnalysisDocument, message: string, code?: string) {
    await audit.record({
      action: 'AI_AUDIT_FAILED',
      level: 'ERROR',
      entity: { type: ANALYSIS_ENTITY, id: analysis._id },
      message: message.slice(0, 2000),
      ...(code !== undefined ? { metadata: { code } } : {}),
    });
  }

  async function launch(userId: string, projectId: string, analysisId: string) {
    const analysis = ensureCompleted(
      await analyses.findOneForOwner(analysisId, projectId, userId),
    );
    const repository = await findConnectedRepository(userId, projectId);
    const events = await audit.listForEntity(ANALYSIS_ENTITY, analysis._id);

    if (isAuditRunActive(events, Date.now())) {
      throw new ConflictError('An AI audit is already in progress for this analysis');
    }

    await audit.record({
      actor: new Types.ObjectId(userId),
      action: 'AI_AUDIT_REQUESTED',
      entity: { type: ANALYSIS_ENTITY, id: analysis._id },
      message: 'AI audit requested',
    });

    try {
      await workflow.trigger({
        analysisId,
        repository: { owner: repository.owner, name: repository.name, branch: analysis.branch },
      });
    } catch (error) {
      await recordFailure(
        analysis,
        error instanceof Error ? error.message : 'AI audit workflow could not be started',
        'WORKFLOW_TRIGGER_FAILED',
      );
      throw error;
    }

    return { analysisId, status: 'REQUESTED' as const };
  }

  async function getContext(analysisId: string) {
    const analysis = ensureCompleted(await analyses.findForWorkflow(analysisId));
    await assertActiveRun(analysis);
    const repository = await findConnectedRepository(
      String(analysis.requestedBy),
      String(analysis.project),
    );

    return {
      analysisId: String(analysis._id),
      repository: { owner: repository.owner, name: repository.name },
      branch: analysis.branch,
      detectedFiles: analysis.detectedFiles,
      technologies: analysis.technologies,
      components: analysis.components,
      docker: analysis.docker,
    };
  }

  async function fail(analysisId: string, body: FailAiAuditBody) {
    const analysis = ensureCompleted(await analyses.findForWorkflow(analysisId));
    await assertActiveRun(analysis);
    await recordFailure(analysis, body.message, body.code);

    return { analysisId, status: 'FAILED' as const };
  }

  return { launch, getContext, fail };
}

export type AiAuditService = ReturnType<typeof createAiAuditService>;
