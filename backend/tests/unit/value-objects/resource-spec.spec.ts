import { beforeAll, describe, expect, it } from 'vitest';
import type { Model, Document } from 'mongoose';

import {
  buildVoRootModel,
  newVoDoc,
  expectInvariantOnPath,
  validateCaptured,
  type VoRootDoc,
} from './vo-root.js';
import { InvariantViolationError } from '../../../src/domain/errors/index.js';
import { parseMemory } from '../../../src/domain/value-objects/k8s-quantities.js';

let RootModel: Model<Document>;

const VALID = {
  requests: { cpu: '250m', memory: '256Mi' },
  limits: { cpu: '500m', memory: '1Gi' },
};

beforeAll(() => {
  RootModel = buildVoRootModel();
});

describe('ResourceSpec value object', () => {
  it('accepts a valid spec with limits covering requests', async () => {
    const doc = newVoDoc(RootModel, { resources: VALID }) as VoRootDoc;

    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('rejects malformed cpu quantities', async () => {
    const doc = newVoDoc(RootModel, {
      resources: { ...VALID, requests: { cpu: 'wow', memory: '1Gi' } },
    }) as VoRootDoc;

    expect((await validateCaptured(doc))?.errors?.['resources.requests.cpu']).toBeDefined();
  });

  it('rejects malformed memory quantities', async () => {
    const doc = newVoDoc(RootModel, {
      resources: { ...VALID, requests: { cpu: '250m', memory: '1GB_fake' } },
    }) as VoRootDoc;

    expect((await validateCaptured(doc))?.errors?.['resources.requests.memory']).toBeDefined();
  });

  it('throws InvariantViolationError when cpu limit < cpu request', async () => {
    const doc = newVoDoc(RootModel, {
      resources: { requests: { cpu: '2', memory: '1Gi' }, limits: { cpu: '500m', memory: '2Gi' } },
    }) as VoRootDoc;

    const invariant = await expectInvariantOnPath(doc, 'resources');

    expect(invariant).toBeInstanceOf(InvariantViolationError);
    expect(invariant.message).toMatch(/limits must be greater than or equal to requests/);
  });

  it('throws InvariantViolationError when memory limit < memory request', async () => {
    const doc = newVoDoc(RootModel, {
      resources: {
        requests: { cpu: '100m', memory: '2Gi' },
        limits: { cpu: '1', memory: '256Mi' },
      },
    }) as VoRootDoc;

    const invariant = await expectInvariantOnPath(doc, 'resources');

    expect(invariant).toBeInstanceOf(InvariantViolationError);
    expect(invariant.message).toMatch(/limits must be greater than or equal to requests/);
  });

  it('compares correctly across units (1000m == 1 core, 1Mi == 1048576 bytes)', async () => {
    const doc = newVoDoc(RootModel, {
      resources: {
        requests: { cpu: '1000m', memory: '1Mi' },
        limits: { cpu: '1', memory: '1048576' },
      },
    }) as VoRootDoc;

    await expect(doc.validate()).resolves.toBeUndefined();
    expect(parseMemory('2Gi')).toBe(2 * 1024 ** 3);
  });

  it('exposes the invariant assertion method on the subdocument itself', () => {
    const doc = newVoDoc(RootModel, {
      resources: { requests: { cpu: '1', memory: '4Gi' }, limits: { cpu: '500m', memory: '1Gi' } },
    }) as VoRootDoc;
    const sub = doc.resources as unknown as { assertLimitsCoverRequests(): void };

    expect(() => sub.assertLimitsCoverRequests()).toThrowError(InvariantViolationError);
  });
});
