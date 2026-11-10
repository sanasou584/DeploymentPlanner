import { Types } from 'mongoose';

import { InvariantViolationError, NotFoundError } from '../../domain/errors/index.js';
import type { AnalysisDocument, RecommendationDocument } from '../../models/entities/index.js';
import type { AnalysisRepository } from '../../repositories/analysis.repository.js';
import type { AuditLogRepository } from '../../repositories/audit-log.repository.js';
import type {
  RecommendationInput,
  RecommendationRepository,
} from '../../repositories/recommendation.repository.js';
import { RULES_GENERATED_BY, runAuditRules, type AuditContext } from './audit-rules.js';
import type { AiRecommendationsBody } from './recommendation.schema.js';

interface NewRecommendation {
  type: RecommendationInput['type'];
  severity: RecommendationInput['severity'];
  title: string;
  description: string;
  componentName?: string | undefined;
  suggestedValue?: string | undefined;
  confidence?: number | undefined;
  proposedFile?: { path: string; content: string } | undefined;
}

interface Origin {
  provider: string;
  model: string;
}

export interface RecordedRecommendations {
  created: number;
  skipped: number;
}

const keyOf = (item: { type: string; title: string; componentName?: string | undefined }): string =>
  `${item.type}|${item.componentName ?? ''}|${item.title}`;

const toInput = (
  analysisId: Types.ObjectId,
  origin: Origin,
  proposal: NewRecommendation,
): RecommendationInput => ({
  analysisId,
  generatedBy: { provider: origin.provider, model: origin.model },
  type: proposal.type,
  severity: proposal.severity,
  title: proposal.title,
  description: proposal.description,
  ...(proposal.componentName !== undefined ? { componentName: proposal.componentName } : {}),
  ...(proposal.suggestedValue !== undefined ? { suggestedValue: proposal.suggestedValue } : {}),
  ...(proposal.confidence !== undefined ? { confidence: proposal.confidence } : {}),
  ...(proposal.proposedFile !== undefined ? { proposedFile: proposal.proposedFile } : {}),
});

function toAuditContext(analysis: AnalysisDocument): AuditContext {
  return {
    detectedFiles: [...analysis.detectedFiles],
    docker: {
      hasDockerfile: analysis.docker.hasDockerfile,
      findings: analysis.docker.findings.map((finding) => ({
        ruleId: finding.ruleId,
        severity: finding.severity,
        message: finding.message,
        file: finding.file,
        line: finding.line,
      })),
    },
  };
}

export function createRecommendationService(
  recommendations: RecommendationRepository,
  analyses: AnalysisRepository,
  audit: AuditLogRepository,
) {
  async function findOwnedAnalysis(
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

  async function findRecommendation(
    analysis: AnalysisDocument,
    recommendationId: string,
  ): Promise<RecommendationDocument> {
    const recommendation = await recommendations.findForAnalysis(recommendationId, analysis._id);

    if (!recommendation) {
      throw new NotFoundError('Recommendation not found');
    }

    return recommendation;
  }

  async function createFresh(
    analysis: AnalysisDocument,
    origin: Origin,
    proposals: readonly NewRecommendation[],
  ): Promise<RecordedRecommendations> {
    const existing = await recommendations.listByAnalysis(analysis._id);
    const known = new Set(existing.map((item) => keyOf(item)));
    const fresh = proposals.filter((proposal) => {
      const key = keyOf(proposal);
      if (known.has(key)) {
        return false;
      }
      known.add(key);

      return true;
    });

    await Promise.all(
      fresh.map((proposal) => recommendations.record(toInput(analysis._id, origin, proposal))),
    );

    return { created: fresh.length, skipped: proposals.length - fresh.length };
  }

  async function generateForAnalysis(analysis: AnalysisDocument): Promise<number> {
    const { created } = await createFresh(
      analysis,
      RULES_GENERATED_BY,
      runAuditRules(toAuditContext(analysis)),
    );

    return created;
  }

  async function recordAiRecommendations(
    analysisId: string,
    input: AiRecommendationsBody,
  ): Promise<RecordedRecommendations> {
    const analysis = await analyses.findForWorkflow(analysisId);

    if (!analysis) {
      throw new NotFoundError('Analysis not found');
    }

    if (analysis.status !== 'COMPLETED') {
      throw new InvariantViolationError('Only a completed analysis can receive recommendations');
    }

    const result = await createFresh(
      analysis,
      { provider: input.provider, model: input.model },
      input.recommendations,
    );

    await audit.record({
      action: 'RECOMMENDATIONS_GENERATED',
      entity: { type: 'Analysis', id: analysis._id },
      message: `${result.created} recommendation(s) from ${input.provider}/${input.model}`,
      metadata: { provider: input.provider, model: input.model, ...result },
    });

    return result;
  }

  async function runAudit(userId: string, projectId: string, analysisId: string) {
    const analysis = await findOwnedAnalysis(userId, projectId, analysisId);

    if (analysis.status !== 'COMPLETED') {
      throw new InvariantViolationError('Only a completed analysis can be audited');
    }

    const created = await generateForAnalysis(analysis);
    const items = await recommendations.listByAnalysis(analysis._id);

    return { created, items };
  }

  async function list(
    userId: string,
    projectId: string,
    analysisId: string,
  ): Promise<RecommendationDocument[]> {
    const analysis = await findOwnedAnalysis(userId, projectId, analysisId);

    return recommendations.listByAnalysis(analysis._id);
  }

  async function accept(
    userId: string,
    projectId: string,
    analysisId: string,
    recommendationId: string,
  ): Promise<RecommendationDocument> {
    const analysis = await findOwnedAnalysis(userId, projectId, analysisId);
    const recommendation = await findRecommendation(analysis, recommendationId);
    const actor = new Types.ObjectId(userId);
    const decided = await recommendation.accept(actor);

    await audit.record({
      actor,
      action: 'RECOMMENDATION_ACCEPTED',
      entity: { type: 'Recommendation', id: decided._id },
      message: decided.title,
      metadata: { analysisId: String(analysis._id) },
    });

    return decided;
  }

  async function reject(
    userId: string,
    projectId: string,
    analysisId: string,
    recommendationId: string,
    note?: string,
  ): Promise<RecommendationDocument> {
    const analysis = await findOwnedAnalysis(userId, projectId, analysisId);
    const recommendation = await findRecommendation(analysis, recommendationId);
    const actor = new Types.ObjectId(userId);
    const decided = await recommendation.reject(actor, note);

    await audit.record({
      actor,
      action: 'RECOMMENDATION_REJECTED',
      entity: { type: 'Recommendation', id: decided._id },
      message: decided.title,
      metadata: {
        analysisId: String(analysis._id),
        ...(note !== undefined ? { note } : {}),
      },
    });

    return decided;
  }

  return { generateForAnalysis, recordAiRecommendations, runAudit, list, accept, reject };
}

export type RecommendationService = ReturnType<typeof createRecommendationService>;