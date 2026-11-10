import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';

import { WorkflowRun, type WorkflowRunDocument } from '../../src/models/entities/workflow-run.model.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';
import { validatedErrorPaths } from '../helpers/schema-validation.js';

const USER_ID = '64b1f6274190d8fe2ee1ba41' as unknown as Types.ObjectId;
const ANALYSIS_ID = '64b1f6274190d8fe2ee1ba42' as unknown as Types.ObjectId;
const PLAN_ID = '64b1f6274190d8fe2ee1ba43' as unknown as Types.ObjectId;

const createRun = (
  subject: { type: 'ANALYSIS' | 'PLAN' | 'DEPLOYMENT'; id: unknown },
): Promise<WorkflowRunDocument> =>
  new WorkflowRun({
    workflowName: 'analyze.yml',
    subject: subject as never,
    triggeredBy: USER_ID,
  }).save() as unknown as Promise<WorkflowRunDocument>;

beforeAll(async () => {
  await connectTestingModule('workflow_runs_test');
  await WorkflowRun.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await WorkflowRun.deleteMany({});
});

describe('WorkflowRun model', () => {
  it('creates a PENDING run with required workflowName + subject', async () => {
    const run = await createRun({ type: 'ANALYSIS', id: ANALYSIS_ID });

    expect(run.status).toBe('PENDING');
    expect(run.workflowName).toBe('analyze.yml');
    expect(run.startedAt).toBeNull();
    expect(run.triggeredBy).toBeTruthy();
  });

  it('workflowName + subject.type + subject.id are required', async () => {
    const bare = new WorkflowRun();
    const keys = await validatedErrorPaths(bare);
    expect(keys).toContain('workflowName');
    expect(keys.some((key) => key.startsWith('subject'))).toBe(true);
  });

  it('rejects an unknown subject type', async () => {
    const run = new WorkflowRun({
      workflowName: 'x',
      subject: { type: 'unknown' as never, id: ANALYSIS_ID },
    });
    const keys = await validatedErrorPaths(run);
    expect(keys.some((key) => key.startsWith('subject'))).toBe(true);
  });

  it('start() -> succeed() completes the machine', async () => {
    const succeeded = await (await (await createRun({ type: 'ANALYSIS', id: ANALYSIS_ID })).start()).succeed();

    expect(succeeded.status).toBe('SUCCEEDED');
    expect(succeeded.startedAt).toBeInstanceOf(Date);
    expect(succeeded.finishedAt).toBeInstanceOf(Date);
  });

  it('start() -> fail() records the error', async () => {
    const failed = await (
      await (await createRun({ type: 'PLAN', id: PLAN_ID })).start()
    ).fail({ code: 'CI_FAIL', message: 'pipeline step failed' });

    expect(failed.status).toBe('FAILED');
    expect(failed.error?.code).toBe('CI_FAIL');
    expect(failed.finishedAt).toBeInstanceOf(Date);
  });

  it('succeed() from PENDING is illegal; fail() from PENDING is legal', async () => {
    const run = await createRun({ type: 'ANALYSIS', id: ANALYSIS_ID });

    await expect(run.succeed()).rejects.toThrowError(/cannot move from "PENDING" to "SUCCEEDED"/);

    const failed = await run.fail({ code: 'X', message: 'dispatch error' });
    expect(failed.status).toBe('FAILED');
  });

  it('SUCCEEDED and FAILED are terminal', async () => {
    const succeeded = await (await (await createRun({ type: 'ANALYSIS', id: ANALYSIS_ID })).start()).succeed();
    await expect(succeeded.start()).rejects.toThrowError(/Invalid state transition/);
    await expect(succeeded.fail({ code: 'X', message: 'late error' })).rejects.toThrowError(
      /Invalid state transition/,
    );
    await expect(succeeded.succeed()).rejects.toThrowError(/Invalid state transition/);

    const failed = await (await createRun({ type: 'ANALYSIS', id: ANALYSIS_ID })).fail({
      code: 'X',
      message: 'direct',
    });
    await expect(failed.start()).rejects.toThrowError(/Invalid state transition/);
  });

  it('externalExecutionId is optional', async () => {
    const saved = (await new WorkflowRun({
      workflowName: 'plan-check.yml',
      subject: { type: 'PLAN', id: PLAN_ID } as never,
      externalExecutionId: 'run-4711',
    }).save()) as unknown as { externalExecutionId: string };

    expect(saved.externalExecutionId).toBe('run-4711');
  });
});
