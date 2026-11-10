
import { z } from 'zod';

import { PLAN_COMPONENT_TYPES } from '../../domain/enums/plan.enums.js';
import { hexIdSchema } from '../../shared/validation/request-validation.js';

const resourceAmountSchema = z.strictObject({
  cpu: z.string().trim().min(1),
  memory: z.string().trim().min(1),
});

const resourcesSchema = z.strictObject({
  requests: resourceAmountSchema,
  limits: resourceAmountSchema,
});

const hpaSchema = z.strictObject({
  enabled: z.boolean(),
  minReplicas: z.number().int().min(1).optional(),
  maxReplicas: z.number().int().min(1).optional(),
  targetCpuUtilizationPercent: z.number().int().min(1).max(100).optional(),
  targetMemoryUtilizationPercent: z.number().int().min(1).max(100).optional(),
});

const ingressSchema = z.strictObject({
  enabled: z.boolean(),
  host: z.string().trim().min(1).optional(),
  path: z.string().trim().min(1).optional(),
  tls: z.boolean(),
});

const componentSchema = z.strictObject({
  name: z.string().trim().min(1),
  type: z.enum(PLAN_COMPONENT_TYPES),
  containerPort: z.number().int().min(1).max(65535),
  image: z.string().trim().min(1).optional(),
  replicas: z.number().int().min(1),
  resources: resourcesSchema,
  hpa: hpaSchema,
  ingress: ingressSchema,
});

export const projectPlansParamsSchema = z.strictObject({
  projectId: hexIdSchema,
});

export const planParamsSchema = z.strictObject({
  projectId: hexIdSchema,
  planId: hexIdSchema,
});

export const planComponentParamsSchema = z.strictObject({
  projectId: hexIdSchema,
  planId: hexIdSchema,
  name: z.string().trim().min(1),
});

export const createPlanBodySchema = z.strictObject({
  analysisId: hexIdSchema,
  components: z.array(componentSchema).min(1).max(100),
});

export const updatePlanComponentBodySchema = z.strictObject({
  type: z.enum(PLAN_COMPONENT_TYPES).optional(),
  containerPort: z.number().int().min(1).max(65535).optional(),
  image: z.string().trim().min(1).optional(),
  replicas: z.number().int().min(1).optional(),
  resources: resourcesSchema.optional(),
  hpa: hpaSchema.optional(),
  ingress: ingressSchema.optional(),
}).refine(
  (input) => Object.keys(input).length > 0,
  'At least one component field must be provided',
);

export const rejectPlanBodySchema = z.strictObject({
  reason: z.string().trim().min(1).max(1000),
});

export type CreatePlanBody = z.infer<
  typeof createPlanBodySchema
>;

export type UpdatePlanComponentBody = z.infer<
  typeof updatePlanComponentBodySchema
>;
