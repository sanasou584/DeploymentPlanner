/** Lifecycle of a repo analysis request (machine: defineStateMachine). */
export const ANALYSIS_STATUSES = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'] as const;
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

/** What a detected technology is. */
export const TECHNOLOGY_CATEGORIES = [
  'LANGUAGE',
  'FRAMEWORK',
  'LIBRARY',
  'DATABASE',
  'BUILD_TOOL',
  'RUNTIME',
  'OTHER',
] as const;
export type TechnologyCategory = (typeof TECHNOLOGY_CATEGORIES)[number];

/** Deployable part of the ANALYZED application. */
export const ANALYZED_COMPONENT_TYPES = [
  'FRONTEND',
  'BACKEND',
  'DATABASE',
  'WORKER',
  'OTHER',
] as const;
export type AnalysisComponentType = (typeof ANALYZED_COMPONENT_TYPES)[number];

/** Severity of a Docker good-practice finding. */
export const DOCKER_FINDING_SEVERITIES = ['INFO', 'WARNING', 'ERROR'] as const;
export type DockerFindingSeverity = (typeof DOCKER_FINDING_SEVERITIES)[number];
