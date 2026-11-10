
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { Server } from 'node:http';
import { createServer } from 'node:http';

import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/shared/logging/logger.js';
import { INTERNAL_SECRET_HEADER } from '../../src/shared/security/internal-auth.js';
import {
  Analysis,
  Project,
  Recommendation,
  User,
  type AnalysisDocument,
  type ProjectDocument,
  type UserDocument,
} from '../../src/models/entities/index.js';
import {
  connectTestingModule,
  disconnectTestingModule,
  stopMemoryServer,
} from '../integration/test-database.js';

const DEV = { name: 'Rec Dev', email: 'rec-dev@example.com', password: 'strong-pass-1' };
const DEV2 = { name: 'Rec Dev2', email: 'rec-dev2@example.com', password: 'strong-pass-1' };

let application: Express;
let devToken: string;
let dev2Token: string;
let dev: UserDocument;
let project: ProjectDocument;
let analysis: AnalysisDocument;
let n8nStub: Server;
let n8nStubHits: number;

const secretHeaders = { [INTERNAL_SECRET_HEADER]: process.env.N8N_SHARED_SECRET ?? '' };

async function seed(target = DEV): Promise<void> {
  const created = await User.register({ ...target });
  await created.approve();
}

async function completedAnalysis(
  owner: UserDocument,
  target: ProjectDocument,
): Promise<AnalysisDocument> {
  const doc = await Analysis.request({ project: target, userId: owner._id });
  const running = await doc.start();

  return running.complete({
    detectedFiles: ['.github/workflows/ci.yml'],
    docker: {
      hasDockerfile: true,
      hasCompose: true,
      findings: [
        {
          ruleId: 'COMPOSE_PLAINTEXT_CREDENTIAL',
          severity: 'WARNING',
          message: 'Plaintext secret',
          file: 'docker-compose.yml',
          line: 3,
        },
      ],
    },
  });
}

function analysisUrl(suffix: string): string {
  return `/api/v1/projects/${String(project._id)}/analyses/${String(analysis._id)}${suffix}`;
}

beforeAll(async () => {
  // Local n8n double: any POST is accepted so the trigger path is deterministic.
  n8nStubHits = 0;
  n8nStub = createServer((request, response) => {
    request.resume();
    n8nStubHits += 1;
    response.statusCode = 200;
    response.end('{}');
  });
  const port = await new Promise<number>((resolve) => {
    n8nStub.listen(0, '127.0.0.1', () => {
      const address = n8nStub.address();
      resolve(typeof address === 'object' && address !== null ? address.port : 0);
    });
  });
  process.env.N8N_AI_AUDIT_WEBHOOK_URL = `http://127.0.0.1:${port}/webhook`;

  await connectTestingModule('http_recommendation_flow_test');
  application = createApp(createLogger('warn'));

  await seed(DEV);
  await seed(DEV2);

  dev = (await User.findOne({ email: DEV.email }))!;

  project = await (await Project.createFor({ ownerId: dev._id, name: 'rec proj', description: 'd' }))
    .connectRepository({ url: 'https://github.com/acme/repo' }, 'main')
    .then((pending) => pending.markRepositoryVerified('main'));

  const login = async (user: { email: string; password: string }) => {
    const res = await request(application).post('/api/v1/auth/login').send({
      email: user.email,
      password: user.password,
    });

    expect(res.status).toBe(200);
    return res.body.accessToken as string;
  };
  devToken = await login(DEV);
  dev2Token = await login(DEV2);
});

afterAll(async () => {
  await disconnectTestingModule();
  await stopMemoryServer();
  await new Promise<void>((resolve) => n8nStub.close(() => resolve()));
});

beforeEach(async () => {
  await Promise.all([
    Analysis.deleteMany({}).setOptions({ withDeleted: true }),
    Recommendation.deleteMany({}).setOptions({ withDeleted: true }),
  ]);
  // AuditLog is append-only by design: seeded analyses get fresh ids per test,
  // so old rows stay quarantined behind their stale entity ids.
  analysis = await completedAnalysis(dev, project);
});

describe('recommendation flow', () => {
  it('returns 401 without a bearer token', async () => {
    const res = await request(application).get(analysisUrl('/recommendations'));

    expect(res.status).toBe(401);
  });

  it('rejects malformed hex id parameters with 400', async () => {
    const res = await request(application)
      .get(`/api/v1/projects/${project.id}/analyses/zzz/recommendations`)
      .set('Authorization', `Bearer ${devToken}`);

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('runs the rules audit and lists fresh recommendations', async () => {
    const auditRes = await request(application)
      .post(analysisUrl('/audit'))
      .set('Authorization', `Bearer ${devToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body).toMatchObject({
      message: 'Audit completed',
      data: { created: 1 },
    });

    const listRes = await request(application)
      .get(analysisUrl('/recommendations'))
      .set('Authorization', `Bearer ${devToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0]).toMatchObject({
      type: 'SECURITY',
      severity: 'WARNING',
      status: 'PENDING',
      generatedBy: { provider: 'internal', model: 'audit-rules-v1' },
    });
  });

  it('walks accept → block re-accept → block reject-after-accept', async () => {
    const rec = (await freshRecommendation(devToken)).id;

    const accept = await request(application)
      .post(analysisUrl(`/recommendations/${rec}/accept`))
      .set('Authorization', `Bearer ${devToken}`);

    expect(accept.status).toBe(200);
    expect(accept.body.data.status).toBe('ACCEPTED');

    const reaccept = await request(application)
      .post(analysisUrl(`/recommendations/${rec}/accept`))
      .set('Authorization', `Bearer ${devToken}`);

    expect(reaccept.status).toBe(409);

    const rejectAfter = await request(application)
      .post(analysisUrl(`/recommendations/${rec}/reject`))
      .set('Authorization', `Bearer ${devToken}`);
    expect(rejectAfter.status).toBe(409);
  });

  it('reject with a note lands on REJECTED with the note stored', async () => {
    const second = await completedAnalysis(dev, project);
    const auditRes = await request(application)
      .post(`/api/v1/projects/${project.id}/analyses/${second.id}/audit`)
      .set('Authorization', `Bearer ${devToken}`);
    const rec = auditRes.body.data.recommendations[0].id;

    const reject = await request(application)
      .post(`/api/v1/projects/${project.id}/analyses/${second.id}/recommendations/${rec}/reject`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ note: 'not now' });

    expect(reject.status).toBe(200);
    expect(reject.body.data.status).toBe('REJECTED');
    expect(reject.body.data.decisionNote).toBe('not now');
  });

  it('foreign users get NOT_FOUND for someone else analysis (anti-IDOR)', async () => {
    const folder = await request(application)
      .post(analysisUrl('/audit'))
      .set('Authorization', `Bearer ${dev2Token}`);

    const pulled = await request(application)
      .get(analysisUrl('/recommendations'))
      .set('Authorization', `Bearer ${dev2Token}`);

    expect(folder.status).toBe(404);
    expect(pulled.status).toBe(404);
    expect(pulled.body).toMatchObject({
      error: { code: 'NOT_FOUND', message: 'Analysis not found' },
    });
  });

  it('records AI-provided recommendations through the internal channel guarded by the shared secret', async () => {
    const forbidden = await request(application)
      .post(`/api/v1/internal/analyses/${analysis.id}/recommendations`)
      .send({ provider: 'gpt', model: 'gpt-4o', recommendations: [] });
    expect(forbidden.status).toBe(401);

    const res = await request(application)
      .post(`/api/v1/internal/analyses/${analysis.id}/recommendations`)
      .set(INTERNAL_SECRET_HEADER, secretHeaders[INTERNAL_SECRET_HEADER])
      .send({
        provider: 'gpt',
        model: 'gpt-4o',
        recommendations: [
          { type: 'HPA', severity: 'INFO', title: 'Add HPA', description: 'Scale with cpu' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: 'Recommendations recorded',
      data: { created: 1, skipped: 0 },
    });

    const again = await request(application)
      .post(`/api/v1/internal/analyses/${analysis.id}/recommendations`)
      .set(INTERNAL_SECRET_HEADER, secretHeaders[INTERNAL_SECRET_HEADER])
      .send({
        provider: 'gpt',
        model: 'gpt-4o',
        recommendations: [
          { type: 'HPA', severity: 'INFO', title: 'Add HPA', description: 'Scale with cpu' },
        ],
      });

    expect(again.body.data).toMatchObject({ created: 0, skipped: 1 });
  });

  it('validates internal recommendations: path traversal and bad enums are 400', async () => {
    const res = await request(application)
      .post(`/api/v1/internal/analyses/${analysis.id}/recommendations`)
      .set(INTERNAL_SECRET_HEADER, secretHeaders[INTERNAL_SECRET_HEADER])
      .send({
        provider: 'gpt',
        model: 'gpt-4o',
        recommendations: [
          {
            type: 'DOCKER',
            severity: 'INFO',
            title: 'escape',
            description: 'bad path',
            proposedFile: { path: '../escape.txt', content: 'nope' },
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('launches the AI audit, singleton-blocks re-launch, accepts the failure callback', async () => {
    const launch = await request(application)
      .post(analysisUrl('/audit/ai'))
      .set('Authorization', `Bearer ${devToken}`);

    expect(launch.status).toBe(202);
    expect(launch.body).toMatchObject({
      message: 'AI audit requested',
      data: { status: 'REQUESTED' },
    });
    expect(n8nStubHits).toBe(1);

    const relaunch = await request(application)
      .post(analysisUrl('/audit/ai'))
      .set('Authorization', `Bearer ${devToken}`);

    expect(relaunch.status).toBe(409);

    const fail = await request(application)
      .post(`/api/v1/internal/analyses/${analysis.id}/audit-fail`)
      .set(INTERNAL_SECRET_HEADER, secretHeaders[INTERNAL_SECRET_HEADER])
      .send({ code: 'GENERIC', message: 'boom' });

    expect(fail.status).toBe(200);
    expect(fail.body.data).toMatchObject({ status: 'FAILED' });

    const afterFail = await request(application)
      .post(analysisUrl('/audit/ai'))
      .set('Authorization', `Bearer ${devToken}`);

    expect(afterFail.status).toBe(202);
  });

  it('serves the AI audit context to n8n through the internal secret', async () => {
    const launched = await request(application)
      .post(analysisUrl('/audit/ai'))
      .set('Authorization', `Bearer ${devToken}`);

    expect(launched.status).toBe(202);

    const res = await request(application)
      .get(`/api/v1/internal/analyses/${analysis.id}/context`)
      .set(INTERNAL_SECRET_HEADER, secretHeaders[INTERNAL_SECRET_HEADER]);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      repository: { owner: 'acme', name: 'repo' },
      branch: 'main',
    });
  });

  async function freshRecommendation(token: string): Promise<{ id: string }> {
    const res = await request(application)
      .post(analysisUrl('/audit'))
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.data.recommendations.length).toBeGreaterThanOrEqual(1);
    return res.body.data.recommendations[0];
  }
});
