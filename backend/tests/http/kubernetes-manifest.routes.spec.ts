
import express, {
  type Express,
  type RequestHandler,
} from 'express';

import request from 'supertest';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { UnauthorizedError } from '../../src/domain/errors/index.js';

import { errorHandler } from '../../src/middleware/error-handler.js';

import { createKubernetesManifestRouter } from '../../src/routes/kubernetes-manifest.routes.js';

import { createLogger } from '../../src/shared/logging/logger.js';

import type { KubernetesManifestService } from '../../src/services/kubernetes-manifests/kubernetes-manifest.service.js';

const userId = '507f1f77bcf86cd799439011';
const projectId = '507f191e810c19729de860ea';
const planId = '507f191e810c19729de860eb';

const manifestPath =
  `/api/v1/projects/${projectId}/plans/${planId}/manifests`;

const generate = vi.fn(
  async () => [],
);

const list = vi.fn(
  async () => [],
);

const service = {
  generate,
  list,
} as unknown as KubernetesManifestService;

const requireAuth: RequestHandler = (
  req,
  res,
  next,
) => {
  if (
    req.headers.authorization !== 'Bearer test-token'
  ) {
    next(new UnauthorizedError('Bearer token required'));
    return;
  }

  res.locals.userId = userId;
  next();
};

function createTestApp(): Express {
  const app = express();

  app.use(express.json());

  app.use(
    '/api/v1/projects',
    createKubernetesManifestRouter(
      service,
      requireAuth,
    ),
  );

  app.use(
    errorHandler(createLogger('warn')),
  );

  return app;
}

const app = createTestApp();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Kubernetes Manifest API', () => {
  it('generates manifests with POST', async () => {
    const response = await request(app)
      .post(manifestPath)
      .set('Authorization', 'Bearer test-token')
      .expect(201);

    expect(response.body).toEqual({
      message:
        'Kubernetes manifests generated successfully',
      data: [],
    });

    expect(generate).toHaveBeenCalledWith(
      userId,
      projectId,
      planId,
    );
  });

  it('lists manifests with GET', async () => {
    const response = await request(app)
      .get(manifestPath)
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.body).toEqual({
      message:
        'Kubernetes manifests retrieved successfully',
      data: [],
    });

    expect(list).toHaveBeenCalledWith(
      userId,
      projectId,
      planId,
    );
  });

  it('rejects requests without a token', async () => {
    const response = await request(app)
      .post(manifestPath)
      .expect(401);

    expect(response.body.error.code).toBe(
      'UNAUTHORIZED',
    );

    expect(generate).not.toHaveBeenCalled();
  });

  it('rejects an invalid project ID', async () => {
    const response = await request(app)
      .post(
        `/api/v1/projects/invalid/plans/${planId}/manifests`,
      )
      .set('Authorization', 'Bearer test-token')
      .expect(400);

    expect(response.body.error.code).toBe(
      'VALIDATION_ERROR',
    );

    expect(generate).not.toHaveBeenCalled();
  });

  it('rejects an invalid plan ID', async () => {
    const response = await request(app)
      .get(
        `/api/v1/projects/${projectId}/plans/invalid/manifests`,
      )
      .set('Authorization', 'Bearer test-token')
      .expect(400);

    expect(response.body.error.code).toBe(
      'VALIDATION_ERROR',
    );

    expect(list).not.toHaveBeenCalled();
  });
});