import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';

import {
  Analysis,
  Project,
  User,
  type AnalysisDocument,
  type ProjectDocument,
  type UserDocument,
} from '../../src/models/entities/index.js';
import { AnalysisRepository, AuditLogRepository, RecommendationRepository } from '../../src/repositories/index.js';
import {
  InvariantViolationError,
  InvalidStateTransitionError,
  NotFoundError,
} from '../../src/domain/errors/index.js';
import { createRecommendationService } from '../../src/services/recommendations/recommendation.service.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';

const FOREIGN_ID = new Types.ObjectId('64b1f6274190d8fe2ee1ba32');

/** Extracts item 0 with a loud failure instead of a partial-product assertion. */
function first<T>(items: readonly T[]): T {
  const [item] = items;
  if (item === undefined) {
    throw new Error('expected at least one item');
  }
  return item;
}

interface FindingInput {
  ruleId: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  file?: string;
  line?: number;
}

let owner: UserDocument;
let project: ProjectDocument;
let auditLogs: AuditLogRepository;
let service: ReturnType<typeof createRecommendationService>;

async function completedAnalysis(input: {
  dockerFindings: FindingInput[];
  detectedFiles: string[];
  hasDockerfile: boolean;
}): Promise<AnalysisDocument> {
  let doc = await Analysis.request({ project, userId: owner._id });
  doc = await doc.start();
  doc = await doc.complete({
    detectedFiles: input.detectedFiles,
    docker: { hasDockerfile: input.hasDockerfile, hasCompose: true, findings: input.dockerFindings },
  });

  return doc;
}

beforeAll(async () => {
  await connectTestingModule('recommendation_service_test');
  await Promise.all([User.init(), Project.init(), Analysis.init()]);
  auditLogs = new AuditLogRepository();
  service = createRecommendationService(
    new RecommendationRepository(),
    new AnalysisRepository(),
    auditLogs,
  );
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}).setOptions({ withDeleted: true }),
    Project.deleteMany({}).setOptions({ withDeleted: true }),
    Analysis.deleteMany({}).setOptions({ withDeleted: true }),
  ]);

  owner = await User.register({ name: 'rec owner', email: 'owner@example.com', password: 'LongEnough1!' });
  let current = await Project.createFor({ ownerId: owner._id, name: 'rec project', description: 'd' });
  current = await current.connectRepository({ url: 'https://github.com/acme/repo' }, 'main');
  project = await current.markRepositoryVerified('main');
});

describe('recommendation service', () => {
  it('runAudit on a completed analysis creates rules recommendations and lists them', async () => {
    const analysis = await completedAnalysis({
      hasDockerfile: true,
      detectedFiles: ['.github/workflows/ci.yml'],
      dockerFindings: [
        { ruleId: 'COMPOSE_PLAINTEXT_CREDENTIAL', severity: 'WARNING', message: 'Plaintext secret', file: 'docker-compose.yml', line: 3 },
      ],
    });

    const { created, items } = await service.runAudit(owner.id, project.id, analysis.id);

    expect(created).toBe(1);
    expect(items).toHaveLength(1);
    expect(first(items)).toMatchObject({
      type: 'SECURITY',
      severity: 'WARNING',
      status: 'PENDING',
      generatedBy: { provider: 'internal', model: 'audit-rules-v1' },
    });
  });

  it('runAudit is deduplicating: the second run creates nothing new', async () => {
    const analysis = await completedAnalysis({
      hasDockerfile: true,
      detectedFiles: ['.github/workflows/ci.yml'],
      dockerFindings: [{ ruleId: 'NO_HEALTHCHECK', severity: 'WARNING', message: 'No healthcheck' }],
    });

    const firstRun = await service.runAudit(owner.id, project.id, analysis.id);
    const secondRun = await service.runAudit(owner.id, project.id, analysis.id);

    expect(firstRun.created).toBe(1);
    expect(secondRun.created).toBe(0);
    expect(secondRun.items).toHaveLength(1);
  });

  it('runAudit on a non-completed analysis is invariant-violating', async () => {
    const analysis = await Analysis.request({ project, userId: owner._id });

    await expect(service.runAudit(owner.id, project.id, analysis.id)).rejects.toThrow(
      InvariantViolationError,
    );
  });

  it('accept/reject walks the decision state machine and writes audit rows', async () => {
    const analysis = await completedAnalysis({
      hasDockerfile: true,
      detectedFiles: ['.github/workflows/ci.yml'],
      dockerFindings: [{ ruleId: 'IMAGE_TAG_LATEST', severity: 'ERROR', message: 'Latest tag', file: 'Dockerfile', line: 4 }],
    });
    const recommendation = first((await service.runAudit(owner.id, project.id, analysis.id)).items);

    const accepted = await service.accept(owner.id, project.id, analysis.id, recommendation.id);

    expect(accepted.status).toBe('ACCEPTED');
    const rows = await auditLogs.listForEntity('Recommendation', recommendation._id);

    expect(rows).toHaveLength(1);
    expect(first(rows).get('action')).toBe('RECOMMENDATION_ACCEPTED');

    await expect(
      service.accept(owner.id, project.id, analysis.id, recommendation.id),
    ).rejects.toThrow(InvalidStateTransitionError);
  });

  it('reject records the optional note', async () => {
    const analysis = await completedAnalysis({
      hasDockerfile: true,
      detectedFiles: ['.github/workflows/ci.yml'],
      dockerFindings: [{ ruleId: 'NO_HEALTHCHECK', severity: 'WARNING', message: 'No healthcheck' }],
    });
    const recommendation = first((await service.runAudit(owner.id, project.id, analysis.id)).items);

    const rejected = await service.reject(owner.id, project.id, analysis.id, recommendation.id, 'not our stack');

    expect(rejected.status).toBe('REJECTED');
    expect(rejected.get('decisionNote')).toBe('not our stack');
  });

  it('accept is 404 behind a foreign owner (anti-IDOR)', async () => {
    const analysis = await completedAnalysis({
      hasDockerfile: true,
      detectedFiles: ['.github/workflows/ci.yml'],
      dockerFindings: [{ ruleId: 'NO_HEALTHCHECK', severity: 'WARNING', message: 'No healthcheck' }],
    });
    const recommendation = first((await service.runAudit(owner.id, project.id, analysis.id)).items);

    await expect(
      service.accept(FOREIGN_ID.toHexString(), project.id, analysis.id, recommendation.id),
    ).rejects.toThrow(new NotFoundError('Analysis not found'));
  });

  it('accept with an unknown recommendation id is 404', async () => {
    const analysis = await completedAnalysis({
      hasDockerfile: true,
      detectedFiles: ['.github/workflows/ci.yml'],
      dockerFindings: [],
    });

    await expect(
      service.accept(owner.id, project.id, analysis.id, FOREIGN_ID.toHexString()),
    ).rejects.toThrow(new NotFoundError('Recommendation not found'));
  });

  it('recordAiRecommendations ingests AI callbacks with dedupe across runs', async () => {
    const analysis = await completedAnalysis({
      hasDockerfile: true,
      detectedFiles: [],
      dockerFindings: [],
    });

    const firstRun = await service.recordAiRecommendations(analysis.id, {
      provider: 'gpt',
      model: 'gpt-4o',
      recommendations: [
        { type: 'HPA', severity: 'INFO', title: 'Enable HPA', description: 'Scale on cpu load' },
        {
          type: 'SECURITY',
          severity: 'CRITICAL',
          title: 'Drop inline secrets',
          description: 'Use env vars',
          suggestedValue: 'Use secret refs',
          confidence: 0.9,
          proposedFile: { path: 'deploy/secrets.env', content: 'SECRET=...' },
        },
      ],
    });

    expect(firstRun).toMatchObject({ created: 2, skipped: 0 });

    const again = await service.recordAiRecommendations(analysis.id, {
      provider: 'gpt',
      model: 'gpt-4o',
      recommendations: [
        { type: 'HPA', severity: 'INFO', title: 'Enable HPA', description: 'Scale on cpu load' },
      ],
    });

    expect(again.created).toBe(0);
    expect(again.skipped).toBe(1);
  });

  it('rejecting an already-accepted recommendation is invalid', async () => {
    const analysis = await completedAnalysis({
      hasDockerfile: true,
      detectedFiles: ['.github/workflows/ci.yml'],
      dockerFindings: [{ ruleId: 'NO_HEALTHCHECK', severity: 'WARNING', message: 'No healthcheck' }],
    });
    const recommendation = first((await service.runAudit(owner.id, project.id, analysis.id)).items);

    await service.accept(owner.id, project.id, analysis.id, recommendation.id);

    await expect(
      service.reject(owner.id, project.id, analysis.id, recommendation.id, 'late change of mind'),
    ).rejects.toThrow(InvalidStateTransitionError);
  });
});
