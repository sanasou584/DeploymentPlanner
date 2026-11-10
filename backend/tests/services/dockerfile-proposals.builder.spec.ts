
import {
  describe,
  expect,
  it,
} from 'vitest';

import type {
  AnalysisDocument,
} from '../../src/models/entities/index.js';

import {
  inspectDockerfiles,
} from '../../src/services/dockerfile-proposals/dockerfile-proposals.builder.js';

function sample(
  files: string[],
  dockerfilePresent = false,
): AnalysisDocument {
  return {
    detectedFiles: files,
    docker: {
      hasDockerfile: dockerfilePresent,
      hasCompose: false,
      findings: [],
    },
    components: [
      {
        name: 'frontend',
        rootPath: 'frontend',
        type: 'FRONTEND',
      },
      {
        name: 'backend',
        rootPath: 'backend',
        type: 'BACKEND',
      },
    ],
  } as unknown as AnalysisDocument;
}

describe('Dockerfile proposals', () => {
  it('generates different templates for Next.js and Node', () => {
    const result = inspectDockerfiles(sample([
      'frontend/next.config.ts',
      'frontend/package.json',
      'frontend/package-lock.json',
      'backend/package.json',
      'backend/tsconfig.json',
      'backend/package-lock.json',
    ]));

    expect(result.map((item) => item.status)).toEqual([
      'GENERATABLE',
      'GENERATABLE',
    ]);

    expect(result[0]?.proposal?.content).toContain(
      'RUN npm run build',
    );

    expect(result[0]?.proposal?.strategy).toBe('NEXTJS');
    expect(result[1]?.proposal?.strategy).toBe('NODE');

    expect(result[1]?.proposal?.path).toBe(
      'backend/Dockerfile',
    );
  });

  it('does not overwrite a detected Dockerfile', () => {
    const result = inspectDockerfiles(sample([
      'backend/Dockerfile',
      'backend/package.json',
    ], true));

    expect(result[1]?.status).toBe('EXISTS');
    expect(result[1]?.proposal).toBeUndefined();
  });

  it('refuses unsupported stacks', () => {
    const result = inspectDockerfiles(sample([
      'backend/main.py',
    ]));

    expect(result[1]?.status).toBe('UNSUPPORTED');
  });

  it('does not generate for ambiguous detected Dockerfile paths', () => {
    const result = inspectDockerfiles(
      sample(['backend/package.json'], true),
    );

    expect(
      result.every((item) => item.status === 'UNSUPPORTED'),
    ).toBe(true);
  });
});
