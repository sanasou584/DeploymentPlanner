
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

function analysis(
  root: string,
  files: string[],
  type: 'FRONTEND' | 'BACKEND',
): AnalysisDocument {
  return {
    detectedFiles: files,
    docker: {
      hasDockerfile: false,
      hasCompose: false,
      findings: [],
    },
    components: [{
      name: 'application',
      rootPath: root,
      type,
    }],
  } as unknown as AnalysisDocument;
}

describe('Multi-stack Dockerfile generation', () => {
  it('generates all files for Vite', () => {
    const candidates = inspectDockerfiles(
      analysis('frontend', [
        'frontend/package.json',
        'frontend/vite.config.ts',
        'frontend/src/App.tsx',
      ], 'FRONTEND'),
    );

    const proposal = candidates[0]?.proposal;

    expect(proposal?.strategy).toBe('VITE');

    expect(proposal?.files.map((file) => file.path))
      .toEqual([
        'frontend/Dockerfile',
        'frontend/.dockerignore',
        'frontend/nginx.conf',
      ]);

    expect(proposal?.content).toContain(
      'RUN npm run build',
    );

    expect(proposal?.content).toContain(
      'COPY nginx.conf',
    );
  });

  it('generates an Angular Dockerfile with Nginx', () => {
    const proposal = inspectDockerfiles(
      analysis('frontend', [
        'frontend/angular.json',
        'frontend/package.json',
      ], 'FRONTEND'),
    )[0]?.proposal;

    expect(proposal?.strategy).toBe('ANGULAR');
    expect(proposal?.content).toContain('nginx');
    expect(
      proposal?.files.some(
        (file) => file.path === 'frontend/nginx.conf',
      ),
    ).toBe(true);
  });

  it('generates Spring Boot Maven configuration', () => {
    const proposal = inspectDockerfiles(
      analysis('backend', [
        'backend/pom.xml',
        'backend/src/main/java/App.java',
      ], 'BACKEND'),
    )[0]?.proposal;

    expect(proposal?.strategy).toBe(
      'SPRING_BOOT_MAVEN',
    );

    expect(proposal?.content).toContain(
      'mvn -B -DskipTests package',
    );
  });

  it('generates ASP.NET Core configuration', () => {
    const proposal = inspectDockerfiles(
      analysis('backend', [
        'backend/MyApi.csproj',
        'backend/Program.cs',
      ], 'BACKEND'),
    )[0]?.proposal;

    expect(proposal?.strategy).toBe('DOTNET');

    expect(proposal?.content).toContain(
      'dotnet publish "MyApi.csproj"',
    );
  });

  it('does not classify an unknown frontend as Node API', () => {
    const candidate = inspectDockerfiles(
      analysis('frontend', [
        'frontend/package.json',
      ], 'FRONTEND'),
    )[0];

    expect(candidate?.status).toBe('UNSUPPORTED');
  });

  it('does not overwrite an existing Dockerfile', () => {
    const candidate = inspectDockerfiles({
      ...analysis('frontend', [
        'frontend/Dockerfile',
        'frontend/package.json',
        'frontend/vite.config.ts',
      ], 'FRONTEND'),
      docker: {
        hasDockerfile: true,
        hasCompose: false,
        findings: [],
      },
    } as AnalysisDocument)[0];

    expect(candidate?.status).toBe('EXISTS');
  });
});
