
import { z } from 'zod';

import {
  ANALYZED_COMPONENT_TYPES,
  DOCKER_FINDING_SEVERITIES,
  TECHNOLOGY_CATEGORIES,
} from '../../domain/enums/analysis.enums.js';

import {
  hexIdSchema,
} from '../../shared/validation/request-validation.js';

export const projectAnalysesParamsSchema = z.strictObject({
  projectId: hexIdSchema,
});

export const analysisParamsSchema = z.strictObject({
  projectId: hexIdSchema,
  analysisId: hexIdSchema,
});

export const workflowAnalysisParamsSchema = z.strictObject({
  analysisId: hexIdSchema,
});

export const listAnalysesQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const technologySchema = z.strictObject({
  name: z.string().trim().min(1),
  version: z.string().trim().min(1).optional(),
  category: z.enum(TECHNOLOGY_CATEGORIES),
  sourceFile: z.string().trim().min(1).optional(),
});

const kubernetesQuantitySchema = z.strictObject({
  cpu: z.string().trim().min(1).nullable(),
  memory: z.string().trim().min(1).nullable(),
});

const kubernetesResourcesSchema = z.strictObject({
  requests: kubernetesQuantitySchema,
  limits: kubernetesQuantitySchema,
});
const portEvidenceSchema = z.strictObject({
  sourceFile: z.string().trim().min(1),
  origin: z.enum([
    'KUBERNETES_MANIFEST',
    'SOURCE_CODE',
    'FRAMEWORK_CONFIG',
    'DOCKERFILE',
    'ENV_EXAMPLE',
  ]),
  confidence: z.enum([
    'HIGH',
    'MEDIUM',
    'LOW',
  ]),
  requiresReview: z.boolean(),
  line: z.number().int().min(1).optional(),
});
const kubernetesEvidenceSchema = z.strictObject({
  containerPort: z
    .number()
    .int()
    .min(1)
    .max(65535)
    .nullable(),

  servicePort: z
    .number()
    .int()
    .min(1)
    .max(65535)
    .nullable(),

  targetPort: z
    .union([
      z.number().int().min(1).max(65535),
      z.string().trim().min(1),
    ])
    .nullable(),

  image: z.string().trim().min(1).nullable(),

  resources: kubernetesResourcesSchema.nullable(),

  manifestPaths: z
    .array(z.string().trim().min(1))
    .max(100),

    requiresReview: z.boolean(),
  portEvidence: portEvidenceSchema.optional(),
});

const componentSchema = z.strictObject({
  name: z.string().trim().min(1),
  type: z.enum(ANALYZED_COMPONENT_TYPES),
  rootPath: z.string().trim().min(1),
  kubernetes: kubernetesEvidenceSchema.optional(),
});

const dockerFindingSchema = z.strictObject({
  ruleId: z.string().trim().min(1),
  severity: z.enum(DOCKER_FINDING_SEVERITIES),
  message: z.string().trim().min(1),
  file: z.string().trim().min(1).optional(),
  line: z.number().int().min(1).optional(),
});

const dockerSchema = z.strictObject({
  hasDockerfile: z.boolean(),
  hasCompose: z.boolean(),
  findings: z.array(dockerFindingSchema).max(500),
});

export const completeAnalysisBodySchema = z.strictObject({
  detectedFiles: z
    .array(z.string().trim().min(1))
    .max(500)
    .optional(),

  technologies: z
    .array(technologySchema)
    .max(200)
    .optional(),

  components: z
    .array(componentSchema)
    .max(100)
    .optional(),

  docker: dockerSchema.optional(),
});

export const failAnalysisBodySchema = z.strictObject({
  code: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(1000),
});

export type ListAnalysesQuery = z.infer<
  typeof listAnalysesQuerySchema
>;

export type CompleteAnalysisBody = z.infer<
  typeof completeAnalysisBodySchema
>;

export type FailAnalysisBody = z.infer<
  typeof failAnalysisBodySchema
>;
