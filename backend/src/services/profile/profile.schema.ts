import { z } from 'zod';

const NAME_MIN = 2;
const NAME_MAX = 100;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const AVATAR_URL_MAX = 2048;

const nameSchema = z.string().trim().min(NAME_MIN).max(NAME_MAX);

const avatarUrlSchema = z.url({ protocol: /^https$/ }).max(AVATAR_URL_MAX);

export const updateProfileSchema = z
  .strictObject({
    name: nameSchema.optional(),
    avatarUrl: avatarUrlSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const changePasswordSchema = z
  .strictObject({
    currentPassword: z.string().min(1).max(PASSWORD_MAX),
    newPassword: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;