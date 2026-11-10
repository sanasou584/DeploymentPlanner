import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';

import {
  Analysis,
  DeploymentPlan,
  Project,
  User,
  type AnalysisDocument,
  type PlanComponent,
  type ProjectDocument,
  type UserDocument,
} from '../../src/models/entities/index.js';
import { GeneratedFileRepository, PlanRepository } from '../../src/repositories/index.js';
import { GeneratedFile } from '../../src/models/entities/index.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';

const COMPONENT: Omit<PlanComponent, 'name'> = {
  type: 'BACKEND',
  containerPort: 3000,
  replicas: 2,
  resources: { requests: { cpu: '100m', memory: '128Mi' }, limits: { cpu: '500m', memory: '512Mi' } },
  hpa: { enabled: false },
  ingress: { enabled: false, tls: false },
};

let project: ProjectDocument;
let analysis: AnalysisDocument;
let creator: UserDocument;

beforeAll(async () => {
  await connectTestingModule('plan_repo_test');
  await User.init();
  await Project.init();
  await Analysis.init();
  await DeploymentPlan.init();
  await GeneratedFile.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await User.deleteMany({}).setOptions({ withDeleted: true });
  await Project.deleteMany({}).setOptions({ withDeleted: true });
  await Analysis.deleteMany({}).setOptions({ withDeleted: true });
  await DeploymentPlan.deleteMany({}).setOptions({ withDeleted: true });

  creator = await User.register({ name: 'dev', email: 'dev@example.com', password: 'LongEnough1!' });
  project = await Project.createFor({ ownerId: creator._id, name: 'proj', description: 'd' });
  project = await project.connectRepository({ url: 'https://github.com/acme/repo' }, 'main');
  project = await project.markRepositoryVerified('main');
  analysis = await Analysis.request({ project, userId: creator._id });

  const foreign = await User.register({ name: 'other', email: 'other@example.com', password: 'LongEnough1!' });
  let foreignProject = await Project.createFor({ ownerId: foreign._id, name: 'foreign', description: 'x' });
  foreignProject = await foreignProject.connectRepository({ url: 'https://github.com/other/one' }, 'main');
  foreignProject = await foreignProject.markRepositoryVerified('main');
  const foreignAnalysis = await Analysis.request({ project: foreignProject, userId: foreign._id });
  await DeploymentPlan.draft({
    projectId: foreignProject._id,
    analysisId: foreignAnalysis._id,
    createdBy: foreign._id,
    version: 1,
    components: [{ name: 'api', ...COMPONENT }],
  });
});

async function draftPlan(version: number, status?: 'APPROVED' | 'REJECTED'): Promise<{ id: Types.ObjectId }> {
  const plan = await DeploymentPlan.draft({
    projectId: project._id,
    analysisId: analysis._id,
    createdBy: creator._id,
    version,
    components: [{ name: `api-${version}`, ...COMPONENT }],
  });
  if (status === 'APPROVED') {
    await plan.approve(creator._id);
  }
  if (status === 'REJECTED') {
    await plan.reject(creator._id, 'nope');
  }
  return { id: plan._id };
}

describe('PlanRepository', () => {
  describe('nextVersionFor', () => {
    it('returns 1 when the project has no plan yet', async () => {
      expect(await new PlanRepository().nextVersionFor(project._id)).toBe(1);
    });

    it('returns latest version + 1 regardless of states', async () => {
      const repo = new PlanRepository();
      await draftPlan(1, 'APPROVED');
      await draftPlan(2, 'REJECTED');
      expect(await repo.nextVersionFor(project._id)).toBe(3);
    });
  });

  describe('findLatestByProject', () => {
    it('returns the highest-version plan of the project', async () => {
      const repo = new PlanRepository();
      await draftPlan(1, 'APPROVED');
      const second = await draftPlan(2, 'REJECTED');
      expect(String((await repo.findLatestByProject(project._id))?._id)).toBe(String(second.id));
    });

    it('returns null when no plan exists', async () => {
      expect(await new PlanRepository().findLatestByProject(project._id)).toBeNull();
    });
  });

  describe('findApprovedByProject', () => {
    it('returns the highest-version APPROVED plan, ignoring newer drafts/rejections', async () => {
      const repo = new PlanRepository();
      const v1 = await draftPlan(1, 'APPROVED');
      await draftPlan(2, 'REJECTED');
      expect(String((await repo.findApprovedByProject(project._id))?._id)).toBe(String(v1.id));
    });

    it('returns null when none is approved', async () => {
      await draftPlan(1, 'REJECTED');
      expect(await new PlanRepository().findApprovedByProject(project._id)).toBeNull();
    });
  });

  describe('listByProject', () => {
    it('lists the project plans newest (highest version) first', async () => {
      const repo = new PlanRepository();
      await draftPlan(1, 'APPROVED');
      await draftPlan(2, 'REJECTED');
      const listed = await repo.listByProject(project._id);
      expect(listed.map((plan) => plan.version)).toEqual([2, 1]);
      for (const plan of listed) {
        expect(String(plan.project)).toBe(String(project._id));
      }
    });
  });
});

describe('GeneratedFileRepository', () => {
  it('listByPlan returns only the files of the given plan, newest first', async () => {
    const first = await draftPlan(1, 'APPROVED');
    const second = await draftPlan(2, 'APPROVED');

    await GeneratedFile.generate({
      projectId: project._id,
      kind: 'DOCKERFILE',
      fileName: 'Dockerfile',
      path: 'Dockerfile',
      content: 'FROM node:20',
      planId: second.id,
      planVersion: 2,
    });
    await GeneratedFile.generate({
      projectId: project._id,
      kind: 'K8S_DEPLOYMENT',
      fileName: 'api.yaml',
      path: 'k8s/api.yaml',
      content: 'kind: Deployment',
      planId: first.id,
      planVersion: 1,
    });

    const firstPlanFiles = await new GeneratedFileRepository().listByPlan(first.id);
    expect(firstPlanFiles).toHaveLength(1);
    expect(firstPlanFiles[0]?.fileName).toBe('api.yaml');
    expect(String(firstPlanFiles[0]?.plan)).toBe(String(first.id));
  });
});

describe('strictQuery throw (PlanRepository)', () => {
  it('unknown filter keys throw instead of being stripped', async () => {
    await expect(new PlanRepository().exists({ notARealField: 1 })).rejects.toThrowError(/not in schema/);
  });
});
