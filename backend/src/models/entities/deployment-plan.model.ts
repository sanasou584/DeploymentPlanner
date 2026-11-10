import {
  Schema,
  default as mongoose,
  type DefaultSchemaOptions,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

import {
  PLAN_STATUSES,
  PLAN_COMPONENT_TYPES,
  type PlanStatus,
  type PlanComponentType,
} from '../../domain/enums/plan.enums.js';
import { defineStateMachine } from '../../domain/state-machine/define-state-machine.js';
import {
  ConflictError,
  InvariantViolationError,
} from '../../domain/errors/index.js';
import {
  resourceSpecSchema,
  type ResourceSpecFields,
} from '../value-objects/resource-spec.schema.js';
import { hpaSpecSchema, type HpaSpecFields } from '../value-objects/hpa-spec.schema.js';
import {
  ingressSpecSchema,
  type IngressSpecFields,
} from '../value-objects/ingress-spec.schema.js';
import { baseSchemaOptions } from '../plugins/base-schema-options.js';

/**
 * DeploymentPlan - the immutable contract once approved. Components are
 * editable ONLY in DRAFT (approve() runs every invariant and freezes the
 * shape); revisions go through createRevision() which mints a NEW unsaved
 * DRAFT (version = max(existing)+1, deep-copied components, previousPlan).
 * optimisticConcurrency guards concurrent edits of the same draft via __v.
 */

export interface PlanComponent {
  name: string;
  type: PlanComponentType;
  containerPort: number;
  image?: string;
  replicas: number;
  resources: ResourceSpecFields;
  hpa: HpaSpecFields;
  ingress: IngressSpecFields;
}

export interface PlanReview {
  decidedBy: Types.ObjectId;
  decidedAt: Date;
  reason?: string;
}

export interface DeploymentPlanFields {
  project: Types.ObjectId;
  analysis: Types.ObjectId;
  version: number;
  previousPlan?: Types.ObjectId;
  status: PlanStatus;
  components: PlanComponent[];
  recommendations: Types.ObjectId[];
  createdBy: Types.ObjectId;
  review?: PlanReview;
}

export interface DeploymentPlanDocumentMethods {
  addComponent(component: PlanComponent): Promise<DeploymentPlanDocument>;
  updateComponent(name: string, patch: Partial<Omit<PlanComponent, 'name'>>): Promise<DeploymentPlanDocument>;
  removeComponent(name: string): Promise<DeploymentPlanDocument>;
  attachRecommendation(recommendationId: Types.ObjectId): Promise<DeploymentPlanDocument>;
  approve(user: Types.ObjectId): Promise<DeploymentPlanDocument>;
  reject(user: Types.ObjectId, reason: string): Promise<DeploymentPlanDocument>;
  supersede(): Promise<DeploymentPlanDocument>;
  createRevision(user: Types.ObjectId): DeploymentPlanDocument;
  assertApproved(): void;
  canGenerateFiles(): boolean;
  assertDraftEditable(): void;
}

export type DeploymentPlanVirtuals = { totalReplicas: number };

export type DeploymentPlanDocument = HydratedDocument<
  DeploymentPlanFields,
  DeploymentPlanDocumentMethods & DeploymentPlanVirtuals
>;

export interface DeploymentPlanStatics {
  draft(input: {
    projectId: Types.ObjectId;
    analysisId: Types.ObjectId;
    createdBy: Types.ObjectId;
    version: number;
    components: PlanComponent[];
    recommendations?: Types.ObjectId[];
  }): Promise<DeploymentPlanDocument>;
}

export type DeploymentPlanBaseModel = Model<DeploymentPlanFields, object, DeploymentPlanDocumentMethods>;
export type DeploymentPlanModel = DeploymentPlanBaseModel & DeploymentPlanStatics;

const PLAN_MACHINE = defineStateMachine<PlanStatus>({
  DRAFT: ['APPROVED', 'REJECTED'],
  APPROVED: ['SUPERSEDED'],
  REJECTED: [],
  SUPERSEDED: [],
});

const componentSchema = new Schema<PlanComponent>(
  {
    name: { type: String, required: true, trim: true, minlength: 1 },
    type: { type: String, required: true, enum: PLAN_COMPONENT_TYPES },
    containerPort: { type: Number, required: true, min: 1, max: 65535 },
    image: { type: String, trim: true },
    replicas: { type: Number, required: true, min: 1 },
    resources: { type: resourceSpecSchema, required: true },
    hpa: { type: hpaSpecSchema, required: true },
    ingress: { type: ingressSpecSchema, required: true },
  },
  { _id: false, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

const reviewSchema = new Schema<PlanReview>(
  {
    decidedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    decidedAt: { type: Date, required: true },
    reason: { type: String, trim: true },
  },
  { _id: false },
);

const deploymentPlanSchema = new Schema<
  DeploymentPlanFields,
  DeploymentPlanBaseModel,
  DeploymentPlanDocumentMethods,
  Record<string, never>,
  DeploymentPlanVirtuals,
  DeploymentPlanStatics,
  DefaultSchemaOptions
>(
  {
    project: { type: Schema.Types.ObjectId, required: true, ref: 'Project' },
    analysis: { type: Schema.Types.ObjectId, required: true, ref: 'Analysis' },
    version: { type: Number, required: true, min: 1 },
    previousPlan: { type: Schema.Types.ObjectId, ref: 'DeploymentPlan' },
    status: { type: String, required: true, enum: PLAN_STATUSES, default: 'DRAFT' },
    components: {
      type: [componentSchema],
      required: true,
      validate: { validator: (v: unknown[]) => v.length >= 1, message: 'a plan needs at least one component' },
    },
    recommendations: { type: [Schema.Types.ObjectId], default: [] },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    review: { type: reviewSchema, default: undefined },
  },
  // optimisticConcurrency requires a real versionKey; serialization still
  // removes __v (baseSchemaOptions' transform strips it).
  {
    ...baseSchemaOptions(),
    versionKey: '__v',
  },
);

deploymentPlanSchema.set('optimisticConcurrency', true);

deploymentPlanSchema.index({ project: 1, version: 1 }, { unique: true });
deploymentPlanSchema.index({ project: 1, createdAt: -1 });

const assertUniqueComponentNames = (components: PlanComponent[]): void => {
  const seen = new Set<string>();
  for (const component of components) {
    const key = component.name.toLowerCase();
    if (seen.has(key)) {
      throw new ConflictError(`Duplicate plan component name: "${component.name}"`);
    }
    seen.add(key);
  }
};

const requireDraft = function requireDraft(this: DeploymentPlanDocument): void {
  if (this.get('status') !== 'DRAFT') {
    throw new InvariantViolationError(
      `Plan components are editable only while DRAFT (current: ${this.get('status')})`,
    );
  }
};

const findComponentIndex = (components: PlanComponent[], name: string): number =>
  components.findIndex((component) => component.name.toLowerCase() === name.toLowerCase());

deploymentPlanSchema.statics.draft = async function draft(
  this: DeploymentPlanBaseModel,
  input: {
    projectId: Types.ObjectId;
    analysisId: Types.ObjectId;
    createdBy: Types.ObjectId;
    version: number;
    components: PlanComponent[];
    recommendations?: Types.ObjectId[];
  },
): Promise<DeploymentPlanDocument> {
  if (input.version < 1) {
    throw new ConflictError('Plan version must be >= 1');
  }
  assertUniqueComponentNames(input.components);

  const created = new this({
    project: input.projectId,
    analysis: input.analysisId,
    version: input.version,
    components: input.components,
    createdBy: input.createdBy,
    ...(input.recommendations !== undefined ? { recommendations: input.recommendations } : {}),
  });

  return created.save() as unknown as Promise<DeploymentPlanDocument>;
};

deploymentPlanSchema.methods.assertDraftEditable = function assertDraftEditable(
  this: DeploymentPlanDocument,
): void {
  requireDraft.call(this);
};

deploymentPlanSchema.methods.addComponent = async function addComponent(
  this: DeploymentPlanDocument,
  component: PlanComponent,
): Promise<DeploymentPlanDocument> {
  requireDraft.call(this);
  const current = this.get('components') as PlanComponent[];
  assertUniqueComponentNames([...current, component]);
  this.set('components', [...current, component]);

  return this.save() as unknown as Promise<DeploymentPlanDocument>;
};

deploymentPlanSchema.methods.updateComponent = async function updateComponent(
  this: DeploymentPlanDocument,
  name: string,
  patch: Partial<Omit<PlanComponent, 'name'>>,
): Promise<DeploymentPlanDocument> {
  requireDraft.call(this);
  const current = this.get('components') as PlanComponent[];
  const index = findComponentIndex(current, name);
  if (index < 0) {
    throw new ConflictError(`Plan component not found: "${name}"`);
  }
  const snapshot = (current[index] as unknown as { toObject(): Record<string, unknown> }).toObject();
  const next = [...current];
  const updatedComponent = { ...snapshot, ...patch } as PlanComponent;
  next[index] = updatedComponent;
  assertUniqueComponentNames(next);
  this.set('components', next);

  return this.save() as unknown as Promise<DeploymentPlanDocument>;
};

deploymentPlanSchema.methods.removeComponent = async function removeComponent(
  this: DeploymentPlanDocument,
  name: string,
): Promise<DeploymentPlanDocument> {
  requireDraft.call(this);
  const current = this.get('components') as PlanComponent[];
  if (current.length <= 1) {
    throw new InvariantViolationError('A plan needs at least one component');
  }
  if (findComponentIndex(current, name) < 0) {
    throw new ConflictError(`Plan component not found: "${name}"`);
  }
  this.set('components', [...current.filter((component) => component.name.toLowerCase() !== name.toLowerCase())]);

  return this.save() as unknown as Promise<DeploymentPlanDocument>;
};

deploymentPlanSchema.methods.attachRecommendation = async function attachRecommendation(
  this: DeploymentPlanDocument,
  recommendationId: Types.ObjectId,
): Promise<DeploymentPlanDocument> {
  const current = this.get('recommendations') as Types.ObjectId[];
  if (current.some((id) => id.equals(recommendationId))) {
    throw new ConflictError('Recommendation already attached to this plan');
  }
  this.set('recommendations', [...current, recommendationId]);

  return this.save() as unknown as Promise<DeploymentPlanDocument>;
};

deploymentPlanSchema.methods.approve = async function approve(
  this: DeploymentPlanDocument,
  user: Types.ObjectId,
): Promise<DeploymentPlanDocument> {
  const status = this.get('status') as PlanStatus;
  PLAN_MACHINE.assertTransition(status, 'APPROVED');
  requireDraft.call(this);
  assertUniqueComponentNames(this.get('components') as PlanComponent[]);
  await this.validate(); // run ALL invariants (embedded VO hooks included)

  this.set('status', 'APPROVED');
  this.set('review', { decidedBy: user, decidedAt: new Date() });

  return this.save() as unknown as Promise<DeploymentPlanDocument>;
};

deploymentPlanSchema.methods.reject = async function reject(
  this: DeploymentPlanDocument,
  user: Types.ObjectId,
  reason: string,
): Promise<DeploymentPlanDocument> {
  const status = this.get('status') as PlanStatus;
  PLAN_MACHINE.assertTransition(status, 'REJECTED');
  requireDraft.call(this);
  if (reason.trim().length === 0) {
    throw new InvariantViolationError('A rejection reason is required');
  }

  this.set('status', 'REJECTED');
  this.set('review', { decidedBy: user, decidedAt: new Date(), reason: reason.trim() });

  return this.save() as unknown as Promise<DeploymentPlanDocument>;
};

deploymentPlanSchema.methods.supersede = async function supersede(
  this: DeploymentPlanDocument,
): Promise<DeploymentPlanDocument> {
  const status = this.get('status') as PlanStatus;
  PLAN_MACHINE.assertTransition(status, 'SUPERSEDED');
  this.set('status', 'SUPERSEDED');

  return this.save() as unknown as Promise<DeploymentPlanDocument>;
};

deploymentPlanSchema.methods.createRevision = function createRevision(
  this: DeploymentPlanDocument,
  user: Types.ObjectId,
): DeploymentPlanDocument {
  const status = this.get('status') as PlanStatus;
  if (status !== 'APPROVED' && status !== 'REJECTED') {
    throw new InvariantViolationError(
      `Revisions can start only from APPROVED or REJECTED (current: ${status})`,
    );
  }

  const components = this.get('components') as PlanComponent[];
  const latest = this.get('version') as number;

  const CreatedModel = this.constructor as unknown as Model<
    DeploymentPlanFields,
    object,
    DeploymentPlanDocumentMethods
  >;
  const revision = new CreatedModel({
    project: this.get('project'),
    analysis: this.get('analysis'),
    version: latest + 1,
    previousPlan: this.get('_id'),
    status: 'DRAFT',
    components: JSON.parse(JSON.stringify(components)) as PlanComponent[],
    recommendations: [...(this.get('recommendations') as Types.ObjectId[])],
    createdBy: user,
  });

  return revision as unknown as DeploymentPlanDocument;
};

deploymentPlanSchema.methods.assertApproved = function assertApproved(
  this: DeploymentPlanDocument,
): void {
  if (this.get('status') !== 'APPROVED') {
    throw new InvariantViolationError('DeploymentPlan is not approved');
  }
};

deploymentPlanSchema.methods.canGenerateFiles = function canGenerateFiles(
  this: DeploymentPlanDocument,
): boolean {
  return this.get('status') === 'APPROVED';
};

deploymentPlanSchema.virtual('totalReplicas').get(function totalReplicasVirtual(
  this: DeploymentPlanDocument,
): number {
  return (this.get('components') as PlanComponent[]).reduce(
    (sum: number, component) => sum + (component.replicas as number),
    0,
  );
});

export const DEPLOYMENT_PLAN_MODEL_NAME = 'DeploymentPlan' as const;
export const DeploymentPlan = mongoose.model(DEPLOYMENT_PLAN_MODEL_NAME, deploymentPlanSchema);
