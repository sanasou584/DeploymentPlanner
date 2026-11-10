import { z } from 'zod';

import { hexIdSchema } from '../../shared/validation/request-validation.js';

export const aiAuditLaunchParamsSchema = z.strictObject({
  projectId: hexIdSchema,
  analysisId: hexIdSchema,
});

export const aiAuditWorkflowParamsSchema = z.strictObject({
  analysisId: hexIdSchema,
});

export const failAiAuditBodySchema = z.strictObject({
  code: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(1000),
});

export type FailAiAuditBody = z.infer<typeof failAiAuditBodySchema>;
