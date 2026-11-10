import { timingSafeEqual } from 'node:crypto';

import type { RequestHandler } from 'express';

import { INTERNAL_SECRET_HEADER } from '../shared/security/internal-auth.js';

export function createRequireInternalSecret(secret: string): RequestHandler {
  const expected = Buffer.from(secret);

  return (req, res, next) => {
    const received = Buffer.from(req.header(INTERNAL_SECRET_HEADER) ?? '');
    const isValid = received.length === expected.length && timingSafeEqual(received, expected);

    if (!isValid) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid internal secret' },
      });
      return;
    }

    next();
  };
}