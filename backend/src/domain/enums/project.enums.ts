/** Deployment environment a project targets (defaults to DEVELOPMENT). */
export const PROJECT_ENVIRONMENTS = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'] as const;
export type ProjectEnvironment = (typeof PROJECT_ENVIRONMENTS)[number];

/** Lifecycle status of a Project (rich-model governance, Phase 3). */
export const PROJECT_REPOSITORY_PROVIDERS = ['github'] as const;
export type RepositoryProvider = (typeof PROJECT_REPOSITORY_PROVIDERS)[number];
