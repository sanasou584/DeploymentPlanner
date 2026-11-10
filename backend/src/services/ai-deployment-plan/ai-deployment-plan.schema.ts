
import { z } from 'zod';

import { PLAN_COMPONENT_TYPES } from '../../domain/enums/plan.enums.js';

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
  targetCpuUtilizationPercent: z.number().int().min(1).max(100).optional(),
  targetMemoryUtilizationPercent: z.number().int().min(1).max(100).optional(),
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
  containerPort: z.number().int().min(1).max(65535).nullable(),
  image: z.string().trim().min(1).optional(),
  replicas: z.number().int().min(1).max(100),
  resources,
  hpa,
  ingress,
  servicePort: z.number().int().min(1).max(65535).nullable().optional(),
  targetPort: z.union([
    z.number().int().min(1).max(65535),
    z.string().trim().min(1),
  ]).nullable().optional(),
});

export const aiPlanResultSchema = z.strictObject({

  components: z.array(aiPlanComponentSchema).min(1).max(100),
  assumptions: z.array(z.string().trim().min(1).max(500)).max(30),
});

export type AiPlanResult = z.infer<typeof aiPlanResultSchema>;
