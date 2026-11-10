import { beforeAll, describe, expect, it } from 'vitest';
import type { Model, Document } from 'mongoose';

import { buildVoRootModel, newVoDoc, expectInvariantOnPath, type VoRootDoc } from './vo-root.js';
import { InvariantViolationError } from '../../../src/domain/errors/index.js';

let RootModel: Model<Document>;

const VALID_HPA = {
  enabled: true,
  minReplicas: 2,
  maxReplicas: 10,
  targetCpuUtilizationPercent: 60,
  targetMemoryUtilizationPercent: 70,
};

beforeAll(() => {
  RootModel = buildVoRootModel();
});

describe('HpaSpec value object', () => {
  it('accepts valid enabled spec', async () => {
    const doc = newVoDoc(RootModel, { hpa: VALID_HPA }) as VoRootDoc;

    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('accepts disabled spec without numeric constraints', async () => {
    const doc = newVoDoc(RootModel, { hpa: { enabled: false } }) as VoRootDoc;

    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('defaults enabled to false', () => {
    const doc = newVoDoc(RootModel, { hpa: { enabled: undefined } }) as VoRootDoc;

    expect((doc.hpa as unknown as Record<string, unknown>)['enabled']).toBe(false);
  });

  it('requires minReplicas >= 1 when enabled', async () => {
    const zero = await expectInvariantOnPath(
      newVoDoc(RootModel, { hpa: { ...VALID_HPA, minReplicas: 0 } }) as VoRootDoc,
      'hpa',
    );
    const missing = await expectInvariantOnPath(
      newVoDoc(RootModel, { hpa: { ...VALID_HPA, minReplicas: undefined } }) as VoRootDoc,
      'hpa',
    );

    expect(zero).toBeInstanceOf(InvariantViolationError);
    expect(zero.message).toMatch(/minReplicas >= 1/);
    expect(missing).toBeInstanceOf(InvariantViolationError);
  });

  it('requires maxReplicas >= minReplicas when enabled', async () => {
    const tooSmall = await expectInvariantOnPath(
      newVoDoc(RootModel, { hpa: { ...VALID_HPA, maxReplicas: 1 } }) as VoRootDoc,
      'hpa',
    );
    const missing = await expectInvariantOnPath(
      newVoDoc(RootModel, { hpa: { ...VALID_HPA, maxReplicas: undefined } }) as VoRootDoc,
      'hpa',
    );

    expect(tooSmall).toBeInstanceOf(InvariantViolationError);
    expect(tooSmall.message).toMatch(/maxReplicas >= minReplicas/);
    expect(missing).toBeInstanceOf(InvariantViolationError);
    expect(missing.message).toMatch(/maxReplicas >= minReplicas/);
  });

  it('requires targetCpuUtilizationPercent in 1..100 when enabled', async () => {
    const zero = await expectInvariantOnPath(
      newVoDoc(RootModel, { hpa: { ...VALID_HPA, targetCpuUtilizationPercent: 0 } }) as VoRootDoc,
      'hpa',
    );
    const high = await expectInvariantOnPath(
      newVoDoc(RootModel, { hpa: { ...VALID_HPA, targetCpuUtilizationPercent: 101 } }) as VoRootDoc,
      'hpa',
    );
    const missing = await expectInvariantOnPath(
      newVoDoc(RootModel, {
        hpa: { ...VALID_HPA, targetCpuUtilizationPercent: undefined },
      }) as VoRootDoc,
      'hpa',
    );

    expect(zero).toBeInstanceOf(InvariantViolationError);
    expect(high).toBeInstanceOf(InvariantViolationError);
    expect(missing).toBeInstanceOf(InvariantViolationError);
  });

  it('rejects out-of-range optional targetMemoryUtilizationPercent', async () => {
    const bad = await expectInvariantOnPath(
      newVoDoc(RootModel, { hpa: { ...VALID_HPA, targetMemoryUtilizationPercent: 500 } }) as VoRootDoc,
      'hpa',
    );

    expect(bad).toBeInstanceOf(InvariantViolationError);
    expect(bad.message).toMatch(/targetMemoryUtilizationPercent/);
  });

  it('accepts equal min/max and boundary values 1 and 100', async () => {
    const doc = newVoDoc(RootModel, {
      hpa: { ...VALID_HPA, minReplicas: 1, maxReplicas: 1, targetCpuUtilizationPercent: 100 },
    }) as VoRootDoc;

    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('ignores numeric rules when disabled, even with garbage values', async () => {
    const doc = newVoDoc(RootModel, {
      hpa: { enabled: false, minReplicas: 0, maxReplicas: 0, targetCpuUtilizationPercent: 0 },
    }) as VoRootDoc;

    await expect(doc.validate()).resolves.toBeUndefined();
  });
});
