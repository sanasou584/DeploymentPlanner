import { AppError } from './app-error.js';

/** Thrown when a requested document (or a populated relation) does not exist. */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super('NOT_FOUND', message, details);
  }
}

/** Thrown on uniqueness violations that allocate names/versions outside a query/transaction, and other collisions. */
export class ConflictError extends AppError {
  constructor(message = 'Conflicting state', details?: unknown) {
    super('CONFLICT', message, details);
  }
}

/** Thrown when an authenticated actor is not allowed to perform the action. */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: unknown) {
    super('FORBIDDEN', message, details);
  }
}

/** Thrown when authentication is missing or invalid. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: unknown) {
    super('UNAUTHORIZED', message, details);
  }
}

/** Thrown by state machines when a status transition is not allowed. */
export class InvalidStateTransitionError extends AppError {
  constructor(from: string, to: string, details?: unknown) {
    super(
      'INVALID_STATE_TRANSITION',
      `Invalid state transition: cannot move from "${from}" to "${to}"`,
      details ?? { from, to },
    );
  }
}

/** Thrown when a single-document invariant of a rich model is violated. */
export class InvariantViolationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('INVARIANT_VIOLATION', message, details);
  }
}

/** Thrown when a soft-deleted (deactivated) account tries to authenticate. */
export class AccountDisabledError extends AppError {
  constructor(message = 'This account is deactivated', details?: unknown) {
    super('ACCOUNT_DISABLED', message, details);
  }
}
