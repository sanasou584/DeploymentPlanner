
import {
  ConflictError,
} from '../../domain/errors/index.js';

import {
  toKubernetesName,
} from './kubernetes-name.js';

import type {
  GeneratedFileKind,
} from '../../domain/enums/generated-file.enums.js';

import type {
  PlanComponent,
} from '../../models/entities/deployment-plan.model.js';

export interface ManifestOutput {
  kind: GeneratedFileKind;
  componentName: string;
  fileName: string;
  path: string;
  content: string;
}

type YamlValue =
  | string
  | number
  | boolean
  | null
  | YamlValue[]
  | { [key: string]: YamlValue | undefined };

function renderYaml(value: YamlValue, depth = 0): string {
  const pad = ' '.repeat(depth);

  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'object' && item !== null) {
        return `${pad}-\n${renderYaml(item, depth + 2)}`;
      }

      return `${pad}- ${renderYaml(item).trimStart()}`;
    }).join('\n');
  }

  if (typeof value === 'object' && value !== null) {
    return Object.entries(value)
      .filter((entry) => entry[1] !== undefined)
      .map(([key, item]) => {
        if (typeof item === 'object' && item !== null) {
          return `${pad}${key}:\n${renderYaml(item, depth + 2)}`;
        }

        return `${pad}${key}: ${renderYaml(item as YamlValue).trimStart()}`;
      }).join('\n');
  }

  return JSON.stringify(value);
}

function file(
  component: string,
  kind: GeneratedFileKind,
  basename: string,
  body: YamlValue,
): ManifestOutput {
  const normalizedName = toKubernetesName(
    component,
  );

  return {
    kind,
    componentName: component,
    fileName: `${basename}.yaml`,
    path: `k8s/${normalizedName}/${basename}.yaml`,
    content: `${renderYaml(body)}\n`,
  };
}

function requireContainerPort(
  component: PlanComponent,
): number {
  const port = component.containerPort;

  if (
    port === null ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new ConflictError(
      `Component ${component.name} requires a valid container port`,
    );
  }

  return port;
}

function effectiveServicePort(
  component: PlanComponent,
): number {
  return component.servicePort ??
    requireContainerPort(component);
}

function effectiveTargetPort(
  component: PlanComponent,
): string | number {
  return component.targetPort ??
    requireContainerPort(component);
}

function deployment(
  component: PlanComponent,
): ManifestOutput {
  if (!component.image?.trim()) {
    throw new ConflictError(
      `Component ${component.name} requires a container image before manifest generation`,
    );
  }

  if (
    component.type !== 'WORKER' &&
    component.containerPort === null
  ) {
    throw new ConflictError(
      `Non-worker component ${component.name} requires a container port`,
    );
  }

  const name = toKubernetesName(
    component.name,
  );

  return file(name, 'K8S_DEPLOYMENT', 'deployment', {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: { name },
    spec: {
      replicas: component.replicas,
      selector: {
        matchLabels: { app: name },
      },
      template: {
        metadata: {
          labels: { app: name },
        },
        spec: {
          containers: [{
            name,
            image: component.image,
            ...(component.containerPort !== null
              ? {
                  ports: [{
                    containerPort: component.containerPort,
                  }],
                }
              : {}),
            resources: {
              requests: {
                cpu: component.resources.requests.cpu,
                memory: component.resources.requests.memory,
              },
              limits: {
                cpu: component.resources.limits.cpu,
                memory: component.resources.limits.memory,
              },
            },
          }],
        },
      },
    },
  });
}

function service(
  component: PlanComponent,
): ManifestOutput {
  const name = toKubernetesName(
    component.name,
  );

  return file(name, 'K8S_SERVICE', 'service', {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { name },
    spec: {
      type: 'ClusterIP',
      selector: { app: name },
      ports: [{
        port: effectiveServicePort(component),
        targetPort: effectiveTargetPort(component),
        protocol: 'TCP',
      }],
    },
  });
}

function ingress(
  component: PlanComponent,
): ManifestOutput {
  const name = toKubernetesName(
    component.name,
  );
  const host = component.ingress.host;

  if (!host) {
    throw new ConflictError(
      `Ingress for ${name} requires a hostname`,
    );
  }

  return file(name, 'K8S_INGRESS', 'ingress', {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: { name },
    spec: {
      ...(component.ingress.tls
        ? {
            tls: [{
              hosts: [host],
              secretName: `${name}-tls`,
            }],
          }
        : {}),
      rules: [{
        host,
        http: {
          paths: [{
            path: component.ingress.path || '/',
            pathType: 'Prefix',
            backend: {
              service: {
                name,
                port: {
                  number: effectiveServicePort(component),
                },
              },
            },
          }],
        },
      }],
    },
  });
}

function hpa(
  component: PlanComponent,
): ManifestOutput {
  const name = toKubernetesName(
    component.name,
  );
  const config = component.hpa;

  if (
    config.minReplicas === undefined ||
    config.maxReplicas === undefined ||
    config.targetCpuUtilizationPercent === undefined
  ) {
    throw new ConflictError(
      `HPA for ${name} requires minReplicas, maxReplicas and target CPU`,
    );
  }

  const metrics: YamlValue[] = [{
    type: 'Resource',
    resource: {
      name: 'cpu',
      target: {
        type: 'Utilization',
        averageUtilization:
          config.targetCpuUtilizationPercent,
      },
    },
  }];

  if (config.targetMemoryUtilizationPercent !== undefined) {
    metrics.push({
      type: 'Resource',
      resource: {
        name: 'memory',
        target: {
          type: 'Utilization',
          averageUtilization:
            config.targetMemoryUtilizationPercent,
        },
      },
    });
  }

  return file(name, 'K8S_HPA', 'hpa', {
    apiVersion: 'autoscaling/v2',
    kind: 'HorizontalPodAutoscaler',
    metadata: { name },
    spec: {
      scaleTargetRef: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name,
      },
      minReplicas: config.minReplicas,
      maxReplicas: config.maxReplicas,
      metrics,
    },
  });
}

export function buildKubernetesManifests(
  components: readonly PlanComponent[],
): ManifestOutput[] {
  const seen = new Set<string>();
  const output: ManifestOutput[] = [];

  for (const component of components) {
        const name = toKubernetesName(
      component.name,
    );

    if (seen.has(name)) {
      throw new ConflictError(
        `Component name ${component.name} must be a unique Kubernetes DNS label`,
      );
    }

    seen.add(name);

    output.push(deployment(component));

    if (component.containerPort !== null) {
      output.push(service(component));
    }

    if (
      component.ingress.enabled &&
      component.containerPort === null
    ) {
      throw new ConflictError(
        `Ingress for ${name} requires an exposed container port`,
      );
    }

    if (component.ingress.enabled) {
      output.push(ingress(component));
    }

    if (component.hpa.enabled) {
      output.push(hpa(component));
    }
  }

  if (output.length === 0) {
    throw new ConflictError(
      'Plan has no components',
    );
  }

  return output;
}