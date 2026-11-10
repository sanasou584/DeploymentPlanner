import {
  Schema,
  default as mongoose,
  type DefaultSchemaOptions,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

import {
  ANALYSIS_STATUSES,
  TECHNOLOGY_CATEGORIES,
  ANALYZED_COMPONENT_TYPES,
  DOCKER_FINDING_SEVERITIES,
  type AnalysisStatus,
  type TechnologyCategory,
  type AnalysisComponentType,
  type DockerFindingSeverity,
} from '../../domain/enums/analysis.enums.js';
import { defineStateMachine } from '../../domain/state-machine/define-state-machine.js';
import { InvariantViolationError, ConflictError } from '../../domain/errors/index.js';
import { errorInfoSchema, type ErrorInfoFields } from '../value-objects/error-info.schema.js';
import { baseSchemaOptions } from '../plugins/base-schema-options.js';

/**
 * Analysis - one code inspection RUN for a project. Status transitions are
 * guarded by the shared state machine:
 *   PENDING -> RUNNING | FAILED, RUNNING -> COMPLETED | FAILED
 */

export interface AnalysisTechnology {
  name: string;
  version?: string;
  category: TechnologyCategory;
  sourceFile?: string;
}
export interface AnalysisPortEvidence {
  sourceFile: string;
  origin:
    | 'KUBERNETES_MANIFEST'
    | 'SOURCE_CODE'
    | 'FRAMEWORK_CONFIG'
    | 'DOCKERFILE'
    | 'ENV_EXAMPLE';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  requiresReview: boolean;
  line?: number;
}
export interface AnalysisKubernetesEvidence {
  containerPort: number | null;
  servicePort: number | null;
  targetPort: number | string | null;
  image: string | null;
  resources: {
    requests: {
      cpu: string | null;
      memory: string | null;
    };
    limits: {
      cpu: string | null;
      memory: string | null;
    };
  } | null;
    manifestPaths: string[];
  requiresReview: boolean;
  portEvidence?: AnalysisPortEvidence;
}

export interface AnalysisComponent {
  name: string;
  type: AnalysisComponentType;
  rootPath: string;
  kubernetes?: AnalysisKubernetesEvidence;
}

export interface AnalysisDockerFinding {
  ruleId: string;
  severity: DockerFindingSeverity;
  message: string;
  file?: string;
  line?: number;
}

export interface AnalysisDocker {
  hasDockerfile: boolean;
  hasCompose: boolean;
  findings: AnalysisDockerFinding[];
}

export interface AnalysisFields {
  project: Types.ObjectId;
  number: number;
  requestedBy: Types.ObjectId;
  status: AnalysisStatus;
  branch: string;
  detectedFiles: string[];
  technologies: AnalysisTechnology[];
  components: AnalysisComponent[];
  docker: AnalysisDocker;
  error?: ErrorInfoFields;
  startedAt?: Date | null;
  finishedAt?: Date | null;
}

export interface ProjectAnalysisStub {
  id: string | Types.ObjectId;
  assertCanBeAnalyzed(): void;
  repository?: { branch: string } | null;
}

export interface AnalysisStatics {
  request(input: {
    project: ProjectAnalysisStub;
    userId: Types.ObjectId;
  }): Promise<AnalysisDocument>;
}

export interface AnalysisMethods {
  start(): Promise<AnalysisDocument>;
  complete(input: {
    detectedFiles?: string[];
    technologies?: AnalysisTechnology[];
    components?: AnalysisComponent[];
    docker?: AnalysisDocker;
  }): Promise<AnalysisDocument>;
  fail(error: ErrorInfoFields): Promise<AnalysisDocument>;
  isFinished(): boolean;
  hasBlockingDockerIssues(): boolean;
  technologiesByCategory(): Record<string, string[]>;
}

export type AnalysisVirtuals = { durationMs?: number };

export type AnalysisDocument = HydratedDocument<AnalysisFields, AnalysisMethods & AnalysisVirtuals>;

export type AnalysisBaseModel = Model<AnalysisFields, object, AnalysisMethods>;
export type AnalysisModel = AnalysisBaseModel & AnalysisStatics;

const ANALYSIS_MACHINE = defineStateMachine<AnalysisStatus>({
  PENDING: ['RUNNING', 'FAILED'],
  RUNNING: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
});

const technologySchema = new Schema<AnalysisTechnology>(
  {
    name: { type: String, required: true, trim: true, minlength: 1 },
    version: { type: String, trim: true },
    category: { type: String, required: true, enum: TECHNOLOGY_CATEGORIES },
    sourceFile: { type: String, trim: true },
  },
  { _id: false },
);

const kubernetesQuantitySchema = new Schema(
  {
    cpu: { type: String, default: null },
    memory: { type: String, default: null },
  },
  { _id: false },
);

const kubernetesResourcesSchema = new Schema(
  {
    requests: {
      type: kubernetesQuantitySchema,
      required: true,
    },
    limits: {
      type: kubernetesQuantitySchema,
      required: true,
    },
  },
  { _id: false },
);
const portEvidenceSchema = new Schema<AnalysisPortEvidence>(
  {
    sourceFile: {
      type: String,
      required: true,
      trim: true,
    },
    origin: {
      type: String,
      required: true,
      enum: [
        'KUBERNETES_MANIFEST',
        'SOURCE_CODE',
        'FRAMEWORK_CONFIG',
        'DOCKERFILE',
        'ENV_EXAMPLE',
      ],
    },
    confidence: {
      type: String,
      required: true,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
    },
    requiresReview: {
      type: Boolean,
      required: true,
    },
    line: {
      type: Number,
      min: 1,
    },
  },
  { _id: false },
);
const kubernetesEvidenceSchema =
  new Schema<AnalysisKubernetesEvidence>(
    {
      containerPort: {
        type: Number,
        default: null,
      },
      servicePort: {
        type: Number,
        default: null,
      },
      targetPort: {
        type: Schema.Types.Mixed,
        default: null,
      },
      image: {
        type: String,
        default: null,
      },
      resources: {
        type: kubernetesResourcesSchema,
        default: null,
      },
      manifestPaths: {
        type: [String],
        default: [],
      },
            requiresReview: {
        type: Boolean,
        required: true,
      },
      portEvidence: {
        type: portEvidenceSchema,
        default: undefined,
      },
    },
    { _id: false },
  );

const componentSchema = new Schema<AnalysisComponent>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    type: {
      type: String,
      required: true,
      enum: ANALYZED_COMPONENT_TYPES,
    },
    rootPath: {
      type: String,
      required: true,
      trim: true,
    },
    kubernetes: {
      type: kubernetesEvidenceSchema,
      default: undefined,
    },
  },
  { _id: false },
);

const dockerFindingSchema = new Schema<AnalysisDockerFinding>(
  {
    ruleId: { type: String, required: true, trim: true, minlength: 1 },
    severity: { type: String, required: true, enum: DOCKER_FINDING_SEVERITIES },
    message: { type: String, required: true, trim: true, minlength: 1 },
    file: { type: String, trim: true },
    line: { type: Number, min: 1 },
  },
  { _id: false },
);

const dockerSchema = new Schema<AnalysisDocker>(
  {
    hasDockerfile: { type: Boolean, required: true, default: false },
    hasCompose: { type: Boolean, required: true, default: false },
    findings: { type: [dockerFindingSchema], default: [] },
  },
  { _id: false },
);

const analysisSchema = new Schema<
  AnalysisFields,
  AnalysisBaseModel,
  AnalysisMethods,
  Record<string, never>,
  AnalysisVirtuals,
  AnalysisStatics,
  DefaultSchemaOptions
>(
  {
    project: { type: Schema.Types.ObjectId, required: true, ref: 'Project' },
    number: { type: Number, required: true, min: 1 },
    requestedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    status: { type: String, required: true, enum: ANALYSIS_STATUSES, default: 'PENDING' },
    branch: { type: String, required: true, trim: true, minlength: 1 },
    detectedFiles: { type: [String], default: [] },
    technologies: { type: [technologySchema], default: [] },
    components: { type: [componentSchema], default: [] },
    docker: {
      type: dockerSchema,
      default: () => ({ hasDockerfile: false, hasCompose: false, findings: [] }),
    },
    error: { type: errorInfoSchema, default: undefined },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  baseSchemaOptions(),
);

analysisSchema.index({ project: 1, createdAt: -1 });
analysisSchema.index({ project: 1, number: 1 }, { unique: true });
analysisSchema.index({ requestedBy: 1 });

const assertNoDuplicateTechnologies = (technologies: AnalysisTechnology[]): void => {
  const seen = new Set<string>();
  for (const technology of technologies) {
    const key = `${technology.name.toLowerCase()}::${technology.category}`;
    if (seen.has(key)) {
      throw new ConflictError(
        `Duplicate technology: "${technology.name}" (${technology.category})`,
      );
    }
    seen.add(key);
  }
};

const assertUniqueComponentNames = (components: AnalysisComponent[]): void => {
  const seen = new Set<string>();
  for (const component of components) {
    const key = component.name.toLowerCase();
    if (seen.has(key)) {
      throw new ConflictError(`Duplicate component name: "${component.name}"`);
    }
    seen.add(key);
  }
};

analysisSchema.statics.request = async function request(
  this: AnalysisBaseModel,
  input: {
    project: ProjectAnalysisStub;
    userId: Types.ObjectId;
  },
): Promise<AnalysisDocument> {
  input.project.assertCanBeAnalyzed();
  const repository = input.project.repository;
  if (repository === null || repository === undefined) {
    throw new InvariantViolationError('Project has no verified repository');
  }

  const existingCount = await this.countDocuments({ project: input.project.id });

  return new this({
    project: input.project.id as Types.ObjectId,
    number: existingCount + 1,
    requestedBy: input.userId,
    branch: repository.branch,
  }).save() as unknown as Promise<AnalysisDocument>;
};

analysisSchema.methods.start = async function start(this: AnalysisDocument): Promise<AnalysisDocument> {
  const status = this.get('status') as AnalysisStatus;
  ANALYSIS_MACHINE.assertTransition(status, 'RUNNING');
  this.set('status', 'RUNNING');
  this.set('startedAt', new Date());

  return this.save() as unknown as Promise<AnalysisDocument>;
};

analysisSchema.methods.complete = async function complete(
  this: AnalysisDocument,
  input: {
    detectedFiles?: string[];
    technologies?: AnalysisTechnology[];
    components?: AnalysisComponent[];
    docker?: AnalysisDocker;
  },
): Promise<AnalysisDocument> {
  const status = this.get('status') as AnalysisStatus;
  ANALYSIS_MACHINE.assertTransition(status, 'COMPLETED');

  const technologies = (input.technologies ?? this.get('technologies')) as AnalysisTechnology[];
  const components = (input.components ?? this.get('components')) as AnalysisComponent[];
  if (technologies.length > 0) {
    assertNoDuplicateTechnologies(technologies);
  }
  if (components.length > 0) {
    assertUniqueComponentNames(components);
  }

  if (input.detectedFiles !== undefined) {
    this.set('detectedFiles', input.detectedFiles);
  }
  if (input.technologies !== undefined) {
    this.set('technologies', input.technologies);
  }
  if (input.components !== undefined) {
    this.set('components', input.components);
  }
  if (input.docker !== undefined) {
    this.set('docker', input.docker);
  }
  this.set('status', 'COMPLETED');
  this.set('finishedAt', new Date());

  return this.save() as unknown as Promise<AnalysisDocument>;
};

analysisSchema.methods.fail = async function fail(
  this: AnalysisDocument,
  error: ErrorInfoFields,
): Promise<AnalysisDocument> {
  const status = this.get('status') as AnalysisStatus;
  ANALYSIS_MACHINE.assertTransition(status, 'FAILED');
  this.set('status', 'FAILED');
  this.set('error', error);
  this.set('finishedAt', new Date());

  return this.save() as unknown as Promise<AnalysisDocument>;
};

analysisSchema.methods.isFinished = function isFinished(this: AnalysisDocument): boolean {
  const status = this.get('status') as AnalysisStatus;

  return status === 'COMPLETED' || status === 'FAILED';
};

analysisSchema.methods.hasBlockingDockerIssues = function hasBlockingDockerIssues(
  this: AnalysisDocument,
): boolean {
  const findings = (this.get('docker') as AnalysisDocker | undefined)?.findings ?? [];

  return findings.some((finding) => finding.severity === 'ERROR');
};

analysisSchema.methods.technologiesByCategory = function technologiesByCategory(
  this: AnalysisDocument,
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const technology of this.get('technologies') as AnalysisTechnology[]) {
    const bucket = grouped[technology.category] ?? [];
    bucket.push(technology.name);
    grouped[technology.category] = bucket;
  }

  return grouped;
};

analysisSchema.virtual('durationMs').get(function durationMsVirtual(this: AnalysisDocument) {
  const startedAt = this.get('startedAt') as Date | null;
  const finishedAt = this.get('finishedAt') as Date | null;
  if (!startedAt || !finishedAt) {
    return undefined;
  }

  return finishedAt.getTime() - startedAt.getTime();
});

export const ANALYSIS_MODEL_NAME = 'Analysis' as const;
export const Analysis = mongoose.model(ANALYSIS_MODEL_NAME, analysisSchema);
