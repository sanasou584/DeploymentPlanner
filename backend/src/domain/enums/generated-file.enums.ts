/** Kind of generated artifact (Dockerfile, K8s manifests, GitHub Actions workflow). */
export const GENERATED_FILE_KINDS = [
  'DOCKERFILE',
  'DOCKER_COMPOSE',
  'K8S_DEPLOYMENT',
  'K8S_SERVICE',
  'K8S_INGRESS',
  'K8S_HPA',
  'K8S_CONFIGMAP',
  'GITHUB_WORKFLOW',
] as const;
export type GeneratedFileKind = (typeof GENERATED_FILE_KINDS)[number];

/** Validation pipeline status of a generated file. */
export const GENERATED_FILE_VALIDATION_STATUSES = ['PENDING', 'VALID', 'INVALID'] as const;
export type GeneratedFileValidationStatus = (typeof GENERATED_FILE_VALIDATION_STATUSES)[number];
