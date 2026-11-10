
import type { AnalysisDocument } from '../../models/entities/index.js';

export interface DockerfileProposal {
  componentName: string;
  rootPath: string;
  path: string;
  strategy: 'NEXTJS' | 'NODE';
  content: string;
  dockerignore: string;
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
  id: DockerfileProposal['strategy'];
  matches(files: FileSet, root: string): boolean;
  render(files: FileSet, root: string): string;
  warnings: readonly string[];
};

const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  '.env',
  '.env.*',
  '!.env.example',
  '.next',
  'dist',
  'coverage',
  '*.log',
].join('\n') + '\n';

function pathIn(root: string, name: string): string {
  return root ? `${root}/${name}` : name;
}

function hasAny(
  files: FileSet,
  root: string,
  names: readonly string[],
): boolean {
  return names.some((name) => files.has(pathIn(root, name)));
}

function installCommand(files: FileSet, root: string): string {
  return files.has(pathIn(root, 'package-lock.json'))
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
      ]) && files.has(pathIn(root, 'package.json')),

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
          file.startsWith(pathIn(root, 'public/'))
        )
          ? ['COPY --from=build /app/public ./public']
          : []
      ),
      'EXPOSE 3000',
      'CMD ["npm", "run", "start"]',
      '',
    ].join('\n'),

    warnings: [
      'Verify package scripts build/start, public directory and browser API URL.',
      'NEXT_PUBLIC_* values must be set during image build.',
      'Docker build has not been executed.',
    ],
  },
  {
    id: 'NODE',
    matches: (files, root) =>
      files.has(pathIn(root, 'package.json')),

    render: (files, root) => [
      'FROM node:22-bookworm-slim AS build',
      'WORKDIR /app',
      'COPY package*.json ./',
      installCommand(files, root),
      'COPY . .',
      ...(
        files.has(pathIn(root, 'tsconfig.json'))
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
      'Verify package scripts start/build, application port and runtime environment.',
      'Review production dependencies and use a non-root user before deployment.',
      'Docker build has not been executed.',
    ],
  },
];

function normalizedRoot(path: string): string | null {
  const value = path
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/$/, '');

  if (value === '.' || value === '') {
    return '';
  }

  if (
    value.startsWith('/') ||
    value.split('/').some((segment) => segment === '..')
  ) {
    return null;
  }

  return /^[a-zA-Z0-9_./-]+$/.test(value)
    ? value
    : null;
}

export function inspectDockerfiles(
  analysis: AnalysisDocument,
): DockerfileCandidate[] {
  const files = new Set(
    analysis.detectedFiles.map((item) =>
      item.replace(/\\/g, '/').replace(/^\.\//, '')
    ),
  );

  return analysis.components.map(
    (component): DockerfileCandidate => {
      const root = normalizedRoot(component.rootPath);

      if (root === null) {
        return {
          componentName: component.name,
          rootPath: component.rootPath,
          path: '',
          status: 'UNSUPPORTED',
          reason: 'Unsafe or unsupported component root path',
        };
      }

      const path = pathIn(root, 'Dockerfile');

      const base = {
        componentName: component.name,
        rootPath: component.rootPath,
        path,
      };

      if (files.has(path)) {
        return {
          ...base,
          status: 'EXISTS',
          reason: 'Dockerfile detected; will not overwrite',
        };
      }

      if (
        analysis.docker.hasDockerfile &&
        ![...files].some((file) =>
          /(^|\/)Dockerfile$/i.test(file)
        )
      ) {
        return {
          ...base,
          status: 'UNSUPPORTED',
          reason:
            'Analysis reports a Dockerfile but did not provide its path; review before generating',
        };
      }

      const template = TEMPLATES.find((item) =>
        item.matches(files, root)
      );

      if (!template) {
        return {
          ...base,
          status: 'UNSUPPORTED',
          reason:
            'No verified Dockerfile template for this component. Manual review required.',
        };
      }

      const proposal: DockerfileProposal = {
        ...base,
        strategy: template.id,
        content: template.render(files, root),
        dockerignore: DEFAULT_IGNORE,
        warnings: [...template.warnings],
      };

      return {
        ...base,
        status: 'GENERATABLE',
        reason: 'Template available for human review',
        proposal,
      };
    },
  );
}
