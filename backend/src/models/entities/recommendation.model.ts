import {
  Schema,
  default as mongoose,
  type DefaultSchemaOptions,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

import {
  RECOMMENDATION_TYPES,
  RECOMMENDATION_SEVERITIES,
  RECOMMENDATION_STATUSES,
  type RecommendationType,
  type RecommendationSeverity,
  type RecommendationStatus,
} from '../../domain/enums/recommendation.enums.js';
import { defineStateMachine } from '../../domain/state-machine/define-state-machine.js';
import { ConflictError } from '../../domain/errors/index.js';
import { baseSchemaOptions } from '../plugins/base-schema-options.js';

/**
 * Recommendation - ONE proposal produced from an analysis. A recommendation
 * belongs to its analysis; plans reference recommendations (not the reverse).
 * Only PENDING -> ACCEPTED / REJECTED transitions exist. The human decision
 * stamps decidedBy (and optionally a note).
 */

export interface RecommendationGeneratedBy {
  provider: string;
  model: string;
}

export interface RecommendationProposedFile {
  path: string;
  content: string;
}

export interface RecommendationFields {
  analysis: Types.ObjectId;
  type: RecommendationType;
  componentName?: string;
  severity: RecommendationSeverity;
  title: string;
  description: string;
  suggestedValue?: string;
  confidence?: number;
  proposedFile?: RecommendationProposedFile;
  status: RecommendationStatus;
  decidedBy?: Types.ObjectId;
  decidedAt?: Date;
  decisionNote?: string;
  generatedBy: RecommendationGeneratedBy;
}

export interface RecommendationStatics {
  fromAi(input: {
    analysisId: Types.ObjectId;
    generatedBy: RecommendationGeneratedBy;
    type: RecommendationType;
    severity: RecommendationSeverity;
    title: string;
    description: string;
    componentName?: string;
    suggestedValue?: string;
    confidence?: number;
    proposedFile?: RecommendationProposedFile;
  }): Promise<RecommendationDocument>;
}
export interface RecommendationEnrichment {
  generatedBy: RecommendationGeneratedBy;
  type: RecommendationType;
  severity: RecommendationSeverity;
  title: string;
  description: string;
  componentName?: string;
  suggestedValue?: string;
  confidence?: number;
  proposedFile?: RecommendationProposedFile;
}
export interface RecommendationMethods {
  accept(user: Types.ObjectId): Promise<RecommendationDocument>;
  reject(user: Types.ObjectId, note?: string): Promise<RecommendationDocument>;
  isPending(): boolean;
  enrichFromAi(
    input: RecommendationEnrichment,
  ): Promise<RecommendationDocument>;
}

export type RecommendationDocument = HydratedDocument<
  RecommendationFields,
  RecommendationMethods,
  Record<never, never>,
  Record<never, never>
>;

export type RecommendationBaseModel = Model<RecommendationFields, object, RecommendationMethods>;
export type RecommendationModel = RecommendationBaseModel & RecommendationStatics;

const RECOMMENDATION_MACHINE = defineStateMachine<RecommendationStatus>({
  PENDING: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: [],
  REJECTED: [],
});

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;
const PROPOSED_FILE_MAX = 20000;

const recommendationSchema = new Schema<
  RecommendationFields,
  RecommendationBaseModel,
  RecommendationMethods,
   Record<never, never>,
  Record<never, never>,
  RecommendationStatics,
  DefaultSchemaOptions
>(
  {
    analysis: { type: Schema.Types.ObjectId, required: true, ref: 'Analysis' },
    type: { type: String, required: true, enum: RECOMMENDATION_TYPES },
    componentName: { type: String, trim: true, minlength: 1 },
    severity: {
      type: String,
      required: true,
      enum: RECOMMENDATION_SEVERITIES,
      default: 'INFO',
    },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: TITLE_MAX },
    description: { type: String, required: true, trim: true, minlength: 1, maxlength: DESCRIPTION_MAX },
    suggestedValue: { type: String, trim: true, minlength: 1 },
    confidence: { type: Number, min: 0, max: 1 },
    proposedFile: {
      type: {
        path: { type: String, required: true, trim: true, minlength: 1 },
        content: { type: String, required: true, minlength: 1, maxlength: PROPOSED_FILE_MAX },
      },
      default: undefined,
      _id: false,
    },
    status: {
      type: String,
      required: true,
      enum: RECOMMENDATION_STATUSES,
      default: 'PENDING',
    },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
    decisionNote: { type: String, trim: true, maxlength: 1000 },
    generatedBy: {
      type: {
        provider: { type: String, required: true, trim: true, minlength: 1 },
        model: { type: String, required: true, trim: true, minlength: 1 },
      },
      required: true,
      _id: false,
    },
  },
  baseSchemaOptions(),
);

recommendationSchema.statics.fromAi = async function fromAi(
  this: RecommendationBaseModel,
  input: {
    analysisId: Types.ObjectId;
    generatedBy: RecommendationGeneratedBy;
    type: RecommendationType;
    severity: RecommendationSeverity;
    title: string;
    description: string;
    componentName?: string;
    suggestedValue?: string;
    confidence?: number;
    proposedFile?: RecommendationProposedFile;
  },
): Promise<RecommendationDocument> {
  const created = new this({
    analysis: input.analysisId,
    generatedBy: input.generatedBy,
    type: input.type,
    severity: input.severity,
    title: input.title,
    description: input.description,
    ...(input.componentName !== undefined ? { componentName: input.componentName } : {}),
    ...(input.suggestedValue !== undefined ? { suggestedValue: input.suggestedValue } : {}),
    ...(input.confidence !== undefined ? { confidence: input.confidence } : {}),
    ...(input.proposedFile !== undefined ? { proposedFile: input.proposedFile } : {}),
  });

  return created.save() as unknown as Promise<RecommendationDocument>;
};
const SEVERITY_RANK: Record<
  RecommendationSeverity,
  number
> = {
  INFO: 0,
  WARNING: 1,
  CRITICAL: 2,
};

recommendationSchema.methods.enrichFromAi =
  async function enrichFromAi(
    this: RecommendationDocument,
    input: RecommendationEnrichment,
  ): Promise<RecommendationDocument> {
    if (this.get('status') !== 'PENDING') {
      throw new ConflictError(
        'Only pending recommendations can be enriched',
      );
    }

    const currentSeverity = this.get(
      'severity',
    ) as RecommendationSeverity;

    const severity =
      SEVERITY_RANK[input.severity] >
      SEVERITY_RANK[currentSeverity]
        ? input.severity
        : currentSeverity;

    const staticDescription = this.get(
      'description',
    ) as string;

    const description = [
      `Static audit: ${staticDescription}`,
      `AI audit: ${input.description}`,
    ]
      .join('\n\n')
      .slice(0, DESCRIPTION_MAX);

    this.set('type', input.type);
    this.set('severity', severity);
    this.set('title', input.title);
    this.set('description', description);
    this.set('generatedBy', input.generatedBy);

    if (input.componentName !== undefined) {
      this.set('componentName', input.componentName);
    }

    if (input.suggestedValue !== undefined) {
      this.set('suggestedValue', input.suggestedValue);
    }

    if (input.confidence !== undefined) {
      this.set('confidence', input.confidence);
    }

    if (input.proposedFile !== undefined) {
      this.set('proposedFile', input.proposedFile);
    }

    return this.save() as unknown as Promise<
      RecommendationDocument
    >;
  };
const decide = async (
  recommendation: RecommendationDocument,
  user: Types.ObjectId,
  status: 'ACCEPTED' | 'REJECTED',
  note?: string,
): Promise<RecommendationDocument> => {
  const current = recommendation.get('status') as RecommendationStatus;
  RECOMMENDATION_MACHINE.assertTransition(current, status);
  recommendation.set('status', status);
  recommendation.set('decidedBy', user);
  recommendation.set('decidedAt', new Date());
  if (note !== undefined) {
    recommendation.set('decisionNote', note);
  }

  return recommendation.save() as unknown as Promise<RecommendationDocument>;
};

/** Indexes declared as data: one row per query plan the repositories rely on. */
recommendationSchema.index({ analysis: 1, createdAt: -1 });

recommendationSchema.methods.accept = async function accept(
  this: RecommendationDocument,
  user: Types.ObjectId,
): Promise<RecommendationDocument> {
  return decide(this, user, 'ACCEPTED');
};

recommendationSchema.methods.reject = async function reject(
  this: RecommendationDocument,
  user: Types.ObjectId,
  note?: string,
): Promise<RecommendationDocument> {
  return decide(this, user, 'REJECTED', note);
};

recommendationSchema.methods.isPending = function isPending(this: RecommendationDocument): boolean {
  return this.get('status') === 'PENDING';
};

export const RECOMMENDATION_MODEL_NAME = 'Recommendation' as const;
export const Recommendation = mongoose.model(RECOMMENDATION_MODEL_NAME, recommendationSchema);
