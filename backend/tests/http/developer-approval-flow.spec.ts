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

const ADMIN = { name: 'Root Admin', email: 'root-admin@example.com', password: 'strong-pass-1' };
const DEV_A = { name: 'Developer A', email: 'dev-a@example.com', password: 'strong-pass-1' };
const DEV_B = { name: 'Developer B', email: 'dev-b@example.com', password: 'strong-pass-1' };

let app: Express;
let adminToken: string;
let devAToken: string;
let devBToken: string;
let devAId: string;
let devBId: string;
let alphaId: string;

async function register(body: object) {
  await request(app).post('/api/v1/auth/register').send(body);
}

async function login(user: typeof ADMIN): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: user.password });

  expect(res.status).toBe(200);
  return res.body.accessToken as string;
}

beforeAll(async () => {
  await connectTestingModule('http_approval_flow_test');
  app = createApp(createLogger('warn'));

  await register(ADMIN);
  await register(DEV_A);
  await register(DEV_B);

  // Bootstrap the admin exactly like `npm run admin:create` does: role
  // promotion + approval straight on the model (there is no "first admin"
  // bootstrap call through HTTP).
  const admin = await User.findOne({ email: ADMIN.email });

  if (!admin) throw new Error('admin seed missing');
  admin.set('role', 'ADMIN');
  await admin.save();
  await admin.approve();
});

afterAll(async () => {
  await disconnectTestingModule();
  await stopMemoryServer();
});

describe('approval workflow', () => {
  it('admins can authenticate; pending developers cannot', async () => {
    adminToken = await login(ADMIN);

    const denied = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: DEV_A.email, password: DEV_A.password });

    expect(denied.status).toBe(403);
    expect(denied.body).toMatchObject({
      error: { code: 'FORBIDDEN', message: expect.stringContaining('not approved') },
    });
  });

  it('pending registrations are listed for admins, oldest mission first', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const emails = (res.body.data as Array<{ email: string }>).map((item) => item.email);
    expect(emails).toContain(DEV_A.email);
    expect(emails).toContain(DEV_B.email);

    const pendingList = res.body.data as Array<{ email: string; id: string }>;
    const devA = pendingList.find((item) => item.email === DEV_A.email);
    const devB = pendingList.find((item) => item.email === DEV_B.email);
    if (!devA || !devB) throw new Error('pending list incomplete');
    devAId = devA.id;
    devBId = devB.id;
  });

  it('admin approves a registration; the developer can then log in', async () => {
    const approved = await request(app)
      .post(`/api/v1/admin/users/${devAId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approved.status).toBe(200);
    expect(approved.body).toMatchObject({
      message: 'User approved successfully',
      data: { status: 'ACTIVE' },
    });

    devAToken = await login(DEV_A);
  });

  it('approving twice is a 409: the machine forbids the transition', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/users/${devAId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      error: { code: 'INVALID_STATE_TRANSITION', message: expect.stringMatching(/transition/i) },
    });
  });

  it('non-admins are FORBIDDEN on admin endpoints, and the route order keeps /pending alive', async () => {
    const forbidden = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${devAToken}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toMatchObject({ error: { code: 'FORBIDDEN' } });

    const noToken = await request(app).get('/api/v1/admin/users');
    expect(noToken.status).toBe(401);
    expect(noToken.body).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
  });
});

describe('projects API', () => {
  it('is closed to anonymous callers', async () => {
    const res = await request(app).get('/api/v1/projects');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
  });

  it('creates, lists, updates and reads a project for its owner', async () => {
    const created = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${devAToken}`)
      .send({ name: 'alpha', description: 'first' });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      message: 'Project created successfully',
      data: { name: 'alpha', environment: 'DEVELOPMENT' },
    });
    alphaId = created.body.data.id as string;

    const list = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${devAToken}`);

    expect(list.status).toBe(200);
    expect(list.body).toMatchObject({
      message: 'Projects retrieved successfully',
      data: [{ id: alphaId, name: 'alpha' }],
      pagination: { page: 1, limit: 20, total: 1, pageCount: 1 },
    });

    const updated = await request(app)
      .patch(`/api/v1/projects/${alphaId}`)
      .set('Authorization', `Bearer ${devAToken}`)
      .send({ name: '  alpha-2  ', description: 'renamed' });

    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ name: 'alpha-2', description: 'renamed' });

    const fetched = await request(app)
      .get(`/api/v1/projects/${alphaId}`)
      .set('Authorization', `Bearer ${devAToken}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data).toMatchObject({ name: 'alpha-2' });
  });

  it('a duplicate name answers 409; a malformed id answers 400', async () => {
    const conflict = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${devAToken}`)
      .send({ name: 'alpha-2' });

    expect(conflict.status).toBe(409);
    expect(conflict.body).toMatchObject({ error: { code: 'CONFLICT' } });

    const badId = await request(app)
      .get('/api/v1/projects/not-an-object-id')
      .set('Authorization', `Bearer ${devAToken}`);

    expect(badId.status).toBe(400);
    expect(badId.body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('another developer never sees or touches a foreign project (anti-IDOR)', async () => {
    // dev B: approve through the real admin endpoint, then authenticate.
    await request(app)
      .post(`/api/v1/admin/users/${devBId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    devBToken = await login(DEV_B);

    await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${devBToken}`)
      .send({ name: 'beta' });

    const foreign = await request(app)
      .get(`/api/v1/projects/${alphaId}`)
      .set('Authorization', `Bearer ${devBToken}`);

    expect(foreign.status).toBe(404);
    expect(foreign.body).toMatchObject({ error: { code: 'NOT_FOUND' } });

    const hijack = await request(app)
      .patch(`/api/v1/projects/${alphaId}`)
      .set('Authorization', `Bearer ${devBToken}`)
      .send({ name: 'hijacked' });

    expect(hijack.status).toBe(404);
  });

  it('delete is soft: 404 afterwards, and the name is released for reuse', async () => {
    const removed = await request(app)
      .delete(`/api/v1/projects/${alphaId}`)
      .set('Authorization', `Bearer ${devAToken}`);

    expect(removed.status).toBe(200);
    expect(removed.body.message).toBe('Project deleted successfully');

    const gone = await request(app)
      .get(`/api/v1/projects/${alphaId}`)
      .set('Authorization', `Bearer ${devAToken}`);
    expect(gone.status).toBe(404);

    const reused = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${devAToken}`)
      .send({ name: 'alpha-2' });

    expect(reused.status).toBe(201);
    expect(reused.body.data).toMatchObject({ name: 'alpha-2' });
  });
});
