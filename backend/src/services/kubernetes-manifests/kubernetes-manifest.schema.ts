
import { z } from 'zod';
import { hexIdSchema } from '../../shared/validation/request-validation.js';

export const manifestParamsSchema = z.strictObject({
  projectId: hexIdSchema,
  planId: hexIdSchema,
});
