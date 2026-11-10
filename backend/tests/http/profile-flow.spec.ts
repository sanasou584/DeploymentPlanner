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

const ADMIN = { name: 'Profile Admin', email: 'profile-admin@example.com', password: 'strong-pass-1' };
const DEV = { name: 'Profile Dev', email: 'profile-dev@example.com', password: 'strong-pass-1' };

let app: Express;

async function register(body: object) {
  await request(app).post('/api/v1/auth/register').send(body);
}

async function login(email: string, password: string) {
  return request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
}

async function loginAndTakeToken(email: string, password: string): Promise<string> {
  const res = await login(email, password);

  expect(res.status).toBe(200);
  return res.body.accessToken as string;
}

function authed(token: string) {
  return {
    get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
  };
}

beforeAll(async () => {
  await connectTestingModule('http_profile_flow_test');
  app = createApp(createLogger('warn'));

  await register(ADMIN);
  await register(DEV);

  // Bootstrap the admin exactly like `npm run admin:create` does: role
  // promotion + approval straight on the model (there is no "first admin"
  // bootstrap call through HTTP).
  const admin = await User.findOne({ email: ADMIN.email });

  if (!admin) throw new Error('admin seed missing');
  admin.set('role', 'ADMIN');
  await admin.save();
  await admin.approve();

  const dev = await User.findOne({ email: DEV.email });

  if (!dev) throw new Error('developer seed missing');
  await dev.approve();
});

afterAll(async () => {
  await disconnectTestingModule();
  await stopMemoryServer();
});

describe('profile flow', () => {
  it('GET /profile is UNAUTHENTICATED without a bearer token', async () => {
    const res = await request(app).get('/api/v1/profile');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: { code: 'UNAUTHORIZED', message: expect.stringContaining('Bearer token required') },
    });
  });

  it('GET /profile returns ONLY self data: the user connected one', async () => {
    const devToken = await loginAndTakeToken(DEV.email, DEV.password);

    const res = await authed(devToken).get('/api/v1/profile');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: 'Profile retrieved successfully',
      data: {
        name: DEV.name,
        email: DEV.email,
        role: 'DEVELOPER',
        avatarUrl: null,
      },
    });
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('GET /profile is role-agnostic: admins can read their own profile too', async () => {
    const adminToken = await loginAndTakeToken(ADMIN.email, ADMIN.password);

    const res = await authed(adminToken).get('/api/v1/profile');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ role: 'ADMIN', email: ADMIN.email });
  });

  it('PATCH /profile validates the payload: empty, too-short name and insecure avatar are 400', async () => {
    const devToken = await loginAndTakeToken(DEV.email, DEV.password);

    const empty = await authed(devToken).patch('/api/v1/profile').send({});
    expect(empty.status).toBe(400);
    expect(empty.body).toMatchObject({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid profile data' },
    });

    const shortName = await authed(devToken)
      .patch('/api/v1/profile')
      .send({ name: 'A' });
    expect(shortName.status).toBe(400);

    const insecureAvatar = await authed(devToken)
      .patch('/api/v1/profile')
      .send({ avatarUrl: 'http://insecure-cdn.example.com/x.png' });
    expect(insecureAvatar.status).toBe(400);
    expect(insecureAvatar.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PATCH /profile updates name and avatar; null avatar removes it', async () => {
    const devToken = await loginAndTakeToken(DEV.email, DEV.password);

    const renamed = await authed(devToken)
      .patch('/api/v1/profile')
      .send({ name: 'Fatma Profile' });

    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({
      message: 'Profile updated successfully',
      data: { name: 'Fatma Profile' },
    });

    const avatar = await authed(devToken)
      .patch('/api/v1/profile')
      .send({ avatarUrl: 'https://cdn.example.com/avatars/fatma.png' });

    expect(avatar.status).toBe(200);
    expect(avatar.body.data.avatarUrl).toBe('https://cdn.example.com/avatars/fatma.png');

    const readBack = await authed(devToken).get('/api/v1/profile');
    expect(readBack.body.data).toMatchObject({
      name: 'Fatma Profile',
      avatarUrl: 'https://cdn.example.com/avatars/fatma.png',
    });

    const cleared = await authed(devToken)
      .patch('/api/v1/profile')
      .send({ avatarUrl: null });

    expect(cleared.status).toBe(200);
    expect(cleared.body.data.avatarUrl).toBeNull();
  });

  it('POST /profile/password refuses a wrong current password (403) and keeps the old one', async () => {
    const devToken = await loginAndTakeToken(DEV.email, DEV.password);

    const refused = await authed(devToken)
      .post('/api/v1/profile/password')
      .send({ currentPassword: 'not-the-password', newPassword: 'fresh-strong-pass-2' });

    expect(refused.status).toBe(403);
    expect(refused.body).toMatchObject({
      error: {
        code: 'FORBIDDEN',
        message: expect.stringContaining('Current password is incorrect'),
      },
    });
  });

  it('new password must differ from the current one (400)', async () => {
    const devToken = await loginAndTakeToken(DEV.email, DEV.password);

    const res = await authed(devToken)
      .post('/api/v1/profile/password')
      .send({ currentPassword: DEV.password, newPassword: DEV.password });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('changing the password invalidates the old credentials, activates the new ones', async () => {
    const devToken = await loginAndTakeToken(DEV.email, DEV.password);

    const changed = await authed(devToken)
      .post('/api/v1/profile/password')
      .send({ currentPassword: DEV.password, newPassword: 'fresh-strong-pass-2' });

    expect(changed.status).toBe(200);
    expect(changed.body).toMatchObject({
      message: 'Password changed successfully',
      data: null,
    });

    const oldLogin = await login(DEV.email, DEV.password);
    expect(oldLogin.status).toBe(401);

    const newLogin = await login(DEV.email, 'fresh-strong-pass-2');
    expect(newLogin.status).toBe(200);
  });
});
