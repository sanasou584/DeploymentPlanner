
import { z } from 'zod';

import {
  hexIdSchema,
} from '../../shared/validation/request-validation.js';

export const dockerfileParamsSchema = z.strictObject({
  projectId: hexIdSchema,
  analysisId: hexIdSchema,
});

export const generateDockerfilesBodySchema = z.strictObject({
  componentNames: z.array(
    z.string().trim().min(1),
  ).min(1).max(100),
});

export type GenerateDockerfilesBody = z.infer<
  typeof generateDockerfilesBodySchema
>;
