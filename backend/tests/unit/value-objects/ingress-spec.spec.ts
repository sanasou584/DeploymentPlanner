import { beforeAll, describe, expect, it } from 'vitest';
import type { Model, Document } from 'mongoose';

import { buildVoRootModel, newVoDoc, expectInvariantOnPath, type VoRootDoc } from './vo-root.js';
import { InvariantViolationError } from '../../../src/domain/errors/index.js';

let RootModel: Model<Document>;

beforeAll(() => {
  RootModel = buildVoRootModel();
});

describe('IngressSpec value object', () => {
  it('accepts a valid enabled spec and defaults the path', async () => {
    const doc = newVoDoc(RootModel, {
      ingress: { enabled: true, host: 'app.example.com' },
    }) as VoRootDoc;

    await expect(doc.validate()).resolves.toBeUndefined();
    const ingress = doc.ingress as unknown as Record<string, unknown>;
    expect(ingress['path']).toBe('/');
  });

  it('accepts a disabled spec without host', async () => {
    const doc = newVoDoc(RootModel, { ingress: {} }) as VoRootDoc;

    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('defaults enabled=false, tls=false, path=/', () => {
    const doc = newVoDoc(RootModel, { ingress: {} }) as VoRootDoc;
    const ingress = doc.ingress as unknown as Record<string, unknown>;

    expect(ingress['enabled']).toBe(false);
    expect(ingress['tls']).toBe(false);
    expect(ingress['path']).toBe('/');
  });

  it('requires host when enabled', async () => {
    const doc = newVoDoc(RootModel, {
      ingress: { enabled: true, path: '/api', tls: false, host: undefined },
    }) as VoRootDoc;

    const invariant = await expectInvariantOnPath(doc, 'ingress');

    expect(invariant).toBeInstanceOf(InvariantViolationError);
    expect(invariant.message).toMatch(/requires a valid host/);
  });

  it('requires a VALID hostname when enabled', async () => {
    for (const bad of ['https://bad.example', 'bad host.com', 'bad_host.example']) {
      const doc = newVoDoc(RootModel, {
        ingress: { enabled: true, path: '/api', tls: true, host: bad },
      }) as VoRootDoc;

      const invariant = await expectInvariantOnPath(doc, 'ingress');

      expect(invariant).toBeInstanceOf(InvariantViolationError);
    }
  });
});
