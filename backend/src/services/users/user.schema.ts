
import { z } from 'zod';

import { USER_ROLES } from '../../domain/enums/user.enums.js';
import { hexIdSchema } from '../../shared/validation/request-validation.js';

export const userIdSchema = z.object({
  id: hexIdSchema,
});

export const searchUsersSchema = z.object({
  q: z.string().trim().max(100).optional(),

  role: z.enum(USER_ROLES).optional(),

  includeDeleted: z.enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int()
    .min(1).max(100).default(20),
});

export const updateUserSchema = z.strictObject({
  name: z.string().trim().min(2).max(100),
});

export const changeRoleSchema = z.strictObject({
  role: z.enum(USER_ROLES),
});

export type SearchUsersInput =
  z.infer<typeof searchUsersSchema>;

export type UpdateUserInput =
  z.infer<typeof updateUserSchema>;

export type ChangeRoleInput =
  z.infer<typeof changeRoleSchema>;
