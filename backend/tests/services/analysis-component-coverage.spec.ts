
import { describe, expect, it } from 'vitest';

import {
  assertAnalysisComponentCoverage,
  findMissingDockerComponents,
} from '../../src/services/analysis/analysis-component-coverage.js';

describe('Analysis component coverage', () => {
  const detectedFiles = [
    'src/frontend/Dockerfile',
    'src/cartservice/Dockerfile',
    'src/checkoutservice/Dockerfile',
    'src/paymentservice/Dockerfile',
  ];

  const components = [
    {
      name: 'frontend',
      type: 'FRONTEND' as const,
      rootPath: 'src/frontend',
    },
    {
      name: 'cartservice',
      type: 'BACKEND' as const,
      rootPath: 'src/cartservice',
    },
  ];

  it('detects missing Docker components', () => {
    const missing = findMissingDockerComponents(
      detectedFiles,
      components,
    );

    expect(missing).toEqual([
      'src/checkoutservice',
      'src/paymentservice',
    ]);
  });

  it('rejects incomplete component detection', () => {
    expect(() =>
      assertAnalysisComponentCoverage(
        detectedFiles,
        components,
      ),
    ).toThrow(
      'Repository analysis omitted Docker components',
    );
  });

  it('accepts all detected Docker components', () => {
    const complete = [
      ...components,
      {
        name: 'checkoutservice',
        type: 'BACKEND' as const,
        rootPath: 'src/checkoutservice',
      },
      {
        name: 'paymentservice',
        type: 'BACKEND' as const,
        rootPath: 'src/paymentservice',
      },
    ];

    expect(() =>
      assertAnalysisComponentCoverage(
        detectedFiles,
        complete,
      ),
    ).not.toThrow();
  });

  it('normalizes Windows paths', () => {
    const missing = findMissingDockerComponents(
      ['src\\frontend\\Dockerfile'],
      [{
        name: 'frontend',
        type: 'FRONTEND',
        rootPath: './src/frontend/',
      }],
    );

    expect(missing).toEqual([]);
  });

  it('ignores files that are not Dockerfiles', () => {
    const missing = findMissingDockerComponents(
      [
        'src/frontend/main.go',
        'src/backend/package.json',
      ],
      [],
    );

    expect(missing).toEqual([]);
  });
});
