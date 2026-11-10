/**
 * Base class for every error the domain and the models throw.
 *
 * Rules:
 * - `code` is a stable string contract key listed in the HTTP mapping table
 *   (src/middleware/error-status-table.ts). The central error handler maps
 *   code -> HTTP status. Domain code must NEVER be an HTTP status number.
 * - `details` carries structured, safe-to-serialize context (e.g. field
 *   violations). Nothing secret may be put in details.
 * - No layer below the error handler constructs HTTP responses itself.
 */
export class AppError extends Error {
  readonly code: string;

  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
    Error.captureStackTrace?.(this, new.target);
  }
}
