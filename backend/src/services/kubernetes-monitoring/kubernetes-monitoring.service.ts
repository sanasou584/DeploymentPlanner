
import {
  ConflictError,
  NotFoundError,
} from '../../domain/errors/index.js';

import {
  ProjectRepository,
} from '../../repositories/project.repository.js';

import {
  PlanRepository,
} from '../../repositories/plan.repository.js';

import type {
  PlanComponent,
} from '../../models/entities/deployment-plan.model.js';

import type {
  KubectlMonitoringClient,
  KubernetesResource,
} from './kubectl-monitoring.client.js';

export type ComponentHealth =
  | 'HEALTHY'
  | 'PROGRESSING'
  | 'DEGRADED'
  | 'MISSING';

export interface MonitoredPod {
  name: string;
  phase: string;
  ready: boolean;
  restarts: number;
  reason: string | null;
}

export interface MonitoredService {
  name: string;
  type: string;
  clusterIP: string | null;
  ports: number[];
}

export interface MonitoredComponent {
  name: string;
  health: ComponentHealth;
  desiredReplicas: number;
  readyReplicas: number;
  availableReplicas: number;
  pods: MonitoredPod[];
  service: MonitoredService | null;
}

export interface MonitoredEvent {
  objectName: string;
  reason: string;
  message: string;
  type: string;
  time: string | null;
}

export interface MonitoringResponse {
  status: 'AVAILABLE' | 'UNAVAILABLE';
  cluster: string;
  namespace: string;
  checkedAt: string;
  details: string | null;
  components: MonitoredComponent[];
  events: MonitoredEvent[];
}

const FAILED_REASONS = new Set([
  'CrashLoopBackOff',
  'ImagePullBackOff',
  'ErrImagePull',
  'CreateContainerConfigError',
  'InvalidImageName',
  'RunContainerError',
]);

function resourceName(
  item: KubernetesResource,
): string {
  return item.metadata?.name ?? '';
}

function findResource(
  items: readonly KubernetesResource[],
  kind: string,
  name: string,
): KubernetesResource | undefined {
  return items.find(
    (item) =>
      item.kind === kind &&
      resourceName(item) === name,
  );
}

function mapPod(
  pod: KubernetesResource,
): MonitoredPod {
  const statuses =
    pod.status?.containerStatuses ?? [];

  const ready =
    statuses.length > 0 &&
    statuses.every((status) => status.ready === true);

  const restarts = statuses.reduce(
    (total, status) =>
      total + (status.restartCount ?? 0),
    0,
  );

  const reason = statuses
    .map((status) =>
      status.state?.waiting?.reason ??
      status.state?.terminated?.reason,
    )
    .find((value) => Boolean(value)) ?? null;

  return {
    name: resourceName(pod),
    phase: pod.status?.phase ?? 'Unknown',
    ready,
    restarts,
    reason,
  };
}

function mapService(
  item: KubernetesResource | undefined,
): MonitoredService | null {
  if (!item) {
    return null;
  }

  return {
    name: resourceName(item),
    type: item.spec?.type ?? 'Unknown',
    clusterIP: item.spec?.clusterIP ?? null,
    ports: (item.spec?.ports ?? [])
      .map((port) => port.port)
      .filter((port): port is number =>
        typeof port === 'number',
      ),
  };
}

function resolveHealth(
  deployment: KubernetesResource | undefined,
  desired: number,
  ready: number,
  pods: readonly MonitoredPod[],
  serviceRequired: boolean,
  servicePresent: boolean,
): ComponentHealth {
  if (!deployment) {
    return 'MISSING';
  }

  if (
    pods.some((pod) =>
      pod.reason !== null &&
      FAILED_REASONS.has(pod.reason),
    )
  ) {
    return 'DEGRADED';
  }

  if (serviceRequired && !servicePresent) {
    return 'DEGRADED';
  }

  if (
    ready >= desired &&
    pods.length >= desired &&
    pods.filter((pod) => pod.ready).length >= desired
  ) {
    return 'HEALTHY';
  }

  return 'PROGRESSING';
}


function componentStatus(
  component: PlanComponent,
  items: readonly KubernetesResource[],
): MonitoredComponent {
  const kubernetesName = component.name.toLowerCase();

  const deployment = findResource(
    items,
    'Deployment',
    kubernetesName,
  );

  const podResources = items.filter(
    (item) =>
      item.kind === 'Pod' &&
      item.metadata?.labels?.app === kubernetesName,
  );

  const pods = podResources.map(mapPod);

  const service = mapService(
    findResource(
      items,
      'Service',
      kubernetesName,
    ),
  );

  const desired =
    deployment?.spec?.replicas ?? component.replicas;

  const ready =
    deployment?.status?.readyReplicas ?? 0;

  return {
    name: component.name,
    health: resolveHealth(
      deployment,
      desired,
      ready,
      pods,
      component.containerPort !== null,
      service !== null,
    ),
    desiredReplicas: desired,
    readyReplicas: ready,
    availableReplicas:
      deployment?.status?.availableReplicas ?? 0,
    pods,
    service,
  };
}


function relevantEvents(
  components: readonly MonitoredComponent[],
  items: readonly KubernetesResource[],
): MonitoredEvent[] {
  const names = new Set<string>();

    for (const component of components) {
    names.add(component.name.toLowerCase());

    for (const pod of component.pods) {
      names.add(pod.name);
    }
  }

  return items
    .filter(
      (item) =>
        item.kind === 'Event' &&
        names.has(item.involvedObject?.name ?? ''),
    )
    .map((item) => ({
      objectName: item.involvedObject?.name ?? '',
      reason: item.reason ?? 'Unknown',
      message: item.message ?? '',
      type: item.type ?? 'Normal',
      time:
        item.lastTimestamp ??
        item.eventTime ??
        item.metadataTimestamp ??
        null,
    }))
    .sort((a, b) =>
      (b.time ?? '').localeCompare(a.time ?? ''),
    )
    .slice(0, 15);
}

export function createKubernetesMonitoringService(
  client: KubectlMonitoringClient,
  projects = new ProjectRepository(),
  plans = new PlanRepository(),
) {
  async function monitor(
    userId: string,
    projectId: string,
    planId: string,
  ): Promise<MonitoringResponse> {
    const project = await projects.findByIdForOwner(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const plan = await plans.findOne({
      _id: planId,
      project: projectId,
    });

    if (!plan) {
      throw new NotFoundError(
        'Deployment plan not found',
      );
    }

    if (plan.status !== 'APPROVED') {
      throw new ConflictError(
        'Monitoring requires an approved deployment plan',
      );
    }

    const checkedAt = new Date().toISOString();
    const snapshot = await client.snapshot();

    if (!snapshot.ok) {
      return {
        status: 'UNAVAILABLE',
        cluster: 'minikube',
        namespace: 'deploymentplanner-dev',
        checkedAt,
        details: snapshot.error,
        components: [],
        events: [],
      };
    }

    const components = plan.components.map(
      (component) =>
        componentStatus(component, snapshot.items),
    );

    return {
      status: 'AVAILABLE',
      cluster: 'minikube',
      namespace: 'deploymentplanner-dev',
      checkedAt,
      details: null,
      components,
      events: relevantEvents(
        components,
        snapshot.items,
      ),
    };
  }

  return {
    monitor,
  };
}

export type KubernetesMonitoringService =
  ReturnType<typeof createKubernetesMonitoringService>;
