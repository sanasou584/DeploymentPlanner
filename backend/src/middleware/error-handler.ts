import type { NextFunction, Request, Response } from 'express';
import type { Logger } from 'pino';

import { ERROR_STATUS } from './error-status-table.js';

/**
 * Response contract for errors - the ONLY shape used for every non-success
 * response: { "error": { "code": string, "message": string, "details"?: unknown } }
 *
 * Any error with a string `code` present in ERROR_STATUS is understood as a
 * domain error (Phase 2: AppError subclasses) and mapped by the table.
 * Anything else becomes a 500 INTERNAL_ERROR. Stack traces never cross the
 * wire in production; they may surface in `details` only in development.
 */
export function errorHandler(logger: Logger) {
  return (err: unknown, req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
      next(err);
      return;
    }

    const domainCode =
      typeof err === 'object' && err !== null && 'code' in err
        ? (err as { code?: unknown }).code
        : undefined;
    const isKnownCode = typeof domainCode === 'string' && domainCode in ERROR_STATUS;

    let code: string;
    let status: number;
    let message: string;
    let details: unknown;

    if (isKnownCode && domainCode !== 'INTERNAL_ERROR') {
      code = domainCode as string;
      status = ERROR_STATUS[code] ?? 500;
      message =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Unexpected error';
      const errDetails =
        typeof err === 'object' && err !== null && 'details' in err
          ? (err as { details?: unknown }).details
          : undefined;
      details = errDetails === undefined ? undefined : errDetails;
    } else if (err instanceof SyntaxError) {
      // Malformed JSON raised by express.json (http-errors payload).
      code = 'VALIDATION_ERROR';
      status = 400;
      message = 'Malformed JSON payload';
      details = undefined;
    } else {
      code = 'INTERNAL_ERROR';
      status = 500;
      message = 'An unexpected error occurred';
      details = undefined;
    }

    logger.error({ err, method: req.method, url: req.originalUrl }, 'unhandled error');

    if (process.env.NODE_ENV !== 'production' && code === 'INTERNAL_ERROR') {
      details = err instanceof Error ? { stack: err.stack } : { raw: String(err) };
    }

    res.status(status).json({
      error:
        code === 'NOT_FOUND'
          ? { code, message }
          : { code, message, ...(details !== undefined ? { details } : {}) },
    });
  };
}
