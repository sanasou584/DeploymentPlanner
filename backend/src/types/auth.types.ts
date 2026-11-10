/**
 * Shared DTO shape of an authenticated user — reused across layers (auth
 * endpoints return it, future user-scoped endpoints will too). Module-local
 * shapes do NOT belong here: derive them with ReturnType in their module.
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}
