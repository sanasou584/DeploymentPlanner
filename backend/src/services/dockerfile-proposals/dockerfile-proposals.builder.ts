
import type {
  AnalysisDocument,
} from '../../models/entities/index.js';

import {
  createDefaultDockerStrategyRegistry,
} from './dockerfile-strategy.registry.js';

import {
  DOCKER_IGNORE,
  pathIn as strategyPathIn,
} from './dockerfile-strategy.shared.js';

import type {
  DockerArtifact,
  DockerStrategyContext,
  DockerStrategyResult,
} from './dockerfile-strategy.types.js';

export interface DockerfileProposal {
  componentName: string;
  rootPath: string;
  path: string;
  strategy: string;
  content: string;
  dockerignore: string;
  files: DockerArtifact[];
  warnings: string[];
}

export interface DockerfileCandidate {
  componentName: string;
  rootPath: string;
  path: string;
  status: 'EXISTS' | 'UNSUPPORTED' | 'GENERATABLE';
  reason: string;
  proposal?: DockerfileProposal;
}

type FileSet = ReadonlySet<string>;

type Template = {
  id: string;
  matches(files: FileSet, root: string): boolean;
  render(files: FileSet, root: string): string;
  warnings: readonly string[];
};

function pathIn(
  root: string,
  name: string,
): string {
  return root ? `${root}/${name}` : name;
}

function hasAny(
  files: FileSet,
  root: string,
  names: readonly string[],
): boolean {
  return names.some((name) =>
    files.has(pathIn(root, name)),
  );
}

function installCommand(
  files: FileSet,
  root: string,
): string {
  return files.has(
    pathIn(root, 'package-lock.json'),
  )
    ? 'RUN npm ci'
    : 'RUN npm install';
}

const TEMPLATES: readonly Template[] = [
  {
    id: 'NEXTJS',

    matches: (files, root) =>
      hasAny(files, root, [
        'next.config.js',
        'next.config.mjs',
        'next.config.ts',
        'next.config.mts',
      ]) &&
      files.has(pathIn(root, 'package.json')),

    render: (files, root) => [
      'FROM node:22-alpine AS build',
      'WORKDIR /app',
      'COPY package*.json ./',
      installCommand(files, root),
      'COPY . .',
      'RUN npm run build',
      '',
      'FROM node:22-alpine',
      'ENV NODE_ENV=production',
      'WORKDIR /app',
      'COPY --from=build /app/package*.json ./',
      'COPY --from=build /app/node_modules ./node_modules',
      'COPY --from=build /app/.next ./.next',
      ...(
        files.has(pathIn(root, 'public')) ||
        [...files].some((file) =>
          file.startsWith(
            pathIn(root, 'public/'),
          )
        )
          ? [
              'COPY --from=build /app/public ./public',
            ]
          : []
      ),
      'EXPOSE 3000',
      'CMD ["npm", "run", "start"]',
      '',
    ].join('\n'),

    warnings: [
      'Verify Next.js build and start scripts.',
      'Verify Next.js runtime configuration.',
      'Verify environment variables.',
      'NEXT_PUBLIC_* values must be configured during build.',
      'Review Node.js version compatibility.',
      'Docker build has not been executed.',
    ],
  },
  {
    id: 'NODE',

    matches: (files, root) =>
      files.has(
        pathIn(root, 'package.json'),
      ),

    render: (files, root) => [
      'FROM node:22-bookworm-slim AS build',
      'WORKDIR /app',
      'COPY package*.json ./',
      installCommand(files, root),
      'COPY . .',
      ...(
        files.has(
          pathIn(root, 'tsconfig.json'),
        )
          ? ['RUN npm run build']
          : []
      ),
      '',
      'FROM node:22-bookworm-slim',
      'ENV NODE_ENV=production',
      'WORKDIR /app',
      'COPY --from=build /app ./',
      'EXPOSE 4000',
      'CMD ["npm", "run", "start"]',
      '',
    ].join('\n'),

    warnings: [
      'Verify the package.json start script exists.',
      'Verify build script if TypeScript is detected.',
      'Verify application port.',
      'Review production dependencies.',
      'Review runtime environment variables.',
      'Use a non-root runtime user before production.',
      'Docker build has not been executed.',
    ],
  },
];

function normalizedRoot(
  path: string,
): string | null {
  const value = path
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/$/, '');

  if (value === '.' || value === '') {
    return '';
  }

  if (
    value.startsWith('/') ||
    value.split('/').some(
      (segment) => segment === '..'
    )
  ) {
    return null;
  }

  return /^[a-zA-Z0-9_./-]+$/.test(value)
    ? value
    : null;
}

function normalizeDetectedFile(
  path: string,
): string {
  return path
    .replace(/\\/g, '/')
    .replace(/^\.\//, '');
}

function isExistingDockerfile(
  files: FileSet,
  path: string,
): boolean {
  return files.has(path);
}

function hasUnknownDockerfilePath(
  analysis: AnalysisDocument,
  files: FileSet,
): boolean {
  if (!analysis.docker.hasDockerfile) {
    return false;
  }

  return ![...files].some((file) =>
    /(^|\/)Dockerfile$/i.test(file),
  );
}

function unsupportedCandidate(
  componentName: string,
  rootPath: string,
  path: string,
  reason: string,
): DockerfileCandidate {
  return {
    componentName,
    rootPath,
    path,
    status: 'UNSUPPORTED',
    reason,
  };
}

function buildArtifacts(
  root: string,
  dockerfilePath: string,
  result: DockerStrategyResult,
  existingFiles: FileSet,
): DockerArtifact[] {
  const artifacts: DockerArtifact[] = [
    {
      path: dockerfilePath,
      content: result.content,
    },
  ];

  const ignorePath = strategyPathIn(
    root,
    '.dockerignore',
  );

  if (!existingFiles.has(ignorePath)) {
    artifacts.push({
      path: ignorePath,
      content: DOCKER_IGNORE,
    });
  }

  for (const file of result.files) {
    const normalizedPath = normalizeDetectedFile(
      file.path,
    );

    if (
      existingFiles.has(normalizedPath) ||
      artifacts.some(
        (item) => item.path === normalizedPath,
      )
    ) {
      continue;
    }

    artifacts.push({
      path: normalizedPath,
      content: file.content,
    });
  }

  return artifacts;
}

function resolveLegacyTemplate(
  files: FileSet,
  root: string,
  componentType: string,
): Template | undefined {
  return TEMPLATES.find((template) => {
    if (
      template.id === 'NODE' &&
      componentType !== 'BACKEND' &&
      componentType !== 'WORKER'
    ) {
      return false;
    }

    return template.matches(
      files,
      root,
    );
  });
}

function buildLegacyResult(
  template: Template,
  files: FileSet,
  root: string,
): DockerStrategyResult {
  return {
    content: template.render(
      files,
      root,
    ),
    files: [],
    warnings: [
      ...template.warnings,
    ],
  };
}

function createProposal(
  context: DockerStrategyContext,
  componentName: string,
  rootPath: string,
  dockerfilePath: string,
  existingFiles: FileSet,
  registry: ReturnType<
    typeof createDefaultDockerStrategyRegistry
  >,
): DockerfileCandidate {
  const base = {
    componentName,
    rootPath,
    path: dockerfilePath,
  };

  try {
    const advanced = registry.resolve(
      context,
    );

    const legacy = advanced
      ? undefined
      : resolveLegacyTemplate(
          context.files,
          context.root,
          context.componentType,
        );

    if (!advanced && !legacy) {
      return unsupportedCandidate(
        componentName,
        rootPath,
        dockerfilePath,
        'No compatible Dockerfile strategy was detected. Manual review required.',
      );
    }

    const result = advanced
      ? advanced.generate(context)
      : buildLegacyResult(
          legacy!,
          context.files,
          context.root,
        );

    if (!result.content.trim()) {
      return unsupportedCandidate(
        componentName,
        rootPath,
        dockerfilePath,
        'Dockerfile strategy generated empty content.',
      );
    }

    const artifacts = buildArtifacts(
      context.root,
      dockerfilePath,
      result,
      existingFiles,
    );

    const proposal: DockerfileProposal = {
      ...base,
      strategy:
        advanced?.id ?? legacy!.id,
      content: result.content,
      dockerignore: DOCKER_IGNORE,
      files: artifacts,
      warnings: result.warnings,
    };

    return {
      ...base,
      status: 'GENERATABLE',
      reason:
        'Dockerfile template and companion files are available for review.',
      proposal,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown Dockerfile generation error';

    return unsupportedCandidate(
      componentName,
      rootPath,
      dockerfilePath,
      `Dockerfile generation requires review: ${message}`,
    );
  }
}

export function inspectDockerfiles(
  analysis: AnalysisDocument,
): DockerfileCandidate[] {
  const files = new Set(
    analysis.detectedFiles.map(
      normalizeDetectedFile,
    ),
  );

  const registry =
    createDefaultDockerStrategyRegistry();

  return analysis.components.map(
    (component): DockerfileCandidate => {
      const root = normalizedRoot(
        component.rootPath,
      );

      if (root === null) {
        return unsupportedCandidate(
          component.name,
          component.rootPath,
          '',
          'Unsafe or unsupported component root path.',
        );
      }

      const dockerfilePath = pathIn(
        root,
        'Dockerfile',
      );

      const base = {
        componentName: component.name,
        rootPath: component.rootPath,
        path: dockerfilePath,
      };

      if (
        isExistingDockerfile(
          files,
          dockerfilePath,
        )
      ) {
        return {
          ...base,
          status: 'EXISTS',
          reason:
            'Dockerfile detected; existing file will not be overwritten.',
        };
      }

      if (
        hasUnknownDockerfilePath(
          analysis,
          files,
        )
      ) {
        return unsupportedCandidate(
          component.name,
          component.rootPath,
          dockerfilePath,
          'Analysis reports a Dockerfile but did not provide its path. Manual review required.',
        );
      }

      return createProposal(
        {
          root,
          files,
          componentType: component.type,
        },
        component.name,
        component.rootPath,
        dockerfilePath,
        files,
        registry,
      );
    },
  );
}
