
import { z } from 'zod';

import {
  PLAN_COMPONENT_TYPES,
} from '../../domain/enums/plan.enums.js';

import {
  hexIdSchema,
} from '../../shared/validation/request-validation.js';

const portSchema = z.number().int().min(1).max(65535);

const targetPortSchema = z.union([
  portSchema,
  z.string().trim().regex(
    /^[a-z]([a-z0-9-]*[a-z0-9])?$/,
  ).max(15),
]);

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
  targetCpuUtilizationPercent:
    z.number().int().min(1).max(100).optional(),
  targetMemoryUtilizationPercent:
    z.number().int().min(1).max(100).optional(),
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
  containerPort: portSchema.nullable(),
  servicePort: portSchema.nullable().optional(),
  targetPort: targetPortSchema.nullable().optional(),
  image: z.string().trim().optional(),
  replicas: z.number().int().min(1),
  resources: resourcesSchema,
  hpa: hpaSchema,
  ingress: ingressSchema,
}).superRefine((component, ctx) => {
  if (
    component.type !== 'WORKER' &&
    component.containerPort === null
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['containerPort'],
      message: 'Non-worker components require a container port',
    });
  }

  if (
    component.containerPort === null &&
    component.ingress.enabled
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['ingress'],
      message: 'Ingress requires a container port',
    });
  }

  if (
    component.containerPort === null &&
    (
      component.servicePort != null ||
      component.targetPort != null
    )
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['servicePort'],
      message: 'Service ports require a container port',
    });
  }
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
  containerPort: portSchema.nullable().optional(),
  servicePort: portSchema.nullable().optional(),
  targetPort: targetPortSchema.nullable().optional(),
  image: z.string().trim().optional(),
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
