import type { createUserService } from '../services/users/user.service.js';

/**
 * User management contract - derived from its factory at ONE source, exposed
 * here because it is consumed by the auth-guard MIDDLEWARE too (middleware
 * must not import services directly, docs/conventions.md "Dependency
 * direction").
 */
export type UserService = ReturnType<typeof createUserService>;
