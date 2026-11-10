import { setTimeout as sleep } from 'node:timers/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';

import { Analysis, Project, Recommendation, User, type AnalysisDocument } from '../../src/models/entities/index.js';
import { RecommendationRepository } from '../../src/repositories/index.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';

const USER2_ID = '64b1f6274190d8fe2ee1ba32' as unknown as Types.ObjectId;

let analysis: AnalysisDocument;
let other: AnalysisDocument;

beforeAll(async () => {
  await connectTestingModule('recommendation_repo_test');
  await User.init();
  await Project.init();
  await Analysis.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await User.deleteMany({}).setOptions({ withDeleted: true });
  await Project.deleteMany({}).setOptions({ withDeleted: true });
  await Analysis.deleteMany({}).setOptions({ withDeleted: true });

  const owner = await User.register({ name: 'owner', email: 'owner@example.com', password: 'LongEnough1!' });
  const user2 = await User.register({ name: 'u2', email: 'u2@example.com', password: 'LongEnough1!' });
  let project = await Project.createFor({ ownerId: owner._id, name: 'proj', description: 'd' });
  project = await project.connectRepository({ url: 'https://github.com/acme/repo' }, 'main');
  project = await project.markRepositoryVerified('main');
  analysis = await Analysis.request({ project, userId: owner._id });

  const foreignProj = await Project.createFor({ ownerId: user2._id, name: 'foreign', description: 'x' });
  let foreign = await foreignProj.connectRepository({ url: 'https://github.com/other/one' }, 'main');
  foreign = await foreign.markRepositoryVerified('main');
  other = await Analysis.request({ project: foreign, userId: USER2_ID });
});

describe('RecommendationRepository', () => {
  describe('listByAnalysis', () => {
    it('returns an empty list when the analysis has no recommendations', async () => {
      expect(await new RecommendationRepository().listByAnalysis(analysis._id)).toHaveLength(0);
    });

    it('returns only the given analysis recommendations, newest first', async () => {
      await Analysis.updateOne({ _id: analysis._id }, { $set: { status: 'COMPLETED' } });
      const first = await Recommendation.fromAi({
        analysisId: analysis._id,
        generatedBy: { provider: 'openai', model: 'gpt-5' },
        type: 'REPLICAS',
        severity: 'INFO',
        title: 'bump replicas',
        description: '3 -> 5',
      });
      await sleep(10);
      const second = await Recommendation.fromAi({
        analysisId: analysis._id,
        generatedBy: { provider: 'openai', model: 'gpt-5' },
        type: 'MEMORY',
        severity: 'WARNING',
        title: 'memory',
        description: 'raise limit',
        componentName: 'api',
      });
      await Recommendation.fromAi({
        analysisId: other._id,
        generatedBy: { provider: 'openai', model: 'gpt-5' },
        type: 'CPU',
        severity: 'INFO',
        title: 'foreign',
        description: 'not this analysis',
      });

      const listed = await new RecommendationRepository().listByAnalysis(analysis._id);
      expect(listed.map((rec) => String(rec._id))).toEqual([String(second._id), String(first._id)]);
      for (const rec of listed) {
        expect(String(rec.analysis)).toBe(String(analysis._id));
      }
    });
  });
});

describe('strictQuery throw (RecommendationRepository)', () => {
  it('unknown filter keys throw instead of being stripped', async () => {
    await expect(new RecommendationRepository().exists({ notARealField: 1 })).rejects.toThrowError(/not in schema/);
  });
});
