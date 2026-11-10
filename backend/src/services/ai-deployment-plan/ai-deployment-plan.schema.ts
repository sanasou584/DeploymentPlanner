
import { z } from 'zod';

import {
  PLAN_COMPONENT_TYPES,
} from '../../domain/enums/plan.enums.js';

const portSchema = z.number().int().min(1).max(65535);

const targetPortSchema = z.union([
  portSchema,
  z.string().trim().regex(
    /^[a-z]([a-z0-9-]*[a-z0-9])?$/,
  ).max(15),
]);

const quantity = z.string().trim().min(1);

const resourceAmount = z.strictObject({
  cpu: quantity,
  memory: quantity,
});

const resources = z.strictObject({
  requests: resourceAmount,
  limits: resourceAmount,
});

const hpa = z.strictObject({
  enabled: z.boolean(),
  minReplicas: z.number().int().min(1).optional(),
  maxReplicas: z.number().int().min(1).optional(),
  targetCpuUtilizationPercent:
    z.number().int().min(1).max(100).optional(),
  targetMemoryUtilizationPercent:
    z.number().int().min(1).max(100).optional(),
});

const ingress = z.strictObject({
  enabled: z.boolean(),
  host: z.string().trim().min(1).optional(),
  path: z.string().trim().min(1).optional(),
  tls: z.boolean(),
});

export const aiPlanComponentSchema = z.strictObject({
  name: z.string().trim().min(1),
  type: z.enum(PLAN_COMPONENT_TYPES),
  containerPort: portSchema.nullable(),
  servicePort: portSchema.nullable().optional(),
  targetPort: targetPortSchema.nullable().optional(),
  image: z.string().trim().min(1).optional(),
  replicas: z.number().int().min(1).max(100),
  resources,
  hpa,
  ingress,
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

export const aiPlanResultSchema = z.strictObject({
  components: z.array(aiPlanComponentSchema).min(1).max(100),
  assumptions: z.array(
    z.string().trim().min(1).max(500),
  ).max(30),
});

export type AiPlanResult = z.infer<
  typeof aiPlanResultSchema
>;
