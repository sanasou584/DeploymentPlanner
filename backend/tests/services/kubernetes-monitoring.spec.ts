
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  PlanComponent,
  DeploymentPlanDocument,
} from '../../src/models/entities/deployment-plan.model.js';

import type {
  ProjectRepository,
} from '../../src/repositories/project.repository.js';

import type {
  PlanRepository,
} from '../../src/repositories/plan.repository.js';

import type {
  KubernetesResource,
  KubectlMonitoringClient,
} from '../../src/services/kubernetes-monitoring/kubectl-monitoring.client.js';

import {
  createKubernetesMonitoringService,
} from '../../src/services/kubernetes-monitoring/kubernetes-monitoring.service.js';

const component = {
  name: 'MovieMatchLibrary-frontend',
  replicas: 1,
  containerPort: 80,
} as PlanComponent;

function createFixture(
  items: KubernetesResource[],
  available = true,
  ownsProject = true,
  approved = true,
) {
  const client = {
    snapshot: vi.fn().mockResolvedValue(
      available
        ? { ok: true, items }
        : {
            ok: false,
            error: 'Kubernetes API unavailable',
          },
    ),
  } as unknown as KubectlMonitoringClient;

  const projects = {
    findByIdForOwner: vi.fn().mockResolvedValue(
      ownsProject ? { _id: 'project' } : null,
    ),
  } as unknown as ProjectRepository;

  const plans = {
    findOne: vi.fn().mockResolvedValue({
      status: approved ? 'APPROVED' : 'DRAFT',
      components: [component],
    } as unknown as DeploymentPlanDocument),
  } as unknown as PlanRepository;

  const service = createKubernetesMonitoringService(
    client,
    projects,
    plans,
  );

  return { service, client };
}

const healthyResources: KubernetesResource[] = [
  {
    kind: 'Deployment',
    metadata: {
      name: component.name,
    },
    spec: {
      replicas: 1,
    },
    status: {
      readyReplicas: 1,
      availableReplicas: 1,
    },
  },
  {
    kind: 'Pod',
    metadata: {
      name: 'moviematchlibrary-frontend-abc',
      labels: {
        app: component.name,
      },
    },
    status: {
      phase: 'Running',
      containerStatuses: [{
        ready: true,
        restartCount: 0,
      }],
    },
  },
  {
    kind: 'Service',
    metadata: {
      name: component.name,
    },
    spec: {
      type: 'ClusterIP',
      clusterIP: '10.101.166.78',
      ports: [{
        port: 80,
        targetPort: 80,
      }],
    },
  },
];

describe('Kubernetes monitoring service', () => {
  it('reports a healthy deployment', async () => {
    const { service } = createFixture(
      healthyResources,
    );

    const result = await service.monitor(
      'user',
      'project',
      'plan',
    );

    expect(result.status).toBe('AVAILABLE');
    expect(result.components[0]?.health).toBe('HEALTHY');
    expect(result.components[0]?.readyReplicas).toBe(1);
    expect(result.components[0]?.pods[0]?.ready).toBe(true);
    expect(result.components[0]?.service?.ports).toEqual([80]);
  });

  it('reports a missing Deployment', async () => {
    const { service } = createFixture([]);

    const result = await service.monitor(
      'user',
      'project',
      'plan',
    );

    expect(result.components[0]?.health).toBe('MISSING');
  });

  it('reports a container failure', async () => {
    const resources: KubernetesResource[] = [
      healthyResources[0]!,
      {
        kind: 'Pod',
        metadata: {
          name: 'moviematchlibrary-frontend-failed',
          labels: {
            app: component.name,
          },
        },
        status: {
          phase: 'Pending',
          containerStatuses: [{
            ready: false,
            restartCount: 3,
            state: {
              waiting: {
                reason: 'ImagePullBackOff',
              },
            },
          }],
        },
      },
      healthyResources[2]!,
    ];

    const { service } = createFixture(resources);

    const result = await service.monitor(
      'user',
      'project',
      'plan',
    );

    expect(result.components[0]?.health).toBe('DEGRADED');
    expect(result.components[0]?.pods[0]?.reason)
      .toBe('ImagePullBackOff');
  });

  it('reports an unavailable cluster', async () => {
    const { service } = createFixture(
      [],
      false,
    );

    const result = await service.monitor(
      'user',
      'project',
      'plan',
    );

    expect(result.status).toBe('UNAVAILABLE');
    expect(result.components).toEqual([]);
  });

  it('rejects access to another user project', async () => {
    const { service, client } = createFixture(
      healthyResources,
      true,
      false,
    );

    await expect(
      service.monitor('user', 'project', 'plan'),
    ).rejects.toThrow('Project not found');

    expect(client.snapshot).not.toHaveBeenCalled();
  });

  it('rejects an unapproved plan', async () => {
    const { service, client } = createFixture(
      healthyResources,
      true,
      true,
      false,
    );

    await expect(
      service.monitor('user', 'project', 'plan'),
    ).rejects.toThrow(
      'Monitoring requires an approved deployment plan',
    );

    expect(client.snapshot).not.toHaveBeenCalled();
  });
});
