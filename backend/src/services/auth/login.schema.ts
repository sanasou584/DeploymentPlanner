import { z } from 'zod';

// z.strictObject(): zod 4 replacement for the deprecated z.object().strict()
// (see docs/conventions.md, "Zod rules (v4)").
export const loginSchema = z.strictObject({
  email: z.email().transform((email) => email.toLowerCase()),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
