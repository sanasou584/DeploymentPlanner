import type { Express } from 'express';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import { getEnv } from './config/env.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogging } from './middleware/request-logging.js';

// ONLY routes: routes/index.ts is THE composition root — every feature
// wires itself there (see docs/conventions.md, "Composition").
import { healthRouter } from './routes/health.routes.js';
import { createApiRouter } from './routes/index.js';

// Runtime-documentation module: lives under src/ so `npm run build` keeps a
// src rootDir (see tsconfig.build.json); docs/ is for Markdown, not compiled TS.
import { swaggerDocument } from './swagger.js';

/**
 * App factory: assembles middleware and routes WITHOUT listening and WITHOUT
 * touching the database, so tests can import it freely (see tests/http).
 * Only server.ts (and nothing else) listens and connects.
 */
export function createApp(logger: Logger): Express {
  const env = getEnv();
  const app: Express = express();

  app.disable('x-powered-by');

  app.use(requestLogging(logger));
  app.use(helmet());

  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser(env.sessionSecret));

  // API (composition lives in routes/index.ts)
  app.use('/api/v1', createApiRouter());

  // Health
  app.use(healthRouter);

  // Swagger
  if (env.nodeEnv === 'development') {
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument),
    );
  }

  // Toujours en dernier
  app.use(notFound());
  app.use(errorHandler(logger));

  return app;
}
