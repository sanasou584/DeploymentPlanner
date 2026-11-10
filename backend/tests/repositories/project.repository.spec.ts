import { setTimeout as sleep } from 'node:timers/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';

import { Project, User, type ProjectDocument, type UserDocument } from '../../src/models/entities/index.js';
import { ProjectRepository } from '../../src/repositories/index.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';

const USER2_ID = '64b1f6274190d8fe2ee1ba32' as unknown as Types.ObjectId;

let owner: UserDocument;
let projects: ProjectDocument[] = [];

beforeAll(async () => {
  await connectTestingModule('project_repo_test');
  await User.init();
  await Project.init();
  owner = await User.register({ name: 'owner', email: 'owner@example.com', password: 'LongEnough1!' });
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await User.deleteMany({}).setOptions({ withDeleted: true });
  owner = await User.register({ name: 'owner', email: 'owner@example.com', password: 'LongEnough1!' });
  await Project.deleteMany({}).setOptions({ withDeleted: true });
  projects = [];
  for (let i = 0; i < 3; i += 1) {
    projects.push(await Project.createFor({ ownerId: owner._id, name: `proj-${i}`, description: 'd' }));
    await sleep(10);
  }
});

describe('ProjectRepository', () => {
  describe('findByOwner', () => {
    it('lists only the projects owned by the user, newest first', async () => {
      const other = await new ProjectRepository().findByOwner(USER2_ID);
      expect(other).toHaveLength(0);

      const mine = await new ProjectRepository().findByOwner(owner._id);
      expect(mine.map((project) => project.name)).toEqual(['proj-2', 'proj-1', 'proj-0']);
    });

    it('excludes soft-deleted projects unless withDeleted', async () => {
      const target = projects[1];
      if (!target) throw new Error('missing fixture');
      await target.softDelete();

      const repo = new ProjectRepository();
      expect((await repo.findByOwner(owner._id)).map((project) => project.name)).toEqual([
        'proj-2',
        'proj-0',
      ]);
      expect(
        (await repo.findByOwner(owner._id, { withDeleted: true })).map((project) => project.name),
      ).toEqual(['proj-2', 'proj-1', 'proj-0']);
    });
  });

  describe('findByIdForOwner', () => {
    it('returns the project only when it belongs to the owner', async () => {
      const repo = new ProjectRepository();
      const target = projects[0];
      if (!target) throw new Error('missing fixture');

      const mine = await repo.findByIdForOwner(target._id, owner._id);
      expect(mine?.name).toBe('proj-0');

      expect(await repo.findByIdForOwner(target._id, USER2_ID)).toBeNull();
      expect(await repo.findByIdForOwner('64b1f6274190d8fe2ee1ba41', owner._id)).toBeNull();
    });

    it('excludes soft-deleted projects unless withDeleted', async () => {
      const repo = new ProjectRepository();
      const target = projects[2];
      if (!target) throw new Error('missing fixture');
      await target.softDelete();

      expect(await repo.findByIdForOwner(target._id, owner._id)).toBeNull();
      expect((await repo.findByIdForOwner(target._id, owner._id, { withDeleted: true }))?.name).toBe(
        'proj-2',
      );
    });
  });
});

describe('strictQuery throw (ProjectRepository)', () => {
  it('unknown filter keys throw instead of being stripped', async () => {
    await expect(new ProjectRepository().exists({ notARealField: 1 })).rejects.toThrowError(/not in schema/);
  });
});
