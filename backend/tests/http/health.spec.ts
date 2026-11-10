import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/shared/logging/logger.js';
import {
  connectTestingModule,
  disconnectTestingModule,
  stopMemoryServer,
} from '../integration/test-database.js';

let app: Express;

beforeAll(async () => {
  await connectTestingModule('health_endpoint_test');
  app = createApp(createLogger('warn'));
});

afterAll(async () => {
  await disconnectTestingModule();
  await stopMemoryServer();
});

describe('GET /health', () => {
  it('returns 200 with ok status and the live DB connection state', async () => {
    const res = await request(app).get('/health').expect(200);

    expect(res.body).toEqual({
      status: 'ok',
      db: 'connected',
    });
  });
});

describe('unknown routes', () => {
  it('responds 404 with the error contract shape', async () => {
    const res = await request(app).get('/api/v1/nope').expect(404);

    expect(res.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('/api/v1/nope'),
      },
    });
  });

  it('never leaks a stack trace in the 404 payload', async () => {
    const res = await request(app).delete('/health');

    expect(JSON.stringify(res.body)).not.toContain('stack');
  });
});

describe('malformed JSON', () => {
  it('rejects bad payloads with a 400 validation error under the contract', async () => {
    const res = await request(app)
      .post('/api/v1/anything')
      .set('Content-Type', 'application/json')
      .send('{"broken')
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
