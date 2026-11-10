import {
  Schema,
  default as mongoose,
  type DefaultSchemaOptions,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

import {
  WORKFLOW_SUBJECT_TYPES,
  WORKFLOW_RUN_STATUSES,
  type WorkflowSubjectType,
  type WorkflowRunStatus,
} from '../../domain/enums/workflow.enums.js';
import { defineStateMachine } from '../../domain/state-machine/define-state-machine.js';
import { errorInfoSchema, type ErrorInfoFields } from '../value-objects/error-info.schema.js';
import { baseSchemaOptions } from '../plugins/base-schema-options.js';

/**
 * WorkflowRun - lean audit/ops record of an external execution (GitHub
 * Actions / CI) for an ANALYSIS, a PLAN or a DEPLOYMENT via refPath on
 * subject.id. State machine like the other run models.
 */

export interface WorkflowSubject {
  type: WorkflowSubjectType;
  id: Types.ObjectId;
}

export interface WorkflowRunFields {
  workflowName: string;
  subject: WorkflowSubject;
  status: WorkflowRunStatus;
  externalExecutionId?: string;
  triggeredBy?: Types.ObjectId;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  error?: ErrorInfoFields;
}

export interface WorkflowRunMethods {
  start(): Promise<WorkflowRunDocument>;
  succeed(): Promise<WorkflowRunDocument>;
  fail(error: ErrorInfoFields): Promise<WorkflowRunDocument>;
}

export type WorkflowRunDocument = HydratedDocument<WorkflowRunFields, WorkflowRunMethods>;

export type WorkflowRunModel = Model<WorkflowRunFields, object, WorkflowRunMethods>;

const WORKFLOW_RUN_MACHINE = defineStateMachine<WorkflowRunStatus>({
  PENDING: ['RUNNING', 'FAILED'],
  RUNNING: ['SUCCEEDED', 'FAILED'],
  SUCCEEDED: [],
  FAILED: [],
});

const subjectSchema = new Schema<WorkflowSubject>(
  {
    type: { type: String, required: true, enum: WORKFLOW_SUBJECT_TYPES },
    id: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'subject.type',
    },
  },
  { _id: false },
);

const workflowRunSchema = new Schema<
  WorkflowRunFields,
  WorkflowRunModel,
  WorkflowRunMethods,
  Record<never, never>,
  Record<never, never>,
  Record<never, never>,
  DefaultSchemaOptions
>(
  {
    workflowName: { type: String, required: true, trim: true, minlength: 1 },
    subject: { type: subjectSchema, required: true },
    status: { type: String, required: true, enum: WORKFLOW_RUN_STATUSES, default: 'PENDING' },
    externalExecutionId: { type: String, trim: true, minlength: 1 },
    triggeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    error: { type: errorInfoSchema, default: undefined },
  },
  baseSchemaOptions(),
);

workflowRunSchema.index({ workflowName: 1, createdAt: -1 });

workflowRunSchema.methods.start = async function start(
  this: WorkflowRunDocument,
): Promise<WorkflowRunDocument> {
  const status = this.get('status') as WorkflowRunStatus;
  WORKFLOW_RUN_MACHINE.assertTransition(status, 'RUNNING');
  this.set('status', 'RUNNING');
  this.set('startedAt', new Date());

  return this.save() as unknown as Promise<WorkflowRunDocument>;
};

workflowRunSchema.methods.succeed = async function succeed(
  this: WorkflowRunDocument,
): Promise<WorkflowRunDocument> {
  const status = this.get('status') as WorkflowRunStatus;
  WORKFLOW_RUN_MACHINE.assertTransition(status, 'SUCCEEDED');
  this.set('status', 'SUCCEEDED');
  this.set('finishedAt', new Date());

  return this.save() as unknown as Promise<WorkflowRunDocument>;
};

workflowRunSchema.methods.fail = async function fail(
  this: WorkflowRunDocument,
  error: ErrorInfoFields,
): Promise<WorkflowRunDocument> {
  const status = this.get('status') as WorkflowRunStatus;
  WORKFLOW_RUN_MACHINE.assertTransition(status, 'FAILED');
  this.set('status', 'FAILED');
  this.set('error', error);
  this.set('finishedAt', new Date());

  return this.save() as unknown as Promise<WorkflowRunDocument>;
};

export const WORKFLOW_RUN_MODEL_NAME = 'WorkflowRun' as const;
export const WorkflowRun = mongoose.model(WORKFLOW_RUN_MODEL_NAME, workflowRunSchema);
