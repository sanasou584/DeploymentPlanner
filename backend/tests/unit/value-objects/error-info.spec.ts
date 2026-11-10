import { beforeAll, describe, expect, it } from 'vitest';
import type { Model, Document } from 'mongoose';

import { buildVoRootModel, newVoDoc, validateCaptured, type VoRootDoc } from './vo-root.js';

let RootModel: Model<Document>;

beforeAll(() => {
  RootModel = buildVoRootModel();
});

describe('ErrorInfo value object', () => {
  it('accepts code + message', async () => {
    const doc = newVoDoc(RootModel, {
      failure: { code: 'SOME_FAILURE', message: 'something broke' },
    }) as VoRootDoc;

    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('requires code', async () => {
    const doc = newVoDoc(RootModel, { failure: { message: 'x' } }) as VoRootDoc;

    expect((await validateCaptured(doc))?.errors?.['failure.code']).toBeDefined();
  });

  it('requires message', async () => {
    const doc = newVoDoc(RootModel, { failure: { code: 'CODE' } }) as VoRootDoc;

    expect((await validateCaptured(doc))?.errors?.['failure.message']).toBeDefined();
  });

  it('rejects blank code or message', async () => {
    const blankCode = newVoDoc(RootModel, { failure: { code: '   ', message: 'm' } }) as VoRootDoc;
    const blankMessage = newVoDoc(RootModel, { failure: { code: 'C', message: '  ' } }) as VoRootDoc;

    expect((await validateCaptured(blankCode))?.errors?.['failure.code']).toBeDefined();
    expect((await validateCaptured(blankMessage))?.errors?.['failure.message']).toBeDefined();
  });
});
