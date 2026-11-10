import {
  Schema,
  default as mongoose,
  type DefaultSchemaOptions,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

import {
  DEPLOYMENT_STATUSES,
  ARGO_SYNC_STATUSES,
  ARGO_HEALTH_STATUSES,
  type DeploymentStatus,
  type ArgoSyncStatus,
  type ArgoHealthStatus,
} from '../../domain/enums/deployment.enums.js';
import { PROJECT_ENVIRONMENTS, type ProjectEnvironment } from '../../domain/enums/project.enums.js';
import { defineStateMachine } from '../../domain/state-machine/define-state-machine.js';
import type { ErrorInfoFields } from '../value-objects/error-info.schema.js';
import { errorInfoSchema } from '../value-objects/error-info.schema.js';
import { baseSchemaOptions } from '../plugins/base-schema-options.js';

/**
 * Deployment - a concrete rollout of an APPROVED plan. createFromPlan throws
 * unless the plan asserts approved; planVersion is COPIED so drift is visible
 * even if the plan changes later. GitOps fields document the commit pushed;
 * argo() documents the Argo CD application state.
 */

export interface DeploymentGitops {
  repositoryUrl: string;
  branch: string;
  path: string;
  commitSha?: string;
}

export interface DeploymentArgo {
  applicationName?: string;
  syncStatus?: ArgoSyncStatus;
  healthStatus?: ArgoHealthStatus;
  lastSyncedAt?: Date;
}

export interface DeploymentFields {
  project: Types.ObjectId;
  plan: Types.ObjectId;
  planVersion: number;
  environment: ProjectEnvironment;
  triggeredBy: Types.ObjectId;
  status: DeploymentStatus;
  gitops: DeploymentGitops;
  argo: DeploymentArgo;
  error?: ErrorInfoFields;
  startedAt?: Date | null;
  finishedAt?: Date | null;
}

export interface DeploymentDocumentMethods {
  start(): Promise<DeploymentDocument>;
  recordGitopsCommit(sha: string): Promise<DeploymentDocument>;
  recordArgoStatus(status: {
    applicationName?: string;
    syncStatus?: ArgoSyncStatus;
    healthStatus?: ArgoHealthStatus;
    lastSyncedAt?: Date;
  }): Promise<DeploymentDocument>;
  markSucceeded(): Promise<DeploymentDocument>;
  markFailed(error: ErrorInfoFields): Promise<DeploymentDocument>;
  cancel(): Promise<DeploymentDocument>;
  isTerminal(): boolean;
}

export type DeploymentVirtuals = { durationMs?: number };

export type DeploymentDocument = HydratedDocument<DeploymentFields, DeploymentDocumentMethods & DeploymentVirtuals>;

export interface DeploymentStatics {
  createFromPlan(input: {
    plan: { get(path: string): unknown; assertApproved(): void; id: unknown };
    user: Types.ObjectId;
    environment: ProjectEnvironment;
    gitops: DeploymentGitops;
  }): Promise<DeploymentDocument>;
}

export type DeploymentBaseModel = Model<DeploymentFields, object, DeploymentDocumentMethods>;
export type DeploymentModel = DeploymentBaseModel & DeploymentStatics;

const DEPLOYMENT_MACHINE = defineStateMachine<DeploymentStatus>({
  PENDING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['SUCCEEDED', 'FAILED', 'CANCELLED'],
  SUCCEEDED: [],
  FAILED: [],
  CANCELLED: [],
});

const deploymentSchema = new Schema<
  DeploymentFields,
  DeploymentBaseModel,
  DeploymentDocumentMethods,
  Record<never, never>,
  DeploymentVirtuals,
  DeploymentStatics,
  DefaultSchemaOptions
>(
  {
    project: { type: Schema.Types.ObjectId, required: true, ref: 'Project' },
    plan: { type: Schema.Types.ObjectId, required: true, ref: 'DeploymentPlan' },
    planVersion: { type: Number, required: true, min: 1 },
    environment: { type: String, required: true, enum: PROJECT_ENVIRONMENTS },
    triggeredBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    status: { type: String, required: true, enum: DEPLOYMENT_STATUSES, default: 'PENDING' },
    gitops: {
      type: {
        repositoryUrl: { type: String, required: true, trim: true, minlength: 1 },
        branch: { type: String, required: true, trim: true, minlength: 1 },
        path: { type: String, required: true, trim: true, minlength: 1 },
        commitSha: { type: String, trim: true },
      },
      required: true,
      _id: false,
    },
    argo: {
      type: {
        applicationName: { type: String, trim: true },
        syncStatus: { type: String, enum: ARGO_SYNC_STATUSES },
        healthStatus: { type: String, enum: ARGO_HEALTH_STATUSES },
        lastSyncedAt: { type: Date },
      },
      required: true,
      default: () => ({}),
      _id: false,
    },
    error: { type: errorInfoSchema, default: undefined },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  baseSchemaOptions(),
);

deploymentSchema.index({ project: 1, createdAt: -1 });
deploymentSchema.index({ plan: 1 });

deploymentSchema.statics.createFromPlan = async function createFromPlan(
  this: DeploymentBaseModel,
  input: {
    plan: { get(path: string): unknown; assertApproved(): void; id: unknown };
    user: Types.ObjectId;
    environment: ProjectEnvironment;
    gitops: DeploymentGitops;
  },
): Promise<DeploymentDocument> {
  input.plan.assertApproved(); // throws unless APPROVED

  const created = new this({
    project: input.plan.get('project') as Types.ObjectId,
    plan: input.plan.id as Types.ObjectId,
    planVersion: input.plan.get('version') as number,
    environment: input.environment,
    triggeredBy: input.user,
    gitops: input.gitops,
  });

  return created.save() as unknown as Promise<DeploymentDocument>;
};

deploymentSchema.methods.start = async function start(
  this: DeploymentDocument,
): Promise<DeploymentDocument> {
  const status = this.get('status') as DeploymentStatus;
  DEPLOYMENT_MACHINE.assertTransition(status, 'IN_PROGRESS');
  this.set('status', 'IN_PROGRESS');
  this.set('startedAt', new Date());

  return this.save() as unknown as Promise<DeploymentDocument>;
};

deploymentSchema.methods.recordGitopsCommit = async function recordGitopsCommit(
  this: DeploymentDocument,
  sha: string,
): Promise<DeploymentDocument> {
  this.set('gitops.commitSha', sha);

  return this.save() as unknown as Promise<DeploymentDocument>;
};

deploymentSchema.methods.recordArgoStatus = async function recordArgoStatus(
  this: DeploymentDocument,
  status: {
    applicationName?: string;
    syncStatus?: ArgoSyncStatus;
    healthStatus?: ArgoHealthStatus;
    lastSyncedAt?: Date;
  },
): Promise<DeploymentDocument> {
  if (status.applicationName !== undefined) {
    this.set('argo.applicationName', status.applicationName);
  }
  if (status.syncStatus !== undefined) {
    this.set('argo.syncStatus', status.syncStatus);
  }
  if (status.healthStatus !== undefined) {
    this.set('argo.healthStatus', status.healthStatus);
  }
  if (status.lastSyncedAt !== undefined) {
    this.set('argo.lastSyncedAt', status.lastSyncedAt);
  }

  return this.save() as unknown as Promise<DeploymentDocument>;
};

deploymentSchema.methods.markSucceeded = async function markSucceeded(
  this: DeploymentDocument,
): Promise<DeploymentDocument> {
  const status = this.get('status') as DeploymentStatus;
  DEPLOYMENT_MACHINE.assertTransition(status, 'SUCCEEDED');
  this.set('status', 'SUCCEEDED');
  this.set('finishedAt', new Date());

  return this.save() as unknown as Promise<DeploymentDocument>;
};

deploymentSchema.methods.markFailed = async function markFailed(
  this: DeploymentDocument,
  error: ErrorInfoFields,
): Promise<DeploymentDocument> {
  const status = this.get('status') as DeploymentStatus;
  DEPLOYMENT_MACHINE.assertTransition(status, 'FAILED');
  this.set('status', 'FAILED');
  this.set('error', error);
  this.set('finishedAt', new Date());

  return this.save() as unknown as Promise<DeploymentDocument>;
};

deploymentSchema.methods.cancel = async function cancel(
  this: DeploymentDocument,
): Promise<DeploymentDocument> {
  const status = this.get('status') as DeploymentStatus;
  DEPLOYMENT_MACHINE.assertTransition(status, 'CANCELLED');
  this.set('status', 'CANCELLED');
  if (this.get('finishedAt') == null) {
    this.set('finishedAt', new Date());
  }

  return this.save() as unknown as Promise<DeploymentDocument>;
};

deploymentSchema.methods.isTerminal = function isTerminal(this: DeploymentDocument): boolean {
  const status = this.get('status') as DeploymentStatus;

  return (
    status === 'SUCCEEDED' ||
    status === 'FAILED' ||
    status === 'CANCELLED'
  );
};

deploymentSchema.virtual('durationMs').get(function durationMsVirtual(this: DeploymentDocument) {
  const startedAt = this.get('startedAt') as Date | null;
  const finishedAt = this.get('finishedAt') as Date | null;
  if (!startedAt || !finishedAt) {
    return undefined;
  }

  return finishedAt.getTime() - startedAt.getTime();
});

export const DEPLOYMENT_MODEL_NAME = 'Deployment' as const;
export const Deployment = mongoose.model(DEPLOYMENT_MODEL_NAME, deploymentSchema);
