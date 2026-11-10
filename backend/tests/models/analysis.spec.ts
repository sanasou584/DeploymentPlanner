import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';

import {
  Analysis,
  type AnalysisDocument,
} from '../../src/models/entities/analysis.model.js';
import { Project } from '../../src/models/entities/project.model.js';
import { User } from '../../src/models/entities/user.model.js';
import { ConflictError, InvalidStateTransitionError, InvariantViolationError } from '../../src/domain/errors/index.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';
import { validatedErrorPaths } from '../helpers/schema-validation.js';

let ownerId: Types.ObjectId;
let projectId: Types.ObjectId;
let requestedById: Types.ObjectId;

const readyProjectStub = (overrides: { assert?: () => void } = {}) => ({
  id: projectId,
  repository: { branch: 'main' },
  assertCanBeAnalyzed: overrides.assert ?? (() => undefined),
});

beforeAll(async () => {
  await connectTestingModule('analyses_test');
  await Analysis.init();
  await Project.init();
  await User.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await Analysis.deleteMany({});
  await Project.deleteMany({}).setOptions({ withDeleted: true });
  await User.deleteMany({}).setOptions({ withDeleted: true });

  const user = (await User.register({
    name: 'Requester',
    email: 'requester@example.com',
    password: 'requester-pass',
  })) as unknown as { _id: Types.ObjectId };
  requestedById = user._id;

  const project = (await Project.createFor({ ownerId: user._id, name: 'app' })) as unknown as {
    _id: Types.ObjectId;
  };
  projectId = project._id;
  ownerId = user._id;
});

describe('Analysis model', () => {
  describe('field validation', () => {
    it('request() snapshots project + user + branch and defaults to PENDING', async () => {
      const analysis = await Analysis.request({
        project: readyProjectStub(),
        userId: requestedById,
      });

      expect(analysis.status).toBe('PENDING');
      expect(analysis.branch).toBe('main');
      expect(analysis.project).toEqual(projectId);
      expect(analysis.requestedBy).toEqual(requestedById);
      expect(analysis.docker?.hasDockerfile).toBe(false);
      expect(analysis.technologies).toEqual([]);
      expect(analysis.components).toEqual([]);
    });

    it('request() refuses when the project is not ready', async () => {
      await expect(
        Analysis.request({
          project: readyProjectStub({
            assert: () => {
              throw new InvariantViolationError('not ready');
            },
          }),
          userId: requestedById,
        }),
      ).rejects.toThrowError(InvariantViolationError);
    });

    it('rejects an unknown component type', async () => {
      const doc = new Analysis({
        project: projectId,
        requestedBy: requestedById,
        branch: 'main',
        components: [{ name: 'web', type: 'CLIQUAD' as never, rootPath: '/' }],
      });
      expect(await validatedErrorPaths(doc)).toContain('components.0.type');
      void doc;
    });

    it('rejects an unknown technology category', async () => {
      const doc = new Analysis({
        project: projectId,
        requestedBy: requestedById,
        branch: 'main',
        technologies: [{ name: 'node', category: 'NATURE' as never }],
      });
      expect(await validatedErrorPaths(doc)).toContain('technologies.0.category');
    });

    it('rejects an unknown docker finding severity', async () => {
      const doc = new Analysis({
        project: projectId,
        requestedBy: requestedById,
        branch: 'main',
        docker: {
          hasDockerfile: true,
          hasCompose: false,
          findings: [{ ruleId: 'R1', severity: 'FATAL' as never, message: 'bad' }],
        },
      });
      expect(await validatedErrorPaths(doc)).toContain('docker.findings.0.severity');
    });
  });

  describe('state transitions', () => {
    const requestOne = (): Promise<AnalysisDocument> =>
      Analysis.request({ project: readyProjectStub(), userId: requestedById });

    it('from RUNNING every legal transition works and illegal ones throw', async () => {
      const analysis = await (await requestOne()).start();

      // legal: COMPLETED
      const completed = await analysis.complete({ technologies: [] });
      expect(completed.status).toBe('COMPLETED');

      // starts a fresh one for FAILED
      const second = await (await requestOne()).start();
      const failed = await second.fail({ code: 'X', message: 'boom' });
      expect(failed.status).toBe('FAILED');
      expect(failed.startedAt).toBeInstanceOf(Date);
      expect(failed.finishedAt).toBeInstanceOf(Date);
    });

    it('PENDING cannot complete directly (legal fails: RUNNING not reached)', async () => {
      const a = await requestOne();
      await expect((a as AnalysisDocument).complete({ technologies: [] })).rejects.toThrowError(
        InvalidStateTransitionError,
      );
      await expect((a as AnalysisDocument).complete({ technologies: [] })).rejects.toThrowError(
        /cannot move from "PENDING" to "COMPLETED"/,
      );
    });

    it('start() twice is an illegal transition', async () => {
      const a = await (await requestOne()).start();
      await expect((a as AnalysisDocument).start()).rejects.toThrowError(/Invalid state transition/);
    });

    it('COMPLETED is terminal (start/complete/fail all reject)', async () => {
      const a = await (await requestOne()).start();
      const completed = await a.complete({ technologies: [] });
      await expect((completed as AnalysisDocument).start()).rejects.toThrowError(
        /Invalid state transition/,
      );
      await expect((completed as AnalysisDocument).fail({ code: 'X', message: 'x' })).rejects.toThrowError(
        /Invalid state transition/,
      );
    });

    it('FAILED is terminal', async () => {
      const a = await requestOne();
      const failed = await a.fail({ code: 'X', message: 'boom' });
      await expect((failed as AnalysisDocument).start()).rejects.toThrowError(
        /Invalid state transition/,
      );
      await expect((failed as AnalysisDocument).complete({ technologies: [] })).rejects.toThrowError(
        /Invalid state transition/,
      );
      await expect((failed as AnalysisDocument).fail({ code: 'X', message: 'again' })).rejects.toThrowError(
        /Invalid state transition/,
      );
    });
  });

  describe('complete() invariants', () => {
    it('rejects duplicate technologies (name+category, case-insensitive)', async () => {
      const analysis = await (await Analysis.request({
        project: readyProjectStub(),
        userId: requestedById,
      })).start();

      await expect(
        analysis.complete({
          technologies: [
            { name: 'Node.js', category: 'RUNTIME' },
            { name: 'node.js', category: 'RUNTIME' },
          ],
        }),
      ).rejects.toThrowError(ConflictError);
      await expect(
        analysis.complete({
          technologies: [
            { name: 'Node.js', category: 'RUNTIME' },
            { name: 'node.js', category: 'RUNTIME' },
          ],
        }),
      ).rejects.toThrowError(/Duplicate technology/);
    });

    it('same name in different categories is allowed', async () => {
      const analysis = await (await Analysis.request({
        project: readyProjectStub(),
        userId: requestedById,
      })).start();

      const completed = await analysis.complete({
        technologies: [
          { name: 'postgres', category: 'DATABASE' },
          { name: 'postgres', category: 'LIBRARY' },
        ],
      });
      expect(completed.technologies).toHaveLength(2);
    });

    it('rejects duplicate component names (case-insensitive)', async () => {
      const analysis = await (await Analysis.request({
        project: readyProjectStub(),
        userId: requestedById,
      })).start();

      await expect(
        analysis.complete({
          components: [
            { name: 'Web', type: 'FRONTEND', rootPath: '/web' },
            { name: 'web', type: 'BACKEND', rootPath: '/api' },
          ],
        }),
      ).rejects.toThrowError(/Duplicate component name/);
    });

    it('complete() works with no results (empty arrays) and stays COMPLETED', async () => {
      const analysis = await (await Analysis.request({
        project: readyProjectStub(),
        userId: requestedById,
      })).start();

      const completed = await analysis.complete({ technologies: [] });
      expect(completed.status).toBe('COMPLETED');
      expect((completed as AnalysisDocument).isFinished()).toBe(true);
    });
  });

  describe('queries and introspection', () => {
    it('isFinished() is false while PENDING or RUNNING', async () => {
      const pending = await Analysis.request({ project: readyProjectStub(), userId: requestedById });
      expect(pending.isFinished()).toBe(false);

      const running = await pending.start();
      expect(running.isFinished()).toBe(false);
    });

    it('hasBlockingDockerIssues() only reacts to ERROR severity', async () => {
      const analysis = await (await Analysis.request({
        project: readyProjectStub(),
        userId: requestedById,
      })).start();
      const withWarnings = await analysis.complete({
        docker: {
          hasDockerfile: true,
          hasCompose: false,
          findings: [{ ruleId: 'R1', severity: 'WARNING', message: 'small image' }],
        },
      });
      expect(withWarnings.hasBlockingDockerIssues()).toBe(false);

      const failedOne = await (
        await Analysis.request({ project: readyProjectStub(), userId: requestedById })
      ).start();
      const withErrors = await failedOne.complete({
        docker: {
          hasDockerfile: true,
          hasCompose: true,
          findings: [{ ruleId: 'R2', severity: 'ERROR', message: 'root user' }],
        },
      });
      expect(withErrors.hasBlockingDockerIssues()).toBe(true);
    });

    it('technologiesByCategory() groups names', async () => {
      const analysis = await (await Analysis.request({
        project: readyProjectStub(),
        userId: requestedById,
      })).start();
      const completed = await analysis.complete({
        technologies: [
          { name: 'typescript', category: 'LANGUAGE' },
          { name: 'react', category: 'FRAMEWORK' },
          { name: 'zod', category: 'LIBRARY' },
        ],
      });

      expect(completed.technologiesByCategory()).toEqual({
        LANGUAGE: ['typescript'],
        FRAMEWORK: ['react'],
        LIBRARY: ['zod'],
      });
    });

    it('durationMs virtual is ms between start and finish, undefined before', async () => {
      const pending = await Analysis.request({ project: readyProjectStub(), userId: requestedById });
      expect(pending.durationMs).toBeUndefined();

      const running = await pending.start();
      const completed = await running.complete({ technologies: [] });
      expect(completed.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('durationMs virtual is undefined without a start', async () => {
      const a = await Analysis.request({ project: readyProjectStub(), userId: requestedById });
      await a.fail({ code: 'X', message: 'before start' });
      expect((a as AnalysisDocument).durationMs).toBeUndefined();
    });
  });

  it('indexes exist for lookups', async () => {
    const analysisIndexes = (await Analysis.listIndexes()).map((index) => JSON.stringify(index.key));
    expect(analysisIndexes).toContain('{"project":1,"createdAt":-1}');
    expect(analysisIndexes).toContain('{"requestedBy":1}');
    void ownerId;
  });
});
