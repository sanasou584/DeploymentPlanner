/**
 * THE single table mapping error codes to HTTP statuses.
 * Domain errors (Phase 2) carry a `code`; the central error handler resolves
 * the status HERE and nowhere else. Adding a domain error class means adding
 * one row to this table - and nothing else.
 */
export const ERROR_STATUS: Readonly<Record<string, number>> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  ACCOUNT_DISABLED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_STATE_TRANSITION: 409,
  INVARIANT_VIOLATION: 422,
  INTERNAL_ERROR: 500,
};
