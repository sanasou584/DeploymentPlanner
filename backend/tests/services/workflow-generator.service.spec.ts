
import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  generateBuildWorkflow,
} from '../../src/services/cicd/workflow-generator.service.js';

const components = [
  {
    name: 'backend-backend',
    rootPath: 'backend',
    dockerfilePath: 'backend/Dockerfile',
    image: 'ghcr.io/sanasou584/sana-backend:plan-v2',
  },
  {
    name: 'frontend-frontend',
    rootPath: 'frontend',
    dockerfilePath: 'frontend/Dockerfile',
    image: 'ghcr.io/sanasou584/sana-frontend:plan-v2',
  },
];

describe('CI/CD workflow generator', () => {
  it('generates build jobs for all components', () => {
    const workflow = generateBuildWorkflow({
      components,
    });

    expect(workflow).toContain(
      'build-1-backend-backend:',
    );

    expect(workflow).toContain(
      'build-2-frontend-frontend:',
    );
  });

  it('uses approved image references', () => {
    const workflow = generateBuildWorkflow({
      components,
    });

    expect(workflow).toContain(
      'ghcr.io/sanasou584/sana-backend:plan-v2',
    );

    expect(workflow).toContain(
      'ghcr.io/sanasou584/sana-frontend:plan-v2',
    );
  });

  it('uses the correct Dockerfile paths', () => {
    const workflow = generateBuildWorkflow({
      components,
    });

    expect(workflow).toContain(
      'file: ./backend/Dockerfile',
    );

    expect(workflow).toContain(
      'file: ./frontend/Dockerfile',
    );
  });

  it('rejects duplicate image destinations', () => {
    expect(() =>
      generateBuildWorkflow({
        components: [
          components[0]!,
          {
            ...components[1]!,
            image: components[0]!.image,
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects unsafe Docker build paths', () => {
    expect(() =>
      generateBuildWorkflow({
        components: [
          {
            ...components[0]!,
            rootPath: '../private',
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects an empty component list', () => {
    expect(() =>
      generateBuildWorkflow({
        components: [],
      }),
    ).toThrow();
  });
});
