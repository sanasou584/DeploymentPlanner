import { beforeAll, describe, expect, it } from 'vitest';
import type { Document, Model } from 'mongoose';

import { buildVoRootModel, newVoDoc, validateCaptured, type VoRootDoc } from './vo-root.js';

let RootModel: Model<Document>;

const VALID_REF = {
  owner: 'acme-corp',
  name: 'service-api',
  branch: 'main',
};

beforeAll(() => {
  RootModel = buildVoRootModel();
});

describe('RepositoryRef value object', () => {
  it('accepts a valid ref with defaults (provider=github, isValid=false)', async () => {
    const doc = newVoDoc(RootModel, { repo: VALID_REF }) as VoRootDoc;
    const repo = doc.repo as unknown as Record<string, unknown>;

    await expect(doc.validate()).resolves.toBeUndefined();
    expect(repo['provider']).toBe('github');
    expect(repo['isValid']).toBe(false);
    expect(repo['branch']).toBe('main');
  });

  it('exposes the derived url virtual', () => {
    const doc = newVoDoc(RootModel, { repo: VALID_REF }) as VoRootDoc;
    const repo = doc.repo as unknown as Record<string, unknown>;

    expect(repo['url']).toBe('https://github.com/acme-corp/service-api');
  });

  it('keeps verification metadata when provided', async () => {
    const at = new Date('2026-01-01T00:00:00Z');
    const doc = newVoDoc(RootModel, {
      repo: { ...VALID_REF, isValid: true, defaultBranch: 'main', lastVerifiedAt: at },
    }) as VoRootDoc;
    const repo = doc.repo as unknown as Record<string, unknown>;

    await expect(doc.validate()).resolves.toBeUndefined();
    expect(repo['isValid']).toBe(true);
    expect(repo['lastVerifiedAt']).toBe(at);
    expect(repo['defaultBranch']).toBe('main');
  });

  it('rejects unknown providers', async () => {
    const doc = newVoDoc(RootModel, { repo: { ...VALID_REF, provider: 'gitlab' } }) as VoRootDoc;

    expect((await validateCaptured(doc))?.errors?.['repo.provider']).toBeDefined();
  });

  it('rejects invalid owners and repo names', async () => {
    const badOwner = newVoDoc(RootModel, { repo: { ...VALID_REF, owner: '-bad' } }) as VoRootDoc;
    const badName = newVoDoc(RootModel, { repo: { ...VALID_REF, name: 'bad name' } }) as VoRootDoc;
    const ownerErr = await validateCaptured(badOwner);
    const nameErr = await validateCaptured(badName);

    expect(ownerErr?.errors?.['repo.owner']).toBeDefined();
    expect(nameErr?.errors?.['repo.name']).toBeDefined();
  });

  it('requires branch', async () => {
    const doc = newVoDoc(RootModel, { repo: { owner: 'acme', name: 'api' } }) as VoRootDoc;

    expect((await validateCaptured(doc))?.errors?.['repo.branch']).toBeDefined();
  });

  it('rejects empty branch', async () => {
    const doc = newVoDoc(RootModel, { repo: { ...VALID_REF, branch: '  ' } }) as VoRootDoc;

    expect((await validateCaptured(doc))?.errors?.['repo.branch']).toBeDefined();
  });

  it('does not sanitize owner/name silently', async () => {
    const doc = newVoDoc(RootModel, { repo: VALID_REF }) as VoRootDoc;
    const repo = doc.repo as unknown as Record<string, unknown>;

    await expect(doc.validate()).resolves.toBeUndefined();
    expect(repo['owner']).toBe('acme-corp');
    expect(repo['name']).toBe('service-api');
  });
});
