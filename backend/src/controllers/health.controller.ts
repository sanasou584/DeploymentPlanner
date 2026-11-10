import type { Request, Response } from 'express';

/**
 * Operational endpoint./controllers must not import config directly, so the
 * DB status getter is INJECTED from the route (routes -> config is legal).
 * This stays the ONLY operational controller; documented in docs/conventions.md.
 */
export function wireHealth(dbStatus: () => unknown): RequestHandler {
  return function getHealth(_req: Request, res: Response): void {
    res.status(200).json({
      status: 'ok',
      db: dbStatus(),
    });
  };
}

type RequestHandler = (req: Request, res: Response) => void;
