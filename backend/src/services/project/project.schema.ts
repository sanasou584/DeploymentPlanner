import { z } from 'zod';

import { PROJECT_ENVIRONMENTS } from '../../domain/enums/project.enums.js';
import { hexIdSchema } from '../../shared/validation/request-validation.js';

// Same bounds as the Project model (NAME_MAX / DESCRIPTION_MAX).
const name = z.string().trim().min(1).max(120);
const description = z.string().trim().max(1000);

// z.strictObject(): zod 4 replacement for the deprecated z.object().strict()
// (see docs/conventions.md, "Zod rules (v4)").
export const createProjectSchema = z.strictObject({
  name,
  description: description.optional(),
  environment: z.enum(PROJECT_ENVIRONMENTS).optional(),
});

export const updateProjectSchema = z
  .strictObject({
    name: name.optional(),
    description: description.optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.description !== undefined,
    { message: 'At least one field is required' },
  );

// Mongo ObjectId as a 24-char hex string: rejects bad ids with a 400
// instead of letting Mongoose throw a CastError (500). Composed from the
// shared schema - the regex lives in ONE place (docs/conventions.md,
// "Shared helpers").
export const projectIdSchema = hexIdSchema;

// List pagination for GET /projects - same defaults as the admin users list.
export const listProjectsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const availabilityQuerySchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsInput = z.infer<typeof listProjectsSchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;