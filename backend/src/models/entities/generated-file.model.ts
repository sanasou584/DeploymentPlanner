import { createHash } from 'node:crypto';

import {
  Schema,
  default as mongoose,
  type DefaultSchemaOptions,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

import {
  GENERATED_FILE_KINDS,
  GENERATED_FILE_VALIDATION_STATUSES,
  type GeneratedFileKind,
  type GeneratedFileValidationStatus,
} from '../../domain/enums/generated-file.enums.js';
import { InvariantViolationError } from '../../domain/errors/index.js';
import { baseSchemaOptions } from '../plugins/base-schema-options.js';

/**
 * GeneratedFile - one FILE the platform emits (Dockerfile, Kubernetes YAML,
 * GitHub workflow). contentHash (sha256) ALWAYS matches `content`: computed
 * in the factory and recomputed on replaceContent(). Storing the planVersion
 * with every file makes drift detection trivial (isStaleFor(plan)).
 */

export interface GeneratedFileValidation {
  status: GeneratedFileValidationStatus;
  issues: string[];
  validatedAt?: Date;
}

export interface GeneratedFileFields {
  project: Types.ObjectId;
  plan?: Types.ObjectId;
  planVersion?: number;
  analysis?: Types.ObjectId;
  kind: GeneratedFileKind;
  componentName?: string;
  fileName: string;
  path: string;
  content: string;
  contentHash: string;
  validation: GeneratedFileValidation;
}

export interface GeneratedFileStatics {
  generate(input: {
    projectId: Types.ObjectId;
    kind: GeneratedFileKind;
    fileName: string;
    path: string;
    content: string;
    planId?: Types.ObjectId;
    planVersion?: number;
    analysisId?: Types.ObjectId;
    componentName?: string;
  }): Promise<GeneratedFileDocument>;
}

export interface GeneratedFileMethods {
  replaceContent(content: string): Promise<GeneratedFileDocument>;
  markValid(): Promise<GeneratedFileDocument>;
  markInvalid(issues: string[]): Promise<GeneratedFileDocument>;
  isStaleFor(plan: { get(path: 'version'): number }): boolean;
}

export type GeneratedFileDocument = HydratedDocument<GeneratedFileFields, GeneratedFileMethods>;

export type GeneratedFileBaseModel = Model<GeneratedFileFields, object, GeneratedFileMethods>;
export type GeneratedFileModel = GeneratedFileBaseModel & GeneratedFileStatics;

const CONTENT_MAX_BYTES = 1024 * 1024;

const KINDS_REQUIRING_PLAN: Array<GeneratedFileKind> = [
  'K8S_DEPLOYMENT',
  'K8S_SERVICE',
  'K8S_INGRESS',
  'K8S_HPA',
  'K8S_CONFIGMAP',
  'GITHUB_WORKFLOW',
];

const sha256 = (content: string): string => createHash('sha256').update(content, 'utf8').digest('hex');

export const contentHashOf = sha256;

const generatedFileSchema = new Schema<
  GeneratedFileFields,
  GeneratedFileBaseModel,
  GeneratedFileMethods,
  Record<never, never>,
  Record<never, never>,
  GeneratedFileStatics,
  DefaultSchemaOptions
>(
  {
    project: { type: Schema.Types.ObjectId, required: true, ref: 'Project' },
    plan: { type: Schema.Types.ObjectId, ref: 'DeploymentPlan' },
    planVersion: { type: Number },
    analysis: { type: Schema.Types.ObjectId, ref: 'Analysis' },
    kind: { type: String, required: true, enum: GENERATED_FILE_KINDS },
    componentName: { type: String, trim: true, minlength: 1 },
    fileName: { type: String, required: true, trim: true, minlength: 1 },
    path: { type: String, required: true, trim: true, minlength: 1 },
    content: {
      type: String,
      required: true,
      validate: {
        validator: (value: string): boolean => Buffer.byteLength(value, 'utf8') <= CONTENT_MAX_BYTES,
        message: 'content exceeds the 1 MB limit',
      },
    },
    contentHash: { type: String, required: true },
    validation: {
      type: {
        status: { type: String, required: true, enum: GENERATED_FILE_VALIDATION_STATUSES, default: 'PENDING' },
        issues: { type: [String], default: [] },
        validatedAt: { type: Date },
      },
      required: true,
      default: () => ({}),
      _id: false,
    },
  },
  baseSchemaOptions(),
);

generatedFileSchema.index({ project: 1, plan: 1, kind: 1 });

const assertContentMatchesHash = function assertContentMatchesHash(
  this: GeneratedFileDocument,
): void {
  const content = this.get('content') as string;
  const contentHash = this.get('contentHash') as string;
  if (contentHash !== sha256(content)) {
    this.invalidate('contentHash', 'contentHash must match sha256(content)', '', 'user defined');
  }
};

const assertKindDependencies = function assertKindDependencies(
  this: GeneratedFileDocument & { invalidate(path: string, msg: string, kind: string, type: string): void },
): void {
  const kind = this.get('kind') as GeneratedFileKind;
  if (KINDS_REQUIRING_PLAN.includes(kind)) {
    if (!this.get('plan')) {
      this.invalidate('plan', `A plan is required for ${kind}`, '', 'required');
    }
    if (!this.get('planVersion')) {
      this.invalidate('planVersion', `A plan version is required for ${kind}`, '', 'required');
    }
    return;
  }
  if (kind === 'DOCKERFILE' && !this.get('analysis') && !this.get('plan')) {
    this.invalidate('analysis', 'A DOCKERFILE needs a plan or an analysis', '', 'required');
  }
};

generatedFileSchema.pre('validate', function runGeneratedFileInvariants(this: GeneratedFileDocument): void {
  assertContentMatchesHash.call(this);
  assertKindDependencies.call(this as never);
});

generatedFileSchema.statics.generate = async function generate(
  this: GeneratedFileBaseModel,
  input: {
    projectId: Types.ObjectId;
    kind: GeneratedFileKind;
    fileName: string;
    path: string;
    content: string;
    planId?: Types.ObjectId;
    planVersion?: number;
    analysisId?: Types.ObjectId;
    componentName?: string;
  },
): Promise<GeneratedFileDocument> {
  const created = new this({
    project: input.projectId,
    kind: input.kind,
    fileName: input.fileName,
    path: input.path,
    content: input.content,
    contentHash: sha256(input.content),
    ...(input.planId !== undefined ? { plan: input.planId } : {}),
    ...(input.planVersion !== undefined ? { planVersion: input.planVersion } : {}),
    ...(input.analysisId !== undefined ? { analysis: input.analysisId } : {}),
    ...(input.componentName !== undefined ? { componentName: input.componentName } : {}),
  });

  return created.save() as unknown as Promise<GeneratedFileDocument>;
};

generatedFileSchema.methods.replaceContent = async function replaceContent(
  this: GeneratedFileDocument,
  content: string,
): Promise<GeneratedFileDocument> {
  this.set('content', content);
  this.set('contentHash', sha256(content));
  this.set('validation', { status: 'PENDING', issues: [], validatedAt: undefined });

  return this.save() as unknown as Promise<GeneratedFileDocument>;
};

generatedFileSchema.methods.markValid = async function markValid(
  this: GeneratedFileDocument,
): Promise<GeneratedFileDocument> {
  this.set('validation', { status: 'VALID', issues: [], validatedAt: new Date() });

  return this.save() as unknown as Promise<GeneratedFileDocument>;
};

generatedFileSchema.methods.markInvalid = async function markInvalid(
  this: GeneratedFileDocument,
  issues: string[],
): Promise<GeneratedFileDocument> {
  if (issues.length === 0) {
    throw new InvariantViolationError('markInvalid requires at least one issue');
  }
  this.set('validation', { status: 'INVALID', issues, validatedAt: new Date() });

  return this.save() as unknown as Promise<GeneratedFileDocument>;
};

generatedFileSchema.methods.isStaleFor = function isStaleFor(
  this: GeneratedFileDocument,
  plan: { get(path: 'version'): number },
): boolean {
  const planVersion = this.get('planVersion') as number | undefined;

  return planVersion === undefined || planVersion !== plan.get('version');
};

export const GENERATED_FILE_MODEL_NAME = 'GeneratedFile' as const;
export const GeneratedFile = mongoose.model(GENERATED_FILE_MODEL_NAME, generatedFileSchema);
