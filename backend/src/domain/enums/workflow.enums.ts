/** What a n8n workflow execution operates on (subject uses refPath polymorphism). */
export const WORKFLOW_SUBJECT_TYPES = ['ANALYSIS', 'PLAN', 'DEPLOYMENT'] as const;
export type WorkflowSubjectType = (typeof WORKFLOW_SUBJECT_TYPES)[number];

/** Lifecycle of a workflow run (machine: defineStateMachine). */
export const WORKFLOW_RUN_STATUSES = ['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED'] as const;
export type WorkflowRunStatus = (typeof WORKFLOW_RUN_STATUSES)[number];
