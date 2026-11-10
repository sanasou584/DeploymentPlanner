/** What happened (covers user management, project lifecycle, analysis, plan decisions, generation, deployment and system errors). */
export const AUDIT_ACTIONS = [
  'USER_CREATED',
  'USER_UPDATED',
  'USER_ROLE_CHANGED',
  'USER_DEACTIVATED',
  'USER_REACTIVATED',
  'PROJECT_CREATED',
  'PROJECT_UPDATED',
  'PROJECT_DELETED',
  'ANALYSIS_REQUESTED',
  'ANALYSIS_COMPLETED',
  'ANALYSIS_FAILED',
  'RECOMMENDATIONS_GENERATED',
  'RECOMMENDATION_ACCEPTED',
  'RECOMMENDATION_REJECTED',
  'AI_AUDIT_REQUESTED',
  'AI_AUDIT_FAILED',
  'PLAN_CREATED',
  'PLAN_UPDATED',
  'PLAN_APPROVED',
  'PLAN_REJECTED',
  'FILES_GENERATED',
  'DEPLOYMENT_STARTED',
  'DEPLOYMENT_SUCCEEDED',
  'DEPLOYMENT_FAILED',
  'SYSTEM_ERROR',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Log level - ERROR entries power the admin "view errors" feature. */
export const AUDIT_LEVELS = ['INFO', 'WARN', 'ERROR'] as const;
export type AuditLevel = (typeof AUDIT_LEVELS)[number];
