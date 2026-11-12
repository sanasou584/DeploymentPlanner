
import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  buildImageReference,
  proposeImageReferences,
} from '../../src/services/image-references/image-reference.service.js';

import type {
  PlanComponent,
} from '../../src/models/entities/deployment-plan.model.js';

function component(
  name: string,
  image?: string,
  type: PlanComponent['type'] = 'BACKEND',
): PlanComponent {
  return {
    name,
    type,
    containerPort: 4000,
    replicas: 1,
    ...(image !== undefined ? { image } : {}),
    resources: {
      requests: {
        cpu: '250m',
        memory: '256Mi',
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
}

const repository = {
  owner: 'sanasou584',
  name: 'project-sana',
};

describe('image references', () => {
  it('generates a versioned GHCR image', () => {
    expect(
      buildImageReference(
        repository,
        'backend-backend',
        2,
      ),
    ).toBe(
      'ghcr.io/sanasou584/project-sana-backend-backend:plan-v2',
    );
  });

  it('proposes images for missing references', () => {
    const result = proposeImageReferences({
      repository,
      version: 2,
      components: [
        component('backend-backend'),
        component(
          'frontend-frontend',
          undefined,
          'FRONTEND',
        ),
      ],
    });

    expect(result[0]?.image).toBe(
      'ghcr.io/sanasou584/project-sana-backend-backend:plan-v2',
    );

    expect(result[1]?.image).toBe(
      'ghcr.io/sanasou584/project-sana-frontend-frontend:plan-v2',
    );
  });

  it('preserves an existing valid image', () => {
    const result = proposeImageReferences({
      repository,
      version: 2,
      components: [
        component('backend', 'node:22'),
      ],
    });

    expect(result[0]?.image).toBe('node:22');
  });

  it('replaces placeholder images', () => {
    const result = proposeImageReferences({
      repository,
      version: 2,
      components: [
        component(
          'backend',
          'registry.example.com/app:1.0.0',
        ),
      ],
    });

    expect(result[0]?.image).toBe(
      'ghcr.io/sanasou584/project-sana-backend:plan-v2',
    );
  });

  it('does not invent database images', () => {
    const result = proposeImageReferences({
      repository,
      version: 2,
      components: [
        component('database', undefined, 'DATABASE'),
      ],
    });

    expect(result[0]?.image).toBeUndefined();
  });

  it('rejects invalid plan versions', () => {
    expect(() =>
      buildImageReference(
        repository,
        'backend',
        0,
      ),
    ).toThrow();
  });
});
