import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  Analysis,
  Project,
  User,
  type AnalysisDocument,
  type ProjectDocument,
  type UserDocument,
} from '../../src/models/entities/index.js';
import { AnalysisRepository, AuditLogRepository, ProjectRepository } from '../../src/repositories/index.js';
import {
  ConflictError,
  InvariantViolationError,
} from '../../src/domain/errors/index.js';
import {
  createAiAuditService,
  isAuditRunActive,
} from '../../src/services/ai-audit/ai-audit.service.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';

let service: ReturnType<typeof createAiAuditService>;
let auditLogs: AuditLogRepository;
let triggerCalls: Array<{ analysisId: string; repository: { owner: string; name: string; branch: string } }>;
let triggerShouldFail: boolean;
let owner: UserDocument;
let project: ProjectDocument;
let analysis: AnalysisDocument;

beforeAll(async () => {
  await connectTestingModule('ai_audit_service_test');
  await Promise.all([User.init(), Project.init(), Analysis.init()]);
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  triggerCalls = [];
  triggerShouldFail = false;

  await Promise.all([
    User.deleteMany({}).setOptions({ withDeleted: true }),
    Project.deleteMany({}).setOptions({ withDeleted: true }),
    Analysis.deleteMany({}).setOptions({ withDeleted: true }),
  ]);

  owner = await User.register({ name: 'audit owner', email: 'owner@example.com', password: 'LongEnough1!' });
  let current = await Project.createFor({ ownerId: owner._id, name: 'audit project', description: 'd' });
  current = await current.connectRepository({ url: 'https://github.com/acme/repo' }, 'main');
  project = await current.markRepositoryVerified('main');
  analysis = await Analysis.request({ project, userId: owner._id });
  analysis = await analysis.start();
  analysis = await analysis.complete({
    detectedFiles: ['.github/workflows/ci.yml'],
    docker: { hasDockerfile: true, hasCompose: false, findings: [] },
  });

  const trigger = async (payload: {
    analysisId: string;
    repository: { owner: string; name: string; branch: string };
  }): Promise<void> => {
    triggerCalls.push(payload);
    if (triggerShouldFail) {
      throw new InvariantViolationError('AI audit workflow is unreachable, try again later');
    }
  };

  auditLogs = new AuditLogRepository();
  service = createAiAuditService(
    { trigger },
    new AnalysisRepository(),
    new ProjectRepository(),
    auditLogs,
  );
});

describe('ai-audit service', () => {
  it('launch requests the n8n audit exactly once and records the audit trail', async () => {
    const result = await service.launch(owner.id, project.id, analysis.id);

    expect(result).toMatchObject({ analysisId: analysis.id, status: 'REQUESTED' });
    expect(triggerCalls).toHaveLength(1);
    expect(triggerCalls[0]).toMatchObject({
      repository: { owner: 'acme', name: 'repo', branch: 'main' },
    });

    const rows = await auditLogs.listForEntity('Analysis', analysis._id);

    expect(rows.some((row) => row.get('action') === 'AI_AUDIT_REQUESTED')).toBe(true);
  });

  it('launch is conflict-breaking while a run is already active', async () => {
    await service.launch(owner.id, project.id, analysis.id);

    await expect(service.launch(owner.id, project.id, analysis.id)).rejects.toThrow(ConflictError);
  });

  it('launch refuses analyses that are not completed', async () => {
    const pending = await Analysis.request({ project, userId: owner._id });

    await expect(service.launch(owner.id, project.id, pending.id)).rejects.toThrow(
      InvariantViolationError,
    );
    expect(triggerCalls).toHaveLength(0);
  });

  it('launch rethrows trigger failures and records AI_AUDIT_FAILED', async () => {
    triggerShouldFail = true;

    await expect(service.launch(owner.id, project.id, analysis.id)).rejects.toThrow(
      InvariantViolationError,
    );

    const rows = await auditLogs.listForEntity('Analysis', analysis._id);
    const failure = rows.find((row) => row.get('action') === 'AI_AUDIT_FAILED');

    expect(failure).toBeDefined();
    expect(failure?.get('level')).toBe('ERROR');
  });

  it('getContext returns the n8n-facing payload and keeps the active-run gate', async () => {
    await service.launch(owner.id, project.id, analysis.id);

    const context = await service.getContext(analysis.id);

    expect(context).toMatchObject({
      analysisId: analysis.id,
      repository: { owner: 'acme', name: 'repo' },
      branch: 'main',
      detectedFiles: analysis.detectedFiles,
    });
  });

  it('fail requires an active run and records the failure', async () => {
    await expect(service.fail(analysis.id, { code: 'GENERIC', message: 'boom' })).rejects.toThrow(
      ConflictError,
    );

    await service.launch(owner.id, project.id, analysis.id);

    const result = await service.fail(analysis.id, { code: 'GENERIC', message: 'boom' });

    expect(result).toMatchObject({ analysisId: analysis.id, status: 'FAILED' });

    const rows = await auditLogs.listForEntity('Analysis', analysis._id);

    expect(
      rows.some((row) => row.get('action') === 'AI_AUDIT_FAILED' && row.get('level') === 'ERROR'),
    ).toBe(true);
  });

  it('isAuditRunActive treats an empty trail as idle', () => {
    expect(isAuditRunActive([], Date.now())).toBe(false);
  });
});
