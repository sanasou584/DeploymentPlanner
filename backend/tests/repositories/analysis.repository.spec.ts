import { setTimeout as sleep } from 'node:timers/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';

import { Analysis, Project, User, type AnalysisDocument, type ProjectDocument, type UserDocument } from '../../src/models/entities/index.js';
import { AnalysisRepository, RecommendationRepository } from '../../src/repositories/index.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';

const USER2_ID = '64b1f6274190d8fe2ee1ba32' as unknown as Types.ObjectId;

let project: ProjectDocument;
let owner: UserDocument;
let analyses: AnalysisDocument[];

beforeAll(async () => {
  await connectTestingModule('analysis_repo_test');
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

  owner = await User.register({ name: 'owner', email: 'owner@example.com', password: 'LongEnough1!' });
  let current = await Project.createFor({ ownerId: owner._id, name: 'proj', description: 'd' });
  current = await current.connectRepository({ url: 'https://github.com/acme/repo' }, 'main');
  current = await current.markRepositoryVerified('main');
  project = current;

  const user2 = await User.register({ name: 'u2', email: 'u2@example.com', password: 'LongEnough1!' });
  let foreign = await Project.createFor({ ownerId: user2._id, name: 'foreign', description: 'x' });
  foreign = await foreign.connectRepository({ url: 'https://github.com/other/one' }, 'main');
  foreign = await foreign.markRepositoryVerified('main');
  await Analysis.request({ project: foreign, userId: USER2_ID });

  analyses = [];
  for (let i = 0; i < 2; i += 1) {
    analyses.push(await Analysis.request({ project, userId: owner._id }));
    await sleep(10);
  }
});

describe('AnalysisRepository', () => {
  describe('findLatestByProject', () => {
    it('returns the newest analysis of the project regardless of status', async () => {
      const repo = new AnalysisRepository();
      const latest = await repo.findLatestByProject(project._id);
      expect(String(latest?._id)).toBe(String(analyses[1]?._id));

      // A RUNNING later analysis is still the latest.
      const running = analyses[1];
      if (!running) throw new Error('missing fixture');
      const started = await running.start();
      expect(String((await repo.findLatestByProject(project._id))?._id)).toBe(String(started._id));
    });

    it('returns null for a project without analyses', async () => {
      expect(await new AnalysisRepository().findLatestByProject(USER2_ID)).toBeNull();
    });

    it('never returns another project snapshot analysis', async () => {
      const latest = await new AnalysisRepository().findLatestByProject(project._id);
      // Foreign analysis belongs to a different project.
      expect(String(latest?.project)).toBe(String(project._id));
    });
  });

  describe('listByProject', () => {
    it('lists newest first, only for the given project', async () => {
      const listed = await new AnalysisRepository().listByProject(project._id);
      expect(listed.map((analysis) => String(analysis._id))).toEqual(
        analyses.map((a) => String(a._id)).reverse(),
      );
      for (const analysis of listed) {
        expect(String(analysis.project)).toBe(String(project._id));
      }
    });
  });
});

describe('RecommendationRepository (fixture reuse)', () => {
  it('listByAnalysis is empty until recommendations exist', async () => {
    const target = analyses[0];
    if (!target) throw new Error('missing fixture');
    const listed = await new RecommendationRepository().listByAnalysis(target._id);
    expect(listed).toHaveLength(0);
  });
});

describe('strictQuery throw (AnalysisRepository)', () => {
  it('unknown filter keys throw instead of being stripped', async () => {
    await expect(new AnalysisRepository().exists({ notARealField: 1 })).rejects.toThrowError(/not in schema/);
  });
});
