
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { Types } from 'mongoose';

import {
  Analysis,
  AuditLog,
  DeploymentPlan,
  Project,
  Recommendation,
  User,
} from '../../src/models/entities/index.js';

import { createDeploymentPlanService } from '../../src/services/deployment-plans/deployment-plan.service.js';

import type { CreatePlanBody } from '../../src/services/deployment-plans/deployment-plan.schema.js';

import {
  connectTestingModule,
  disconnectTestingModule,
} from '../integration/test-database.js';

const foreignUser = new Types.ObjectId().toHexString();

const service = createDeploymentPlanService();

const sampleComponent: CreatePlanBody['components'][number] = {
  name: 'api',
  type: 'BACKEND',
  containerPort: 4000,
  image: 'ghcr.io/acme/api:1.0.0',
  replicas: 2,
  resources: {
    requests: {
      cpu: '100m',
      memory: '128Mi',
    },
    limits: {
      cpu: '500m',
      memory: '512Mi',
    },
  },
  hpa: {
    enabled: false,
  },
  ingress: {
    enabled: false,
    tls: false,
  },
};

async function makeFixture() {
  const user = await User.register({
    name: 'plan owner',
    email: 'plan-owner@example.com',
    password: 'LongEnough1!',
  });

  let project = await Project.createFor({
    ownerId: user._id,
    name: 'plan project',
    description: 'deployment plan tests',
  });

  project = await project.connectRepository(
    { url: 'https://github.com/acme/repo' },
    'main',
  );

  project = await project.markRepositoryVerified('main');

  let analysis = await Analysis.request({
    project,
    userId: user._id,
  });

  analysis = await analysis.start();

  analysis = await analysis.complete({
    components: [
      {
        name: 'api',
        type: 'BACKEND',
        rootPath: 'backend',
      },
    ],
  });

  return {
    user,
    project,
    analysis,
  };
}

beforeAll(async () => {
  await connectTestingModule('deployment_plan_service_test');

  await Promise.all([
    User.init(),
    Project.init(),
    Analysis.init(),
    DeploymentPlan.init(),
  ]);
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}).setOptions({ withDeleted: true }),
    Project.deleteMany({}).setOptions({ withDeleted: true }),
    Analysis.deleteMany({}).setOptions({ withDeleted: true }),
    DeploymentPlan.deleteMany({}),
    Recommendation.deleteMany({}),
    AuditLog.collection.deleteMany({}),
  ]);
});

describe('deployment plan service', () => {
  it('creates a DRAFT from a completed analysis and lists it', async () => {
    const { user, project, analysis } = await makeFixture();

    const plan = await service.create(user.id, project.id, {
      analysisId: analysis.id,
      components: [sampleComponent],
    });

    expect(plan.status).toBe('DRAFT');
    expect(plan.version).toBe(1);

    const plans = await service.list(user.id, project.id);

    expect(plans).toHaveLength(1);
  });

  it('rejects access by a foreign user', async () => {
    const { project } = await makeFixture();

    await expect(
      service.list(foreignUser, project.id),
    ).rejects.toThrow('Project not found');
  });
    it('updates a draft component and persists changes without an image', async () => {
    const { user, project, analysis } = await makeFixture();

    const plan = await service.create(
      user.id,
      project.id,
      {
        analysisId: analysis.id,
        components: [sampleComponent],
      },
    );

    await service.updateComponent(
      user.id,
      project.id,
      plan.id,
      'api',
      {
        containerPort: 4500,
        replicas: 3,
        image: '',
        resources: {
          requests: {
            cpu: '200m',
            memory: '256Mi',
          },
          limits: {
            cpu: '500m',
            memory: '512Mi',
          },
        },
      },
    );

    const persisted = await DeploymentPlan.findById(plan.id);

    expect(persisted).not.toBeNull();
    expect(persisted?.status).toBe('DRAFT');

    const component = persisted?.components[0];

    expect(component?.containerPort).toBe(4500);
    expect(component?.replicas).toBe(3);
    expect(component?.image).toBe('');
    expect(component?.resources.requests.cpu).toBe('200m');
    expect(component?.resources.requests.memory).toBe('256Mi');

    await expect(
      service.approve(user.id, project.id, plan.id),
    ).rejects.toThrow(
      /container image is required/,
    );

    const unchanged = await DeploymentPlan.findById(plan.id);
    expect(unchanged?.status).toBe('DRAFT');
  });
  it('approves a draft and blocks editing after approval', async () => {
    const { user, project, analysis } = await makeFixture();

    const plan = await service.create(user.id, project.id, {
      analysisId: analysis.id,
      components: [sampleComponent],
    });

    const updated = await service.updateComponent(
      user.id,
      project.id,
      plan.id,
      'api',
      { replicas: 3 },
    );

    expect(updated.components[0]?.replicas).toBe(3);

    const approved = await service.approve(
      user.id,
      project.id,
      plan.id,
    );

    expect(approved.status).toBe('APPROVED');

    await expect(
      service.updateComponent(
        user.id,
        project.id,
        plan.id,
        'api',
        { replicas: 4 },
      ),
    ).rejects.toThrow();
  });
  it('proposes an image when none is provided', async () => {
  const { user, project, analysis } = await makeFixture();

  const plan = await service.create(
    user.id,
    project.id,
    {
      analysisId: analysis.id,
      components: [
        {
          ...sampleComponent,
          image: undefined,
        },
      ],
    },
  );

  expect(plan.components[0]?.image).toBe(
    'ghcr.io/acme/repo-api:plan-v1',
  );

  const approved = await service.approve(
    user.id,
    project.id,
    plan.id,
  );

  expect(approved.status).toBe('APPROVED');
});

  it('replaces placeholder images automatically', async () => {
  const { user, project, analysis } = await makeFixture();

  const plan = await service.create(
    user.id,
    project.id,
    {
      analysisId: analysis.id,
      components: [
        {
          ...sampleComponent,
          image: 'registry.example.com/api:1.0.0',
        },
      ],
    },
  );

  expect(plan.components[0]?.image).toBe(
    'ghcr.io/acme/repo-api:plan-v1',
  );

  const approved = await service.approve(
    user.id,
    project.id,
    plan.id,
  );

  expect(approved.status).toBe('APPROVED');
});

  it('refuses approval by a foreign user', async () => {
    const { user, project, analysis } = await makeFixture();

    const plan = await service.create(
      user.id,
      project.id,
      {
        analysisId: analysis.id,
        components: [sampleComponent],
      },
    );

    await expect(
      service.approve(
        foreignUser,
        project.id,
        plan.id,
      ),
    ).rejects.toThrow('Project not found');

    const persisted = await DeploymentPlan.findById(plan.id);

    expect(persisted?.status).toBe('DRAFT');
  });
  it('rejects a plan with a reason and keeps rejection terminal', async () => {
    const { user, project, analysis } = await makeFixture();

    const plan = await service.create(user.id, project.id, {
      analysisId: analysis.id,
      components: [sampleComponent],
    });

    const rejected = await service.reject(
      user.id,
      project.id,
      plan.id,
      'Wrong sizing',
    );

    expect(rejected.status).toBe('REJECTED');

    await expect(
      service.approve(user.id, project.id, plan.id),
    ).rejects.toThrow();
  });

  it('refuses an unknown component name', async () => {
    const { user, project, analysis } = await makeFixture();

    await expect(
      service.create(user.id, project.id, {
        analysisId: analysis.id,
        components: [
          {
            ...sampleComponent,
            name: 'unknown',
          },
        ],
      }),
    ).rejects.toThrow('Invalid or duplicate plan component');
  });
});