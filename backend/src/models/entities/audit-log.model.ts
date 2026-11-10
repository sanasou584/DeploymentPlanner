import {
  Schema,
  default as mongoose,
  type DefaultSchemaOptions,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

import {
  AUDIT_ACTIONS,
  AUDIT_LEVELS,
  type AuditAction,
  type AuditLevel,
} from '../../domain/enums/audit.enums.js';
import { InvariantViolationError } from '../../domain/errors/index.js';
import { errorInfoSchema, type ErrorInfoFields } from '../value-objects/error-info.schema.js';
import { baseSchemaOptions } from '../plugins/base-schema-options.js';

/**
 * AuditLog - append-only event log. Records are immutable: any update
 * (document save, updateOne/Many, findOneAndUpdate, findOneAndReplace,
 * findOneAndDelete) or delete (deleteOne/Many) throws an
 * InvariantViolationError. POST-SAVE blocking (in post('save')) rolls no data
 * back, so the database-level immutability is enforced by PRE hooks plus the
 * schema's immutable:true default.
 */

export interface AuditEntity {
  type: string;
  id: Types.ObjectId;
}

export interface AuditLogFields {
  actor?: Types.ObjectId | null;
  action: AuditAction;
  level: AuditLevel;
  entity: AuditEntity;
  message?: string;
  metadata?: Record<string, unknown>;
  error?: ErrorInfoFields;
}

export interface AuditLogStatics {
  record(input: {
    actor?: Types.ObjectId | null;
    action: AuditAction;
    level?: AuditLevel;
    entity: AuditEntity;
    message?: string;
    metadata?: Record<string, unknown>;
    error?: ErrorInfoFields;
  }): Promise<AuditLogDocument>;
}

export type AuditLogDocument = HydratedDocument<AuditLogFields>;

export type AuditLogBaseModel = Model<AuditLogFields, object, object>;
export type AuditLogModel = AuditLogBaseModel & AuditLogStatics;

const APPEND_ONLY = 'AuditLog records are append-only';

const entityRefSchema = new Schema<AuditEntity>(
  {
    type: { type: String, required: true, immutable: true, trim: true, minlength: 1, maxlength: 40 },
    id: { type: Schema.Types.ObjectId, required: true, immutable: true },
  },
  { _id: false },
);

const auditLogSchema = new Schema<
  AuditLogFields,
  AuditLogBaseModel,
  object,
  Record<never, never>,
  Record<never, never>,
  AuditLogStatics,
  DefaultSchemaOptions
>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', immutable: true },
    action: { type: String, required: true, enum: AUDIT_ACTIONS, immutable: true },
    level: {
      type: String,
      required: true,
      enum: AUDIT_LEVELS,
      default: 'INFO',
      immutable: true,
    },
    entity: { type: entityRefSchema, required: true },
    message: { type: String, trim: true, immutable: true, maxlength: 2000 },
    // Mixed type: the ONLY allowed use in this codebase. Rationale: the log's
    // payload is event-specific ctx (ids, counts, historical values) without a
    // fixed shape; validation of internals is the producer's job (each emit
    // site controllers/services).
    metadata: { type: Schema.Types.Mixed, immutable: true },
    error: { type: errorInfoSchema, immutable: true },
  },
  {
    ...baseSchemaOptions(),
    timestamps: { createdAt: true, updatedAt: false }, // createdAt ONLY
  },
);

auditLogSchema.index(
  { 'entity.type': 1, 'entity.id': 1, createdAt: -1 },
);
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ level: 1, createdAt: -1 });

/** Insert-only write guard: every mutation hook throws. */
const rejectAppendOnly = function rejectAppendOnly(): void {
  throw new InvariantViolationError(APPEND_ONLY);
};

for (const hook of ['updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'replaceOne'] as const) {
  auditLogSchema.pre(hook, rejectAppendOnly);
}
auditLogSchema.pre<Record<string, unknown>>('findOneAndUpdate', rejectAppendOnly);
auditLogSchema.pre<Record<string, unknown>>('findOneAndDelete', rejectAppendOnly);
auditLogSchema.pre<Record<string, unknown>>('findOneAndReplace', rejectAppendOnly);

// A loaded document must not be mutated silently through save(): only inserts
// (isNew) are allowed through; other save() mutations are rejected.
auditLogSchema.pre('save', function enforceAppendOnlySave(this: AuditLogDocument): void {
  if (!this.isNew) {
    throw new InvariantViolationError(APPEND_ONLY);
  }
});

auditLogSchema.statics.record = async function record(
  this: AuditLogBaseModel,
  input: {
    actor?: Types.ObjectId | null;
    action: AuditAction;
    level?: AuditLevel;
    entity: AuditEntity;
    message?: string;
    metadata?: Record<string, unknown>;
    error?: ErrorInfoFields;
  },
): Promise<AuditLogDocument> {
  const created = new this({
    action: input.action,
    entity: input.entity,
    ...(input.actor !== undefined ? { actor: input.actor } : {}),
    ...(input.level !== undefined ? { level: input.level } : {}),
    ...(input.message !== undefined ? { message: input.message } : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    ...(input.error !== undefined ? { error: input.error } : {}),
  });

  return created.save() as unknown as Promise<AuditLogDocument>;
};

export const AUDIT_LOG_MODEL_NAME = 'AuditLog' as const;
export const AuditLog = mongoose.model(AUDIT_LOG_MODEL_NAME, auditLogSchema);
