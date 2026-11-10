import { setTimeout as sleep } from 'node:timers/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';

import {
  Analysis,
  Deployment,
  DeploymentPlan,
  Project,
  User,
  type PlanComponent,
  type ProjectDocument,
} from '../../src/models/entities/index.js';
import { DeploymentRepository } from '../../src/repositories/index.js';
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
let creatorId: Types.ObjectId;

async function createApprovedPlan(
  environment: 'STAGING',
  version: number,
): Promise<ReturnType<typeof Deployment.createFromPlan>> {
  const plan = await DeploymentPlan.draft({
    projectId: project._id,
    analysisId: '64b1f6274190d8fe2ee1ba3c' as unknown as Types.ObjectId,
    createdBy: creatorId,
    version,
    components: [{ name: 'api', ...COMPONENT }],
  });
  const saved = await plan.approve(creatorId);
  return Deployment.createFromPlan({
    plan: saved,
    user: creatorId,
    environment,
    gitops: {
      repositoryUrl: 'https://github.com/acme/gitops',
      branch: 'main',
      path: 'apps/my-app',
    },
  });
}

beforeAll(async () => {
  await connectTestingModule('deployment_repo_test');
  await User.init();
  await Project.init();
  await Analysis.init();
  await DeploymentPlan.init();
  await Deployment.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await User.deleteMany({}).setOptions({ withDeleted: true });
  await Project.deleteMany({}).setOptions({ withDeleted: true });
  await DeploymentPlan.deleteMany({}).setOptions({ withDeleted: true });
  await Deployment.deleteMany({}).setOptions({ withDeleted: true });

  const creator = await User.register({ name: 'dev', email: 'dev@example.com', password: 'LongEnough1!' });
  creatorId = creator._id;
  project = await Project.createFor({ ownerId: creatorId, name: 'proj', description: 'd' });
  project = await project.connectRepository({ url: 'https://github.com/acme/repo' }, 'main');
  project = await project.markRepositoryVerified('main');
});

let versionCounter = 1;

describe('DeploymentRepository', () => {
  it('listByProject is empty before any deployment', async () => {
    expect(await new DeploymentRepository().listByProject(project._id)).toHaveLength(0);
  });

  it('lists the project deployments newest first, excluding other projects', async () => {
    const first = await createApprovedPlan('STAGING', versionCounter);
    versionCounter += 1;
    await sleep(10);
    const second = await createApprovedPlan('STAGING', versionCounter);
    versionCounter += 1;
    await second.start();

    const foreignUser = await User.register({ name: 'foreign', email: 'x@example.com', password: 'LongEnough1!' });
    let foreignProject = await Project.createFor({ ownerId: foreignUser._id, name: 'foreign', description: 'x' });
    foreignProject = await foreignProject.connectRepository({ url: 'https://github.com/f/1' }, 'main');
    foreignProject = await foreignProject.markRepositoryVerified('main');

    const foreignPlan = await DeploymentPlan.draft({
      projectId: foreignProject._id,
      analysisId: '64b1f6274190d8fe2ee1ba44' as unknown as Types.ObjectId,
      createdBy: foreignUser._id,
      version: 1,
      components: [{ name: 'api', ...COMPONENT }],
    });
    await foreignPlan.approve(foreignUser._id);
    await Deployment.createFromPlan({
      plan: foreignPlan,
      user: foreignUser._id,
      environment: 'PRODUCTION',
      gitops: { repositoryUrl: 'https://github.com/f/gitops', branch: 'main', path: 'a/b' },
    });

    const listed = await new DeploymentRepository().listByProject(project._id);
    expect(listed.map((deployment) => String(deployment._id))).toEqual([
      String(second._id),
      String(first._id),
    ]);
    expect((await new DeploymentRepository().listByProject(foreignProject._id))).toHaveLength(1);
    for (const deployment of listed) {
      expect(String(deployment.project)).toBe(String(project._id));
    }
    expect(listed[0]?.status).toBe('IN_PROGRESS');
    expect(listed[1]?.status).toBe('PENDING');
  });
});

describe('strictQuery throw (DeploymentRepository)', () => {
  it('unknown filter keys throw instead of being stripped', async () => {
    await expect(new DeploymentRepository().exists({ notARealField: 1 })).rejects.toThrowError(/not in schema/);
  });
});
