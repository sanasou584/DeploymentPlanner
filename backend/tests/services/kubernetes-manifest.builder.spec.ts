
import { describe, expect, it } from 'vitest';

import type { PlanComponent } from '../../src/models/entities/deployment-plan.model.js';

import { buildKubernetesManifests } from '../../src/services/kubernetes-manifests/kubernetes-manifest.builder.js';

const component: PlanComponent = {
  name: 'backend',
  type: 'BACKEND',
  containerPort: 4000,
  image: 'ghcr.io/example/backend:1.0.0',
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

describe('Kubernetes Manifest Builder', () => {
  it('generates Deployment and Service by default', () => {
    const files = buildKubernetesManifests([component]);

    expect(files).toHaveLength(2);

    expect(files.map((file) => file.kind)).toEqual([
      'K8S_DEPLOYMENT',
      'K8S_SERVICE',
    ]);
  });

  it('generates the correct Deployment configuration', () => {
    const files = buildKubernetesManifests([component]);

    const deployment = files.find(
      (file) => file.kind === 'K8S_DEPLOYMENT',
    );

    expect(deployment).toBeDefined();
    expect(deployment?.path).toBe(
      'k8s/backend/deployment.yaml',
    );

    expect(deployment?.content).toContain(
      'kind: "Deployment"',
    );

    expect(deployment?.content).toContain(
      'replicas: 2',
    );

    expect(deployment?.content).toContain(
      'image: "ghcr.io/example/backend:1.0.0"',
    );

    expect(deployment?.content).toContain(
      'containerPort: 4000',
    );

    expect(deployment?.content).toContain(
      'cpu: "100m"',
    );
  });

  it('generates a ClusterIP Service', () => {
    const files = buildKubernetesManifests([component]);

    const service = files.find(
      (file) => file.kind === 'K8S_SERVICE',
    );

    expect(service).toBeDefined();

    expect(service?.content).toContain(
      'kind: "Service"',
    );

    expect(service?.content).toContain(
      'type: "ClusterIP"',
    );

    expect(service?.content).toContain(
      'targetPort: 4000',
    );
  });

  it('generates Ingress when enabled', () => {
    const input: PlanComponent = {
      ...component,
      ingress: {
        enabled: true,
        host: 'api.example.com',
        path: '/api',
        tls: true,
      },
    };

    const files = buildKubernetesManifests([input]);

    const ingress = files.find(
      (file) => file.kind === 'K8S_INGRESS',
    );

    expect(files).toHaveLength(3);
    expect(ingress).toBeDefined();

    expect(ingress?.content).toContain(
      'kind: "Ingress"',
    );

    expect(ingress?.content).toContain(
      'host: "api.example.com"',
    );

    expect(ingress?.content).toContain(
      'secretName: "backend-tls"',
    );

    expect(ingress?.content).toContain(
      'pathType: "Prefix"',
    );
  });

  it('rejects Ingress without a hostname', () => {
    const input: PlanComponent = {
      ...component,
      ingress: {
        enabled: true,
        tls: false,
      },
    };

    expect(() =>
      buildKubernetesManifests([input]),
    ).toThrow('requires a hostname');
  });

  it('generates HPA when enabled', () => {
    const input: PlanComponent = {
      ...component,
      hpa: {
        enabled: true,
        minReplicas: 2,
        maxReplicas: 5,
        targetCpuUtilizationPercent: 70,
        targetMemoryUtilizationPercent: 80,
      },
    };

    const files = buildKubernetesManifests([input]);

    const hpa = files.find(
      (file) => file.kind === 'K8S_HPA',
    );

    expect(files).toHaveLength(3);
    expect(hpa).toBeDefined();

    expect(hpa?.content).toContain(
      'kind: "HorizontalPodAutoscaler"',
    );

    expect(hpa?.content).toContain(
      'minReplicas: 2',
    );

    expect(hpa?.content).toContain(
      'maxReplicas: 5',
    );

    expect(hpa?.content).toContain(
      'averageUtilization: 70',
    );

    expect(hpa?.content).toContain(
      'averageUtilization: 80',
    );
  });

  it('rejects components without a Docker image', () => {
    const input: PlanComponent = {
      ...component,
      image: undefined,
    };

    expect(() =>
      buildKubernetesManifests([input]),
    ).toThrow('requires a container image');
  });

  it('rejects invalid Kubernetes component names', () => {
    const input: PlanComponent = {
      ...component,
      name: 'Backend_API',
    };

    expect(() =>
      buildKubernetesManifests([input]),
    ).toThrow('must be a unique Kubernetes DNS label');
  });

  it('rejects duplicate component names', () => {
    expect(() =>
      buildKubernetesManifests([
        component,
        { ...component },
      ]),
    ).toThrow('must be a unique Kubernetes DNS label');
  });

  it('rejects an empty deployment plan', () => {
    expect(() =>
      buildKubernetesManifests([]),
    ).toThrow('Plan has no components');
  });

  it('generates manifests for multiple components', () => {
    const frontend: PlanComponent = {
      ...component,
      name: 'frontend',
      type: 'FRONTEND',
      image: 'ghcr.io/example/frontend:1.0.0',
      containerPort: 3000,
    };

    const files = buildKubernetesManifests([
      component,
      frontend,
    ]);

    expect(files).toHaveLength(4);

    expect(files.map((file) => file.path)).toEqual([
      'k8s/backend/deployment.yaml',
      'k8s/backend/service.yaml',
      'k8s/frontend/deployment.yaml',
      'k8s/frontend/service.yaml',
    ]);
  });
});