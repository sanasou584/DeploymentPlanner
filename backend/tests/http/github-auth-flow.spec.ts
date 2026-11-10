import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Agent } from 'supertest';
import type { Express } from 'express';

// The OAuth service talks to github.com over the network: tests stub the
// factory so every scenario controls the profile (or the failure) directly.
const oauthStub = vi.hoisted(() => ({
  getAuthorizationUrl: vi.fn(
    () => 'https://github.com/login/oauth/authorize?stub=1',
  ),
  getProfile: vi.fn(),
}));

vi.mock('../../src/services/auth/github-oauth.service.js', () => ({
  createGithubOAuthService: () => oauthStub,
}));

import { createApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { createLogger } from '../../src/shared/logging/logger.js';
import { User } from '../../src/models/entities/index.js';
import { AuthIdentity } from '../../src/models/entities/index.js';
import {
  connectTestingModule,
  disconnectTestingModule,
  stopMemoryServer,
} from '../integration/test-database.js';

type StubProfile = { githubId: string; name: string; email: string };

const APPROVED: StubProfile = {
  name: 'Approved GH User',
  email: 'approved-gh@example.com',
  githubId: 'gh-approved-1',
};

const LINKED_EMAIL: StubProfile = {
  name: 'Local Approved User',
  email: 'linked-email@example.com',
  githubId: 'gh-linking-1',
};

const TAKEN_EMAIL: StubProfile = {
  name: 'Local Only User',
  email: 'taken-email@example.com',
  githubId: 'gh-taken-1',
};

const DOUBLE_LINKED: StubProfile = {
  name: 'Double Linked User',
  email: 'double-linked@example.com',
  githubId: 'gh-second-1',
};

const DISABLED: StubProfile = {
  name: 'Disabled GH User',
  email: 'disabled-gh@example.com',
  githubId: 'gh-disabled-1',
};

const SOFT_DELETED: StubProfile = {
  name: 'Soft Deleted GH User',
  email: 'soft-deleted-gh@example.com',
  githubId: 'gh-deleted-1',
};

let app: Express;
let frontendUrl: string;

/** Reads the signed cookie value the start endpoint planted (s:<data>.<sig>). */
function readSignedCookie(
  setCookie: string | string[] | undefined,
  name: string,
): string {
  const values = typeof setCookie === 'string' ? [setCookie] : setCookie;
  const raw = values?.find((cookie) => cookie.startsWith(`${name}=`));

  if (!raw) {
    throw new Error(`${name} cookie missing`);
  }

  const pair = raw.split(';')[0];

  if (!pair) {
    throw new Error(`${name} cookie malformed`);
  }

  return decodeURIComponent(pair.slice(name.length + 1))
    .replace(/^s:/, '')
    .split('.')[0] ?? '';
}

/** start -> (GitHub) -> callback on one cookie jar; profile outcome injectable. */
async function runOAuthRoundTrip(
  agent: Agent,
  outcome: () => Promise<StubProfile>,
): Promise<request.Response> {
  const start = await agent.get('/api/v1/auth/github');

  expect(start.status).toBe(302);

  const state = readSignedCookie(start.headers['set-cookie'], 'oauth_state');
  oauthStub.getProfile.mockImplementationOnce(outcome);

  return agent.get(
    `/api/v1/auth/github/callback?state=${encodeURIComponent(state)}&code=stub-code`,
  );
}

function resolveStub(profile: StubProfile): () => Promise<StubProfile> {
  return () => Promise.resolve(profile);
}

beforeAll(async () => {
  await connectTestingModule('http_github_flow_test');
  frontendUrl = getEnv().frontendUrl;
  app = createApp(createLogger('warn'));

  // Pre-approved account already linked to GitHub (success path).
  const approved = await User.register({
    name: APPROVED.name,
    email: APPROVED.email,
    password: 'strong-pass-1',
  });
  await approved.approve();
  await AuthIdentity.create([
    {
      userId: approved.id,
      provider: 'github',
      providerUserId: APPROVED.githubId,
    },
  ]);

  // Locally registered email in the normal approval cycle (no identity yet):
  // GitHub now LINKS onto it when the account is approved, and stays
  // status-gated when it is not.
  await User.register({
    name: LINKED_EMAIL.name,
    email: LINKED_EMAIL.email,
    password: 'strong-pass-1',
  });
  const linked = await User.findOne({ email: LINKED_EMAIL.email });

  if (!linked) throw new Error('linked seed missing');
  await linked.approve();

  // Same email, but the account ALREADY owns a different GitHub identity.
  await User.register({
    name: DOUBLE_LINKED.name,
    email: DOUBLE_LINKED.email,
    password: 'strong-pass-1',
  });
  const doubled = await User.findOne({ email: DOUBLE_LINKED.email });

  if (!doubled) throw new Error('double-linked seed missing');
  await doubled.approve();
  await AuthIdentity.create([
    {
      userId: doubled.id,
      provider: 'github',
      providerUserId: 'gh-first-1',
    },
  ]);

  // DISABLED status account still linked to GitHub (approval machine path).
  const disabled = await User.register({
    name: DISABLED.name,
    email: DISABLED.email,
    password: 'strong-pass-1',
  });
  await disabled.approve();
  await disabled.deactivate();
  await AuthIdentity.create([
    {
      userId: disabled.id,
      provider: 'github',
      providerUserId: DISABLED.githubId,
    },
  ]);

  // Soft-deleted account still linked to GitHub (deletedAt path).
  const softDeleted = await User.register({
    name: SOFT_DELETED.name,
    email: SOFT_DELETED.email,
    password: 'strong-pass-1',
  });
  await softDeleted.approve();
  await softDeleted.softDelete();
  await AuthIdentity.create([
    {
      userId: softDeleted.id,
      provider: 'github',
      providerUserId: SOFT_DELETED.githubId,
    },
  ]);
});

afterEach(() => {
  oauthStub.getProfile.mockReset();
});

afterAll(async () => {
  await disconnectTestingModule();
  await stopMemoryServer();
});

describe('GET /auth/github (start)', () => {
  it('plants the signed state cookies and redirects to GitHub', async () => {
    const res = await request(app).get('/api/v1/auth/github');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(
      'https://github.com/login/oauth/authorize?stub=1',
    );

    const cookies = (res.headers['set-cookie'] ?? []) as string[];
    const names = cookies.map((cookie) => cookie.split('=')[0]);
    expect(names).toContain('oauth_state');
    expect(names).toContain('oauth_verifier');
    expect(
      cookies.find((cookie) => cookie.startsWith('oauth_state=')),
    ).toContain('HttpOnly');
  });
});

describe('GET /auth/github/callback (browser callbacks)', () => {
  it('redirects the browser to /session with the session in the fragment', async () => {
    const res = await runOAuthRoundTrip(
      request.agent(app),
      resolveStub(APPROVED),
    );

    expect(res.status).toBe(302);
    expect(typeof res.headers.location === 'string').toBe(true);
    expect(
      (res.headers.location as string).startsWith(`${frontendUrl}/session#`),
    ).toBe(true);

    const handoff = new URLSearchParams(
      (res.headers.location as string).split('#')[1],
    );
    expect(handoff.get('access_token')?.split('.').length).toBe(3);
    expect(handoff.get('user_email')).toBe(APPROVED.email);
    expect(handoff.get('user_role')).toBe('DEVELOPER');
  });

  it('redirects first-time GitHub accounts to login for approval', async () => {
    const profile: StubProfile = {
      githubId: 'gh-pending-9',
      name: 'Pending GH User',
      email: 'pending-gh@example.com',
    };

    const res = await runOAuthRoundTrip(
      request.agent(app),
      resolveStub(profile),
    );

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${frontendUrl}/?github=FORBIDDEN`);

    const created = await User.findOne({ email: profile.email });
    expect(created?.status).toBe('PENDING');
    expect(created?.role).toBe('DEVELOPER');
  });

  it('redirects identity-less emails already registered when they are not approved', async () => {
    const res = await runOAuthRoundTrip(
      request.agent(app),
      resolveStub(TAKEN_EMAIL),
    );

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${frontendUrl}/?github=FORBIDDEN`);

    // The identity is already linked; the approval gate still applies.
    const identity = await AuthIdentity.findOne({
      provider: 'github',
      providerUserId: TAKEN_EMAIL.githubId,
    });
    expect(identity).not.toBeNull();
  });

  it('logs approved local emails in through the freshly linked identity', async () => {
    const res = await runOAuthRoundTrip(
      request.agent(app),
      resolveStub(LINKED_EMAIL),
    );

    const location = res.headers.location as string;
    expect(res.status).toBe(302);
    expect(location.startsWith(`${frontendUrl}/session#`)).toBe(true);

    const handoff = new URLSearchParams(location.split('#')[1]);
    expect(handoff.get('access_token')?.split('.').length).toBe(3);
    expect(handoff.get('user_email')).toBe(LINKED_EMAIL.email);

    const identity = await AuthIdentity.findOne({
      provider: 'github',
      providerUserId: LINKED_EMAIL.githubId,
    });
    expect(identity).not.toBeNull();
  });

  it('answers CONFLICT when another GitHub account is already linked', async () => {
    const res = await runOAuthRoundTrip(
      request.agent(app),
      resolveStub(DOUBLE_LINKED),
    );

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${frontendUrl}/?github=CONFLICT`);
  });

  it('redirects disabled-status accounts to login', async () => {
    const res = await runOAuthRoundTrip(
      request.agent(app),
      resolveStub(DISABLED),
    );

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${frontendUrl}/?github=FORBIDDEN`);
  });

  it('redirects soft-deleted accounts to login', async () => {
    const res = await runOAuthRoundTrip(
      request.agent(app),
      resolveStub(SOFT_DELETED),
    );

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${frontendUrl}/?github=ACCOUNT_DISABLED`);
  });

  it('redirects tampered or missing state back to login', async () => {
    const res = await request(app)
      .get('/api/v1/auth/github/callback?state=forged&code=stub-code');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${frontendUrl}/?github=INVALID_STATE`);
  });

  it('unexpected OAuth failures still bubble to the central error handler', async () => {
    const res = await runOAuthRoundTrip(
      request.agent(app),
      () => Promise.reject(new Error('GitHub token exchange failed')),
    );

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      error: { code: 'INTERNAL_ERROR' },
    });
  });
});
