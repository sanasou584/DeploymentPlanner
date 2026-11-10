import { describe, expect, it } from 'vitest';

import {
  AccountDisabledError,
  AppError,
  ConflictError,
  ForbiddenError,
  InvariantViolationError,
  InvalidStateTransitionError,
  NotFoundError,
  UnauthorizedError,
} from '../../../src/domain/errors/index.js';

describe('AppError base', () => {
  it('carries code, message and optional details', () => {
    const err = new AppError('SOME_CODE', 'boom', { a: 1 });

    expect(err.code).toBe('SOME_CODE');
    expect(err.message).toBe('boom');
    expect(err.details).toEqual({ a: 1 });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AppError');
  });

  it('omits details when they are not provided', () => {
    const err = new AppError('SOME_CODE', 'boom');

    expect(err.details).toBeUndefined();
  });
});

describe('domain error subclasses', () => {
  it('maps each subclass to its stable code', () => {
    expect(new NotFoundError().code).toBe('NOT_FOUND');
    expect(new ConflictError().code).toBe('CONFLICT');
    expect(new ForbiddenError().code).toBe('FORBIDDEN');
    expect(new UnauthorizedError().code).toBe('UNAUTHORIZED');
    expect(new InvalidStateTransitionError('DRAFT', 'SUPERSEDED').code).toBe(
      'INVALID_STATE_TRANSITION',
    );
    expect(new InvariantViolationError('bad').code).toBe('INVARIANT_VIOLATION');
    expect(new AccountDisabledError().code).toBe('ACCOUNT_DISABLED');
  });

  it('all are AppError instances and never plain Error-only', () => {
    const all = [
      new NotFoundError(),
      new ConflictError(),
      new ForbiddenError(),
      new UnauthorizedError(),
      new InvalidStateTransitionError('a', 'b'),
      new InvariantViolationError('x'),
      new AccountDisabledError(),
    ];

    for (const err of all) {
      expect(err).toBeInstanceOf(AppError);
    }
  });

  it('InvalidStateTransitionError describes from/to', () => {
    const err = new InvalidStateTransitionError('PENDING', 'SUCCEEDED');

    expect(err.message).toContain('PENDING');
    expect(err.message).toContain('SUCCEEDED');
    expect(err.details).toEqual({ from: 'PENDING', to: 'SUCCEEDED' });
  });
});
