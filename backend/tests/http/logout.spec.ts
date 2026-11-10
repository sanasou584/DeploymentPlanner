import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/shared/logging/logger.js';
import { User } from '../../src/models/entities/index.js';
import {
  connectTestingModule,
  disconnectTestingModule,
  stopMemoryServer,
} from '../integration/test-database.js';

const MEMBER = {
  name: 'Logout Member',
  email: 'logout-member@example.com',
  password: 'strong-pass-1',
};

let app: Express;

async function login(user: typeof MEMBER): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: user.password });

  expect(res.status).toBe(200);
  return res.body.accessToken as string;
}

beforeAll(async () => {
  await connectTestingModule('http_logout_test');
  app = createApp(createLogger('warn'));

  await request(app).post('/api/v1/auth/register').send(MEMBER);

  const member = await User.findOne({ email: MEMBER.email });
  if (!member) throw new Error('member seed missing');
  await member.approve();
});

afterAll(async () => {
  await disconnectTestingModule();
  await stopMemoryServer();
});

describe('POST /auth/logout (token denial)', () => {
  it('revokes the presented token server-side: 200, logout, 401', async () => {
    const token = await login(MEMBER);
    const bearer = { Authorization: `Bearer ${token}` };

    await request(app)
      .get('/api/v1/projects')
      .set(bearer)
      .expect(200);

    const logoutResponse = await request(app)
      .post('/api/v1/auth/logout')
      .set(bearer);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.message).toBe('Logged out successfully');

    await request(app)
      .get('/api/v1/projects')
      .set(bearer)
      .expect(401);
  });

  it('refuses to log out without a valid bearer token', async () => {
    const noToken = await request(app).post('/api/v1/auth/logout');
    expect(noToken.status).toBe(401);
    expect(noToken.body).toMatchObject({ error: { code: 'UNAUTHORIZED' } });

    const forged = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(forged.status).toBe(401);
    expect(forged.body).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
  });
});
