
import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  exposedDockerPort,
  alignGeneratedDockerPorts,
  assertDockerPortsMatch,
} from '../../src/services/plan-quality/docker-port-quality.js';

import {
  generateBuildWorkflow,
} from '../../src/services/cicd/workflow-generator.service.js';

const dockerfiles = [
  {
    kind: 'DOCKERFILE',
    componentName: 'frontend',
    content: [
      'FROM node:22-alpine AS build',
      'RUN npm run build',
      'FROM nginx:1.27-alpine',
      'EXPOSE 80',
      'CMD ["nginx", "-g", "daemon off;"]',
    ].join('\n'),
  },
];

describe('Docker port quality', () => {
  it('detects the final exposed port', () => {
    expect(
      exposedDockerPort(dockerfiles[0]!.content),
    ).toBe(80);
  });

  it('corrects AI assumptions when no port evidence exists', () => {
    const result = alignGeneratedDockerPorts(
      [{
        name: 'frontend',
        containerPort: 3000,
        targetPort: 3000,
      }],
      [{
        name: 'frontend',
      }],
      dockerfiles,
    );

    expect(result.components[0]?.containerPort).toBe(80);
    expect(result.components[0]?.targetPort).toBe(80);
  });

  it('preserves explicit Kubernetes port evidence', () => {
    const result = alignGeneratedDockerPorts(
      [{
        name: 'frontend',
        containerPort: 3000,
      }],
      [{
        name: 'frontend',
        kubernetes: {
          containerPort: 3000,
        },
      }],
      dockerfiles,
    );

    expect(result.components[0]?.containerPort).toBe(3000);
  });

  it('refuses a mismatched deployment plan', () => {
    expect(() =>
      assertDockerPortsMatch(
        [{
          name: 'frontend',
          containerPort: 3000,
        }],
        dockerfiles,
      ),
    ).toThrow(
      /differs from Dockerfile EXPOSE 80/,
    );
  });

  it('accepts matching container and target ports', () => {
    expect(() =>
      assertDockerPortsMatch(
        [{
          name: 'frontend',
          containerPort: 80,
          targetPort: 80,
        }],
        dockerfiles,
      ),
    ).not.toThrow();
  });
});

describe('Automatic Docker workflow', () => {
  it('supports push and manual dispatch', () => {
    const yaml = generateBuildWorkflow({
      branch: 'main',
      components: [{
        name: 'frontend',
        rootPath: 'MovieMatchLibrary',
        dockerfilePath: 'MovieMatchLibrary/Dockerfile',
        image:
          'ghcr.io/sanasou584/matchmovies-frontend:plan-v5',
      }],
    });

    expect(yaml).toContain('workflow_dispatch:');
    expect(yaml).toContain('push:');
    expect(yaml).toContain('      - "main"');
    expect(yaml).toContain(
      'ghcr.io/sanasou584/matchmovies-frontend:plan-v5',
    );
  });
});
