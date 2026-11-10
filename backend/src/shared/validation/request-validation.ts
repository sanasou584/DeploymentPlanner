import { z } from 'zod';

import { AppError } from '../../domain/errors/index.js';

/**
 * THE id shape shared by every domain entity (users, projects...): a Mongo
 * ObjectId as a 24-hex-char string. Layer-level schemas COMPOSE it — never
 * re-declare the regex (docs/conventions.md, "Shared helpers").
 */
export const hexIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier');

/**
 * THE one parse-or-throw helper for request data (body / query / params).
 * Every controller validates through it — inline `safeParse` + AppError
 * blocks in controllers are banned (docs/conventions.md, "Shared helpers").
 */
export function parseOrThrow<T>(
  schema: z.ZodType<T>,
  value: unknown,
  message = 'Invalid request data',
): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    // z.flattenError(): zod 4 replacement for the deprecated
    // result.error.flatten() (see docs/conventions.md, "Zod rules (v4)").
    throw new AppError('VALIDATION_ERROR', message, z.flattenError(result.error));
  }

  return result.data;
}
