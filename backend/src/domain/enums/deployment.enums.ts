/** Lifecycle of a generated-files rollout (machine: defineStateMachine). */
export const DEPLOYMENT_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
] as const;
export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

/** Argo CD application sync status. */
export const ARGO_SYNC_STATUSES = ['SYNCED', 'OUT_OF_SYNC', 'UNKNOWN'] as const;
export type ArgoSyncStatus = (typeof ARGO_SYNC_STATUSES)[number];

/** Argo CD application health status. */
export const ARGO_HEALTH_STATUSES = [
  'HEALTHY',
  'PROGRESSING',
  'DEGRADED',
  'SUSPENDED',
  'MISSING',
  'UNKNOWN',
] as const;
export type ArgoHealthStatus = (typeof ARGO_HEALTH_STATUSES)[number];
