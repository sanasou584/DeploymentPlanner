/**
 * Error envelope of every non-success backend response
 * (backend/src/middleware/error-handler.ts): { error: { code, message, details? } }.
 */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}
