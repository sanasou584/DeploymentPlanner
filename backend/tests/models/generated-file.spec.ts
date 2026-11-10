import { createHash } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';

import {
  GeneratedFile,
  contentHashOf,
  type GeneratedFileDocument,
} from '../../src/models/entities/generated-file.model.js';
import { InvariantViolationError } from '../../src/domain/errors/index.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';
import { validatedErrorPaths } from '../helpers/schema-validation.js';

const PROJECT_ID = '64b1f6274190d8fe2ee1ba60' as unknown as Types.ObjectId;
const PLAN_ID = '64b1f6274190d8fe2ee1ba61' as unknown as Types.ObjectId;
const ANALYSIS_ID = '64b1f6274190d8fe2ee1ba62' as unknown as Types.ObjectId;

const DOCKERFILE_CONTENT = 'FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nCMD ["node", "dist/main.js"]\n';

const generateDockerfile = (): Promise<GeneratedFileDocument> =>
  GeneratedFile.generate({
    projectId: PROJECT_ID,
    kind: 'DOCKERFILE',
    fileName: 'Dockerfile',
    path: 'Dockerfile',
    content: DOCKERFILE_CONTENT,
    analysisId: ANALYSIS_ID,
  });

beforeAll(async () => {
  await connectTestingModule('generated_files_test');
  await GeneratedFile.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await GeneratedFile.deleteMany({});
});

describe('GeneratedFile model', () => {
  describe('generation + hash invariant', () => {
    it('generate() stores sha256(content) and validation starts PENDING', async () => {
      const file = await generateDockerfile();

      expect(file.contentHash).toBe(createHash('sha256').update(DOCKERFILE_CONTENT).digest('hex'));
      expect(file.validation.status).toBe('PENDING');
    });

    it('rejects empty content', async () => {
      const doc = new GeneratedFile({
        project: PROJECT_ID,
        kind: 'DOCKERFILE',
        analysis: ANALYSIS_ID,
        fileName: 'Dockerfile',
        path: 'Dockerfile',
        content: '',
        contentHash: 'x',
      });
      const keys = await validatedErrorPaths(doc);
      expect(keys).toContain('content');
    });

    it('rejects content over 1 MB', async () => {
      const big = 'a'.repeat(1024 * 1024 + 1);
      const doc = new GeneratedFile({
        project: PROJECT_ID,
        kind: 'DOCKERFILE',
        analysis: ANALYSIS_ID,
        fileName: 'big',
        path: 'docs/big.txt',
        content: big,
        contentHash: createHash('sha256').update(big).digest('hex'),
      });
      expect(await validatedErrorPaths(doc)).toContain('content');
    });

    it('rejects a stale mismatched hash at validation time', async () => {
      const file = await generateDockerfile();
      file.set('content', 'tampered');
      await expect((file as GeneratedFileDocument).save()).rejects.toThrowError(
        /contentHash must match/,
      );
    });
  });

  describe('kind dependencies', () => {
    it('K8S_* and GITHUB_WORKFLOW require plan AND planVersion', async () => {
      for (const [kind, errorSubstring] of [
        ['K8S_DEPLOYMENT', 'plan'],
        ['GITHUB_WORKFLOW', 'plan version'],
      ] as const) {
        const error = await (async () => {
          try {
            return await GeneratedFile.generate({
              projectId: PROJECT_ID,
              kind,
              fileName: 'file.yaml',
              path: 'k8s/file.yaml',
              content: 'yaml: true',
            });
          } catch (caught: unknown) {
            return caught;
          }
        })();

        expect(String((error as { message?: string }).message ?? '')).toMatch(
          new RegExp(errorSubstring.replace(' ', '\\s+') + '|required|needs', 'i'),
        );
      }
    });

    it('K8S YAML is accepted with plan + planVersion', async () => {
      const file = await GeneratedFile.generate({
        projectId: PROJECT_ID,
        kind: 'K8S_DEPLOYMENT',
        fileName: 'web-deployment.yaml',
        path: 'k8s/web-deployment.yaml',
        content: 'apiVersion: apps/v1\nkind: Deployment\n',
        planId: PLAN_ID,
        planVersion: 1,
        componentName: 'web',
      });

      expect(String(file.plan)).toBe(String(PLAN_ID));
      expect(file.planVersion).toBe(1);
      expect(file.componentName).toBe('web');
    });

    it('DOCKERFILE needs analysis or plan (analysis accepted)', async () => {
      await expect(generateDockerfile()).resolves.toBeTruthy();
    });

    it('DOCKERFILE without plan or analysis is rejected', async () => {
      const error = await (async () => {
        try {
          return await GeneratedFile.generate({
            projectId: PROJECT_ID,
            kind: 'DOCKERFILE',
            fileName: 'Dockerfile',
            path: 'Dockerfile',
            content: DOCKERFILE_CONTENT,
          });
        } catch (caught: unknown) {
          return caught;
        }
      })();

      expect(String((error as { message?: string }).message ?? '')).toMatch(/DOCKERFILE/i);
    });
  });

  describe('content lifecycle', () => {
    it('replaceContent recomputes hash and resets validation to PENDING', async () => {
      const file = await generateDockerfile();
      const valid = await file.markValid();
      expect(valid.validation.status).toBe('VALID');

      const NEXT = 'FROM node:22-bookworm\nCMD ["node"]\n';
      const replaced = await valid.replaceContent(NEXT);

      expect(replaced.content).toBe(NEXT);
      expect(replaced.contentHash).toBe(contentHashOf(NEXT));
      expect(replaced.validation.status).toBe('PENDING');
      expect(replaced.validation.validatedAt).toBeUndefined();
    });

    it('markValid() stamps validatedAt', async () => {
      const valid = await (await generateDockerfile()).markValid();

      expect(valid.validation.status).toBe('VALID');
      expect(valid.validation.validatedAt).toBeInstanceOf(Date);
      expect(valid.validation.issues).toEqual([]);
    });

    it('markInvalid() records issues and stamps validatedAt', async () => {
      const invalidated = await (await generateDockerfile()).markInvalid([
        'FROM scratch is not allowed',
      ]);

      expect(invalidated.validation.status).toBe('INVALID');
      expect(invalidated.validation.issues).toEqual(['FROM scratch is not allowed']);
      expect(invalidated.validation.validatedAt).toBeInstanceOf(Date);
    });

    it('markInvalid() without issues throws an invariant', async () => {
      const file = await generateDockerfile();

      await expect(file.markInvalid([])).rejects.toThrowError(InvariantViolationError);
      await expect(file.markInvalid([])).rejects.toThrowError(/at least one issue/);
    });
  });

  describe('isStaleFor()', () => {
    it('false when planVersion matches, true otherwise or when missing', async () => {
      const fresh = await GeneratedFile.generate({
        projectId: PROJECT_ID,
        kind: 'K8S_DEPLOYMENT',
        fileName: 'web-deployment.yaml',
        path: 'k8s/web-deployment.yaml',
        content: 'kind: Deployment\n',
        planId: PLAN_ID,
        planVersion: 3,
      });
      const staleByMissingPlanVersion = await GeneratedFile.generate({
        projectId: PROJECT_ID,
        kind: 'DOCKERFILE',
        fileName: 'Dockerfile',
        path: 'Dockerfile',
        content: DOCKERFILE_CONTENT,
        analysisId: ANALYSIS_ID,
        planId: PLAN_ID,
      });

      expect(fresh.isStaleFor({ get: () => 3 })).toBe(false);
      expect(fresh.isStaleFor({ get: () => 4 })).toBe(true);
      expect(staleByMissingPlanVersion.isStaleFor({ get: () => 3 })).toBe(true);
    });
  });
});
