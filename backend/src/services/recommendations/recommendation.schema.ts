import { z } from 'zod';

import {
  RECOMMENDATION_SEVERITIES,
  RECOMMENDATION_TYPES,
} from '../../domain/enums/recommendation.enums.js';
import { hexIdSchema } from '../../shared/validation/request-validation.js';

export const analysisRecommendationsParamsSchema = z.strictObject({
  projectId: hexIdSchema,
  analysisId: hexIdSchema,
});

export const recommendationParamsSchema = z.strictObject({
  projectId: hexIdSchema,
  analysisId: hexIdSchema,
  recommendationId: hexIdSchema,
});

export const recommendationWorkflowParamsSchema = z.strictObject({
  analysisId: hexIdSchema,
});

export const rejectRecommendationBodySchema = z.strictObject({
  note: z.string().trim().min(1).max(1000).optional(),
});
const proposedFileSchema = z.strictObject({
  path: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .refine(
      (path) => !path.startsWith('/') && !path.includes('\\') && !path.split('/').includes('..'),
      'Path must be relative to the repository root',
    ),
  content: z.string().min(1).max(20000),
});

const aiRecommendationSchema = z.strictObject({
  type: z.enum(RECOMMENDATION_TYPES),
  severity: z.enum(RECOMMENDATION_SEVERITIES),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  componentName: z.string().trim().min(1).max(200).optional(),
  suggestedValue: z.string().trim().min(1).max(4000).optional(),
  confidence: z.number().min(0).max(1).optional(),
  proposedFile: proposedFileSchema.optional(),
});

export const aiRecommendationsBodySchema = z.strictObject({
  provider: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(100),
  recommendations: z.array(aiRecommendationSchema).max(50),
});

export type AiRecommendationsBody = z.infer<typeof aiRecommendationsBodySchema>;