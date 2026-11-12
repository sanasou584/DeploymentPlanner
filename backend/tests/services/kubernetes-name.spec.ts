
import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  toKubernetesName,
} from '../../src/services/kubernetes-manifests/kubernetes-name.js';

import {
  buildKubernetesManifests,
} from '../../src/services/kubernetes-manifests/kubernetes-manifest.builder.js';

import type {
  PlanComponent,
} from '../../src/models/entities/deployment-plan.model.js';

const movieMatchComponent: PlanComponent = {
  name: 'MovieMatchLibrary-frontend',
  type: 'FRONTEND',
  containerPort: 80,
  servicePort: 80,
  targetPort: 80,
  image:
    'ghcr.io/sanasou584/matchmovies-moviematchlibrary-frontend:plan-v5',
  replicas: 1,
  resources: {
    requests: {
      cpu: '100m',
      memory: '128Mi',
    },
    limits: {
      cpu: '200m',
      memory: '256Mi',
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

describe('Kubernetes name normalization', () => {
  it('normalizes MovieMatch component name', () => {
    expect(
      toKubernetesName(
        'MovieMatchLibrary-frontend',
      ),
    ).toBe('moviematchlibrary-frontend');
  });

  it('rejects names without valid characters', () => {
    expect(() =>
      toKubernetesName('!!!'),
    ).toThrow();
  });

  it('generates Deployment and Service for MovieMatch', () => {
    const files = buildKubernetesManifests([
      movieMatchComponent,
    ]);

    expect(files).toHaveLength(2);

    expect(files.map((file) => file.path)).toEqual([
      'k8s/moviematchlibrary-frontend/deployment.yaml',
      'k8s/moviematchlibrary-frontend/service.yaml',
    ]);
  });

  it('uses the correct image and port', () => {
    const files = buildKubernetesManifests([
      movieMatchComponent,
    ]);

    const deployment = files.find(
      (file) => file.kind === 'K8S_DEPLOYMENT',
    );

    const service = files.find(
      (file) => file.kind === 'K8S_SERVICE',
    );

    expect(deployment?.content).toContain(
      'containerPort: 80',
    );

    expect(deployment?.content).toContain(
      'replicas: 1',
    );

    expect(deployment?.content).toContain(
      movieMatchComponent.image,
    );

    expect(service?.content).toContain(
      'targetPort: 80',
    );

    expect(service?.content).toContain(
      'port: 80',
    );
  });

  it('rejects names that collide after normalization', () => {
    expect(() =>
      buildKubernetesManifests([
        movieMatchComponent,
        {
          ...movieMatchComponent,
          name: 'moviematchlibrary-frontend',
        },
      ]),
    ).toThrow();
  });
});
