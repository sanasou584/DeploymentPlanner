/** Lifecycle of a deployment plan (machine: defineStateMachine).
 * DRAFT -> APPROVED | REJECTED; APPROVED -> SUPERSEDED. */
export const PLAN_STATUSES = ['DRAFT', 'APPROVED', 'REJECTED', 'SUPERSEDED'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

/** Component type in a plan (the deployable part of the analyzed app). */
export const PLAN_COMPONENT_TYPES = ['FRONTEND', 'BACKEND', 'DATABASE', 'WORKER', 'OTHER'] as const;
export type PlanComponentType = (typeof PLAN_COMPONENT_TYPES)[number];
