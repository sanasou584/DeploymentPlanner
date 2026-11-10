import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';

import { Deployment } from '../../src/models/entities/deployment.model.js';
import { InvariantViolationError } from '../../src/domain/errors/index.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';

const USER_ID = '64b1f6274190d8fe2ee1ba55' as unknown as Types.ObjectId;
const PROJECT_ID = '64b1f6274190d8fe2ee1ba56' as unknown as Types.ObjectId;
const PLAN_ID = '64b1f6274190d8fe2ee1ba57' as unknown as Types.ObjectId;

interface PlanStub {
  get(path: string): unknown;
  assertApproved(): void;
  id: unknown;
}

const makePlan = (approved: boolean, overrides: Partial<Record<string, unknown>> = {}): PlanStub => ({
  id: PLAN_ID,
  get: (path: string) => {
    if (path === 'version') return (overrides.version as number) ?? 2;
    if (path === 'project') return (overrides.project as Types.ObjectId) ?? PROJECT_ID;
    return null;
  },
  assertApproved: () => {
    if (!approved) {
      throw new InvariantViolationError('DeploymentPlan is not approved');
    }
  },
});

const gitops = { repositoryUrl: 'https://github.com/octo/repo', branch: 'gitops', path: 'k8s/output' };

beforeAll(async () => {
  await connectTestingModule('deployments_test');
  await Deployment.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await Deployment.deleteMany({});
});

describe('Deployment model', () => {
  describe('createFromPlan()', () => {
    it('creates a PENDING deployment with copied planVersion, project and gitops', async () => {
      const created = await Deployment.createFromPlan({
        plan: makePlan(true),
        user: USER_ID,
        environment: 'PRODUCTION',
        gitops,
      });

      expect(created.status).toBe('PENDING');
      expect(created.planVersion).toBe(2);
      expect(created.environment).toBe('PRODUCTION');
      expect(String(created.plan)).toBe(String(PLAN_ID));
      expect(String(created.project)).toBe(String(PROJECT_ID));
      expect(created.gitops.commitSha).toBeUndefined();
      expect(created.startedAt).toBeNull();
      expect(created.finishedAt).toBeNull();
    });

    it('throws unless the plan is approved', async () => {
      await expect(
        Deployment.createFromPlan({
          plan: makePlan(false),
          user: USER_ID,
          environment: 'DEVELOPMENT',
          gitops,
        }),
      ).rejects.toThrowError(InvariantViolationError);
      await expect(
        Deployment.createFromPlan({
          plan: makePlan(false),
          user: USER_ID,
          environment: 'DEVELOPMENT',
          gitops,
        }),
      ).rejects.toThrowError(/not approved/);
    });

    it('rejects an unknown environment', async () => {
      await Deployment.deleteMany({});
      const error = await (async () => {
        try {
          return await Deployment.createFromPlan({
            plan: makePlan(true),
            user: USER_ID,
            environment: 'UAT' as never,
            gitops,
          });
        } catch (caught: unknown) {
          return caught;
        }
      })();

      expect(String((error as Error).message)).toMatch(/environment/);
    });
  });

  describe('state transitions', () => {
    const createOne = async (): Promise<Awaited<ReturnType<typeof Deployment.createFromPlan>>> =>
      Deployment.createFromPlan({
        plan: makePlan(true),
        user: USER_ID,
        environment: 'STAGING',
        gitops,
      });

    it('PENDING -> IN_PROGRESS stamps startedAt', async () => {
      const running = await (await createOne()).start();

      expect(running.status).toBe('IN_PROGRESS');
      expect(running.startedAt).toBeInstanceOf(Date);
    });

    it('PENDING -> CANCELLED is legal and terminal', async () => {
      const cancelled = await (await createOne()).cancel();

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.finishedAt).toBeInstanceOf(Date);
      expect(cancelled.isTerminal()).toBe(true);
      await expect(cancelled.start()).rejects.toThrowError(/Invalid state transition/);
    });

    it('PENDING cannot succeed/fail directly', async () => {
      const deployment = await createOne();

      await expect(deployment.markSucceeded()).rejects.toThrowError(
        /cannot move from "PENDING" to "SUCCEEDED"/,
      );
      await expect(deployment.markFailed({ code: 'X', message: 'x' })).rejects.toThrowError(
        /cannot move from "PENDING" to "FAILED"/,
      );
    });

    it('recordGitopsCommit stores the sha and recordArgoStatus merges fields', async () => {
      const running = await (await createOne()).start();
      const committed = await running.recordGitopsCommit('abc123def456');

      expect(committed.get('gitops.commitSha')).toBe('abc123def456');

      const argoApplied = await committed.recordArgoStatus({
        applicationName: 'web-prod',
        syncStatus: 'SYNCED',
        healthStatus: 'HEALTHY',
        lastSyncedAt: new Date(),
      });

      expect(argoFieldsOf(argoApplied)).toEqual({
        applicationName: 'web-prod',
        syncStatus: 'SYNCED',
        healthStatus: 'HEALTHY',
      });
      expect(argoApplied.get('argo.lastSyncedAt')).toBeInstanceOf(Date);
      argoApplied.isTerminal();
    });

    it('IN_PROGRESS -> SUCCEEDED | FAILED | CANCELLED all legal and terminal', async () => {
      const started = await (await createOne()).start();

      const succeeded = await started.markSucceeded();
      expect(succeeded.status).toBe('SUCCEEDED');
      expect(succeeded.isTerminal()).toBe(true);
      expect(succeeded.durationMs).toBeGreaterThanOrEqual(0);

      const failedFlow = await (await createOne()).start();
      const failed = await failedFlow.markFailed({ code: 'E_ILLEGAL_STATE', message: 'nope' });
      expect(failed.status).toBe('FAILED');
      expect(failed.error?.code).toBe('E_ILLEGAL_STATE');
      await expect(failed.markSucceeded()).rejects.toThrowError(/Invalid state transition/);

      const cancelFlow = await (await createOne()).start();
      const cancelled = await cancelFlow.cancel();
      expect(cancelled.status).toBe('CANCELLED');
    });

    it('durationMs virtual is undefined outside SUCCEEDED/FAILED/CANCELLED', async () => {
      const deployment = await createOne();
      expect(deployment.durationMs).toBeUndefined();
    });

    it('durationMs virtual is undefined pending -> missing startedAt', async () => {
      const deployment = await createOne();
      const cancelled = await deployment.cancel();
      expect(cancelled.durationMs).toBeUndefined();
    });
  });
});

function argoFieldsOf(doc: { get(path: string): unknown }): Record<string, unknown> {
  // returns the actual argo fields minus internal lastSyncedAt data variation
  const argo = doc.get('argo') as Record<string, unknown> | null;
  return {
    applicationName: argo?.applicationName,
    syncStatus: argo?.syncStatus,
    healthStatus: argo?.healthStatus,
  };
}
