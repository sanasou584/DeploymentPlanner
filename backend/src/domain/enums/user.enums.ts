/** Role of a platform user (DEVELOPER | ADMIN). */
export const USER_ROLES = ['DEVELOPER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];
