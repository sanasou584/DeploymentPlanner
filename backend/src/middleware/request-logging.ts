import type { NextFunction, Request, Response } from 'express';
import type { Logger } from 'pino';

export function requestLogging(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const meta = {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      };
      if (res.statusCode >= 500) {
        logger.error(meta, 'http request');
      } else if (res.statusCode >= 400) {
        logger.warn(meta, 'http request');
      } else {
        logger.info(meta, 'http request');
      }
    });

    next();
  };
}
