import type { Request, RequestHandler, Response } from 'express';

export function notFound(): RequestHandler {
  return (req: Request, res: Response): void => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `No route for ${req.method} ${req.originalUrl}`,
      },
    });
  };
}
