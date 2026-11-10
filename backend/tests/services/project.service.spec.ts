import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';

import { Project } from '../../src/models/entities/index.js';
import { createProjectService } from '../../src/services/project/project.service.js';
import { ConflictError, NotFoundError } from '../../src/domain/errors/index.js';
import {
  connectTestingModule,
  disconnectTestingModule,
} from '../integration/test-database.js';

const PAGE = { page: 1, limit: 20 };

beforeAll(async () => {
  await connectTestingModule('project_service_test');
  await Project.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await Project.deleteMany({}).setOptions({ withDeleted: true });
});

describe('Project service', () => {
  it('creates a project with zod-validated input and model defaults', async () => {
    const service = createProjectService();
    const project = await service.create(new Types.ObjectId().toHexString(), {
      name: 'mon-api-node',
    });

    expect(project.name).toBe('mon-api-node');
    expect(project.environment).toBe('DEVELOPMENT');
    expect(project.isDeleted).toBe(false);
  });

  it('references conflict-detection by unique index once the name is taken', async () => {
    const service = createProjectService();
    const owner = new Types.ObjectId().toHexString();

    await service.create(owner, { name: 'dup' });

    await expect(service.create(owner, { name: 'dup' })).rejects.toThrowError(
      ConflictError,
    );
  });

  it('the same name is fine for a different owner (index is owner-scoped)', async () => {
    const service = createProjectService();
    const ownerA = new Types.ObjectId().toHexString();
    const ownerB = new Types.ObjectId().toHexString();

    await service.create(ownerA, { name: 'shared-name' });

    await expect(
      service.create(ownerB, { name: 'shared-name' }),
    ).resolves.toMatchObject({ name: 'shared-name' });
  });

  it('a project belonging to someone else is NEVER FOUND (anti-IDOR)', async () => {
    const service = createProjectService();
    const owner = new Types.ObjectId().toHexString();
    const stranger = new Types.ObjectId().toHexString();
    const project = await service.create(owner, { name: 'secret' });

    await expect(service.get(stranger, project.id)).rejects.toThrowError(NotFoundError);
    await expect(
      service.update(stranger, project.id, { name: 'hijack' }),
    ).rejects.toThrowError(NotFoundError);
    await expect(service.remove(stranger, project.id)).rejects.toThrowError(NotFoundError);
  });

  it('update applies name + description in ONE save and trims', async () => {
    const service = createProjectService();
    const owner = new Types.ObjectId().toHexString();
    const project = await service.create(owner, { name: 'old-name' });

    const updated = await service.update(owner, project.id, {
      name: '  new-name ',
      description: '  fresh description  ',
    });

    expect(updated.name).toBe('new-name');
    expect(updated.description).toBe('fresh description');

    // One save -> exactly one document, no duplicates spawned by the race.
    expect(await service.list(owner, PAGE)).toMatchObject({
      pagination: { total: 1, pageCount: 1 },
    });
  });

  it('rename into a taken name conflicts via the unique index', async () => {
    const service = createProjectService();
    const owner = new Types.ObjectId().toHexString();
    const a = await service.create(owner, { name: 'alpha' });
    await service.create(owner, { name: 'beta' });

    await expect(
      service.update(owner, a.id, { name: 'beta' }),
    ).rejects.toThrowError(ConflictError);
  });

  it('list paginates newest-first and never returns other owners', async () => {
    const service = createProjectService();
    const owner = new Types.ObjectId().toHexString();
    const stranger = new Types.ObjectId().toHexString();

    for (let i = 1; i <= 25; i += 1) {
      await service.create(owner, { name: `p${i}` });
    }
    await service.create(stranger, { name: 'foreign' });

    const page1 = await service.list(owner, { page: 1, limit: 20 });
    expect(page1.pagination).toMatchObject({ page: 1, limit: 20, total: 25, pageCount: 2 });
    expect(page1.data).toHaveLength(20);
    expect(page1.data[0]?.name).toBe('p25');
    expect(page1.data[19]?.name).toBe('p6');

    const page2 = await service.list(owner, { page: 2, limit: 20 });
    expect(page2.data).toHaveLength(5);
    expect(page2.data[0]?.name).toBe('p5');

    const emptyOwnerList = await service.list(stranger, PAGE);
    expect(emptyOwnerList.pagination).toMatchObject({ total: 1, pageCount: 1 });
  });

  it('remove soft-deletes; get is 404 afterwards; the name is released', async () => {
    const service = createProjectService();
    const owner = new Types.ObjectId().toHexString();
    const project = await service.create(owner, { name: 'releasable' });

    await service.remove(owner, project.id);

    await expect(service.get(owner, project.id)).rejects.toThrowError(NotFoundError);

    await expect(
      service.create(owner, { name: 'releasable' }),
    ).resolves.toMatchObject({ name: 'releasable' });
  });

  it('availability reports exists=false for a free name', async () => {
    const service = createProjectService();
    const owner = new Types.ObjectId().toHexString();

    const result = await service.availability(owner, { name: 'brand-new' });

    expect(result).toEqual({ exists: false });
  });

  it('availability matches names case-insensitively', async () => {
    const service = createProjectService();
    const owner = new Types.ObjectId().toHexString();
    await service.create(owner, { name: 'Dup-Name' });

    expect(await service.availability(owner, { name: 'dup-name' })).toEqual({ exists: true });
    expect(await service.availability(owner, { name: 'DUP-NAME' })).toEqual({ exists: true });
    expect(await service.availability(owner, { name: 'Dup-Name' })).toEqual({ exists: true });
  });

  it('availability is owner-scoped: another workspace may reuse the name', async () => {
    const service = createProjectService();
    const owner = new Types.ObjectId().toHexString();
    const stranger = new Types.ObjectId().toHexString();
    await service.create(owner, { name: 'shared' });

    expect(await service.availability(stranger, { name: 'shared' })).toEqual({ exists: false });
  });

  it('availability ignores soft-deleted projects', async () => {
    const service = createProjectService();
    const owner = new Types.ObjectId().toHexString();
    const project = await service.create(owner, { name: 'gone' });

    await service.remove(owner, project.id);

    expect(await service.availability(owner, { name: 'gone' })).toEqual({ exists: false });
  });
});
