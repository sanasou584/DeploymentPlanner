import { z } from 'zod';

// z.strictObject(): zod 4 replacement for the deprecated z.object().strict()
// (see docs/conventions.md, "Zod rules (v4)").
export const registerSchema = z.strictObject({
  name: z.string().trim().min(2).max(100),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
