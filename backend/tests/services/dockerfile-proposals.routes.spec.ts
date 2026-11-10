
import express, {
  type RequestHandler,
} from 'express';

import request from 'supertest';

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  UnauthorizedError,
} from '../../src/domain/errors/index.js';

import {
  errorHandler,
} from '../../src/middleware/error-handler.js';

import {
  createDockerfileProposalsRouter,
} from '../../src/routes/dockerfile-proposals.routes.js';

import {
  createLogger,
} from '../../src/shared/logging/logger.js';

import type {
  DockerfileProposalService,
} from '../../src/services/dockerfile-proposals/dockerfile-proposals.service.js';

const projectId = '507f191e810c19729de860ea';
const analysisId = '507f191e810c19729de860eb';

const path =
  `/api/v1/projects/${projectId}/analyses/${analysisId}/dockerfiles`;

const inspect = vi.fn(async () => ({
  candidates: [],
  generated: [],
}));

const generate = vi.fn(async () => []);

const service = {
  inspect,
  generate,
} as unknown as DockerfileProposalService;

const requireAuth: RequestHandler = (
  req,
  res,
  next,
) => {
  if (
    req.headers.authorization !== 'Bearer test-token'
  ) {
    next(
      new UnauthorizedError('Bearer token required'),
    );
    return;
  }

  res.locals.userId = '507f1f77bcf86cd799439011';
  next();
};

function createApp() {
  const app = express();

  app.use(express.json());

  app.use(
    '/api/v1/projects',
    createDockerfileProposalsRouter(
      service,
      requireAuth,
    ),
  );

  app.use(
    errorHandler(createLogger('warn')),
  );

  return app;
}

const app = createApp();

describe('Dockerfile proposal HTTP routes', () => {
  it('requires authentication', async () => {
    await request(app)
      .get(path)
      .expect(401);

    expect(inspect).not.toHaveBeenCalled();
  });

  it('inspects a completed analysis', async () => {
    const response = await request(app)
      .get(path)
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.body.data.candidates).toEqual([]);

    expect(inspect).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      projectId,
      analysisId,
    );
  });

  it('validates the POST body', async () => {
    const response = await request(app)
      .post(path)
      .set('Authorization', 'Bearer test-token')
      .send({ componentNames: [] })
      .expect(400);

    expect(response.body.error.code).toBe(
      'VALIDATION_ERROR',
    );

    expect(generate).not.toHaveBeenCalled();
  });

  it('generates one selected proposal', async () => {
    const response = await request(app)
      .post(path)
      .set('Authorization', 'Bearer test-token')
      .send({ componentNames: ['api'] })
      .expect(201);

    expect(response.body.data).toEqual([]);

    expect(generate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      projectId,
      analysisId,
      { componentNames: ['api'] },
    );
  });
});
