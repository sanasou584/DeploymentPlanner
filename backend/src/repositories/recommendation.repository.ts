import type { Types } from 'mongoose';

import type {
  RecommendationSeverity,
  RecommendationType,
} from '../domain/enums/recommendation.enums.js';
import {
  Recommendation,
  type RecommendationDocument,
  type RecommendationFields,
  type RecommendationMethods,
} from '../models/entities/index.js';
import { BaseRepository, type RepositoryOptions } from './base.repository.js';

export interface RecommendationInput {
  analysisId: Types.ObjectId;
  generatedBy: { provider: string; model: string };
  type: RecommendationType;
  severity: RecommendationSeverity;
  title: string;
  description: string;
  componentName?: string;
  suggestedValue?: string;
  confidence?: number;
  proposedFile?: { path: string; content: string };
}

export class RecommendationRepository extends BaseRepository<
  RecommendationFields,
  RecommendationMethods
> {
  constructor() {
    super(Recommendation);
  }

  /** All recommendations of an analysis, newest first. */
  listByAnalysis(
    analysisId: Types.ObjectId | string,
    options: RepositoryOptions = {},
  ): Promise<RecommendationDocument[]> {
    return this.find({ analysis: analysisId }, { ...options, sort: { createdAt: -1 } });
  }

  record(input: RecommendationInput): Promise<RecommendationDocument> {
    return Recommendation.fromAi(input);
  }

  /** One recommendation, only if it belongs to the given analysis. */
  findForAnalysis(
    recommendationId: string,
    analysisId: Types.ObjectId | string,
  ): Promise<RecommendationDocument | null> {
    return this.findOne({ _id: recommendationId, analysis: analysisId });
  }
}
