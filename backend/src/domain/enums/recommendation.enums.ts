/** What an AI recommendation is about. */
export const RECOMMENDATION_TYPES = [
  'REPLICAS',
  'CPU',
  'MEMORY',
  'HPA',
  'INGRESS',
  'DOCKER',
  'SECURITY',
  'GENERAL',
] as const;
export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];

/** How critical a recommendation is. */
export const RECOMMENDATION_SEVERITIES = ['INFO', 'WARNING', 'CRITICAL'] as const;
export type RecommendationSeverity = (typeof RECOMMENDATION_SEVERITIES)[number];

/** Decision status: PENDING until the developer (human) accepts or rejects it. */
export const RECOMMENDATION_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED'] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];
