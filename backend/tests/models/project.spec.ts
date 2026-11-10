import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';

import { Project, type ProjectDocument } from '../../src/models/entities/project.model.js';
import { User } from '../../src/models/entities/user.model.js';
import { InvariantViolationError, NotFoundError } from '../../src/domain/errors/index.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';
import { validatedErrorPaths } from '../helpers/schema-validation.js';

let ownerId: Types.ObjectId;

const registerOwner = async (email: string): Promise<Types.ObjectId> => {
  const user = (await User.register({ name: 'Owner', email, password: 'owner-pass-1' })) as unknown as {
    _id: Types.ObjectId;
  };
  return user._id;
};

beforeAll(async () => {
  await connectTestingModule('projects_test');
  await Project.init();
  await User.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await Project.deleteMany({}).setOptions({ withDeleted: true });
  await User.deleteMany({}).setOptions({ withDeleted: true });
  ownerId = await registerOwner('owner@example.com');
});

describe('Project model', () => {
  describe('field validation', () => {
    it('creates a valid project with defaults', async () => {
      const project = await Project.createFor({ ownerId, name: 'my-app' });

      expect(project.name).toBe('my-app');
      expect(project.environment).toBe('DEVELOPMENT');
      expect(project.isDeleted).toBe(false);
    });

    it('rejects an empty name', async () => {
      const project = new Project({ owner: ownerId, name: '   ' });
      expect(await validatedErrorPaths(project)).toContain('name');
    });

    it('rejects a name longer than 120 characters', async () => {
      const project = new Project({ owner: ownerId, name: 'n'.repeat(121) });
      expect(await validatedErrorPaths(project)).toContain('name');
    });

    it('rejects an unknown environment', async () => {
      const project = new Project({
        owner: ownerId,
        name: 'x',
        environment: 'UAT' as unknown as 'DEVELOPMENT',
      });
      expect(await validatedErrorPaths(project)).toContain('environment');
    });

    it('rejects a description longer than 1000 characters', async () => {
      const project = new Project({
        owner: ownerId,
        name: 'x',
        description: 'd'.repeat(1001),
      });
      expect(await validatedErrorPaths(project)).toContain('description');
    });
  });

  describe('unique (owner, name) among non-deleted (partial index)', () => {
    it('rejects a duplicate (owner, name) for live projects', async () => {
      await Project.createFor({ ownerId, name: 'app' });
      await expect(Project.createFor({ ownerId, name: 'app' })).rejects.toThrowError(
        /duplicate key|E11000/,
      );
    });

    it('allows name re-use once the old project is soft deleted', async () => {
      const first = await Project.createFor({ ownerId, name: 'app' });
      await first.softDelete();

      const reused = await Project.createFor({ ownerId, name: 'app' });
      expect(reused.name).toBe('app');
    });

    it('allows the same name for different owners', async () => {
      await Project.createFor({ ownerId, name: 'shared-name' });
      const otherId = await registerOwner('other-owner@example.com');

      const second = await Project.createFor({ ownerId: otherId, name: 'shared-name' });
      expect(second.owner).not.toEqual(ownerId);
    });
  });

  describe('repository behavior', () => {
    const newProject = (): Promise<ProjectDocument> => Project.createFor({ ownerId, name: 'app' });

    it('connectRepository accepts a URL and resets isValid', async () => {
      const after = await (await newProject()).connectRepository(
        { url: 'https://github.com/octocat/my-app.git' },
        'main',
      );
      const repository = after.get('repository') as { owner: string; name: string; isValid: boolean };

      expect(repository.owner).toBe('octocat');
      expect(repository.name).toBe('my-app');
      expect(repository.isValid).toBe(false);
    });

    it('connectRepository accepts explicit coordinates', async () => {
      const after = await (await newProject()).connectRepository({ owner: 'octo', name: 'store' }, 'dev');
      const repository = after.get('repository') as { owner: string; name: string };

      expect(repository.owner).toBe('octo');
      expect(repository.name).toBe('store');
    });

    it('connectRepository rejects non-GitHub-HTTPS URLs', async () => {
      const project = await newProject();
      await expect(
        project.connectRepository({ url: 'https://gitlab.com/octo/app' }, 'main'),
      ).rejects.toThrowError(/Invalid GitHub repository URL/);
    });

    it('changeBranch keeps coordinates but resets verification', async () => {
      const connected = await (await newProject()).connectRepository({ owner: 'octo', name: 'store' }, 'main');
      const verified = await connected.markRepositoryVerified('main');
      const verifiedRepo = verified.get('repository') as { isValid: boolean } | undefined;
      expect(verifiedRepo?.isValid).toBe(true);

      const switched = await verified.changeBranch('dev');
      const repository = switched.get('repository') as { branch: string; isValid: boolean };
      expect(repository?.branch).toBe('dev');
      expect(repository?.isValid).toBe(false);
    });

    it('changeBranch without a repository throws NotFoundError', async () => {
      await expect((await newProject()).changeBranch('main')).rejects.toThrowError(NotFoundError);
    });

    it('markRepositoryVerified stamps defaultBranch + lastVerifiedAt', async () => {
      const connected = await (await newProject()).connectRepository({ owner: 'octo', name: 'store' }, 'main');
      const verified = await connected.markRepositoryVerified('main');
      const repository = verified.get('repository') as {
        isValid: boolean;
        defaultBranch?: string;
        lastVerifiedAt?: Date;
      };

      expect(repository.isValid).toBe(true);
      expect(repository.defaultBranch).toBe('main');
      expect(repository.lastVerifiedAt).toBeInstanceOf(Date);
    });

    it('markRepositoryInvalid records the reason and clears verification', async () => {
      const connected = await (await newProject()).connectRepository({ owner: 'octo', name: 'store' }, 'main');
      const verified = await connected.markRepositoryVerified('main');
      const invalidated = await verified.markRepositoryInvalid('404 not found');
      const repository = invalidated.get('repository') as {
        isValid: boolean;
        lastVerificationError?: string;
      };

      expect(repository.isValid).toBe(false);
      expect(repository.lastVerificationError).toBe('404 not found');
      expect(invalidated.canBeAnalyzed()).toBe(false);
      expect(() => invalidated.assertCanBeAnalyzed()).toThrowError(InvariantViolationError);
    });
  });

  describe('canBeAnalyzed rules', () => {
    it('is false without a repository', async () => {
      const project = await Project.createFor({ ownerId, name: 'app' });
      expect(project.canBeAnalyzed()).toBe(false);
      expect(() => project.assertCanBeAnalyzed()).toThrowError(InvariantViolationError);
    });

    it('is true once the repository is verified', async () => {
      const connected = await (await Project.createFor({ ownerId, name: 'app' })).connectRepository(
        { owner: 'octo', name: 'store' },
        'main',
      );
      const after = await connected.markRepositoryVerified('main');

      expect(after.canBeAnalyzed()).toBe(true);
      expect(() => after.assertCanBeAnalyzed()).not.toThrow();
    });
  });

  describe('ownership + lifecycle', () => {
    it('isOwnedBy matches only the owner', async () => {
      const project = await Project.createFor({ ownerId, name: 'app' });
      expect(project.isOwnedBy(ownerId)).toBe(true);
      expect(project.isOwnedBy('64b1f6274190d8fe2ee1ba77' as unknown as Types.ObjectId)).toBe(false);
    });

    it('applyUpdate sets both fields with ONE save', async () => {
      const project = await Project.createFor({ ownerId, name: 'app' });
      const updated = await project.applyUpdate({
        name: '  app-v2 ',
        description: 'hello world',
      });
      expect(updated.name).toBe('app-v2');
      expect(updated.description).toBe('hello world');
    });

    it('applyUpdate rejects an empty fields call (invariant: nothing to save)', async () => {
      const project = await Project.createFor({ ownerId, name: 'app' });
      await expect(project.applyUpdate({})).rejects.toThrowError(
        InvariantViolationError,
      );
    });

    it('soft-deleted projects are hidden from default queries', async () => {
      const project = await Project.createFor({ ownerId, name: 'app' });
      await project.softDelete();

      expect(await Project.findById(project.id)).toBeNull();
      const revived = (await Project.findById(project.id).setOptions({
        withDeleted: true,
      })) as ProjectDocument;
      await revived.restore();
      expect((await Project.findById(project.id))?.get('name')).toBe('app');
    });
  });
});
