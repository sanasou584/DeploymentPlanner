
import { ConflictError } from '../../domain/errors/index.js';

export interface WorkflowComponent {
  name: string;
  rootPath: string;
  dockerfilePath: string;
  image: string;
}

export interface WorkflowInput {
  components: WorkflowComponent[];
  branch?: string;
}

function normalizePath(value: string): string {
  const path = value
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/$/, '');

  if (
    path.startsWith('/') ||
    path.split('/').some((segment) => segment === '..') ||
    !/^[a-zA-Z0-9_./-]*$/.test(path)
  ) {
    throw new ConflictError('Unsafe Docker build path');
  }

  return path;
}

function toDockerPath(value: string): string {
  const path = normalizePath(value);
  return path ? `./${path}` : '.';
}

function jobName(name: string, index: number): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '');

  return `build-${index + 1}-${normalized || 'component'}`;
}

function assertImage(image: string): void {
  if (
    !image.trim() ||
    /\s/.test(image) ||
    !/^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.\/-]+:[a-z0-9_.-]+$/i.test(image)
  ) {
    throw new ConflictError(
      'CI/CD requires a valid GHCR image reference',
    );
  }
}

function createJob(
  component: WorkflowComponent,
  index: number,
): string[] {
  assertImage(component.image);

  const context = toDockerPath(component.rootPath);
  const dockerfile = toDockerPath(
    component.dockerfilePath,
  );
  const name = jobName(component.name, index);

  return [
    `  ${name}:`,
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - name: Checkout source',
    '        uses: actions/checkout@v4',
    '        with:',
    '          persist-credentials: false',
    '      - name: Set up Docker Buildx',
    '        uses: docker/setup-buildx-action@v3',
    '      - name: Login to GitHub Container Registry',
    '        uses: docker/login-action@v3',
    '        with:',
    '          registry: ghcr.io',
    '          username: ${{ github.actor }}',
    '          password: ${{ secrets.GITHUB_TOKEN }}',
    `      - name: Build and publish ${name}`,
    '        uses: docker/build-push-action@v6',
    '        with:',
    `          context: ${context}`,
    `          file: ${dockerfile}`,
    '          push: true',
    `          tags: ${component.image}`,
    '          provenance: true',
    '',
  ];
}

export function generateBuildWorkflow(
  input: WorkflowInput,
): string {
  if (input.components.length === 0) {
    throw new ConflictError(
      'No buildable components were detected',
    );
  }

  const imageNames = input.components.map(
    (component) => component.image.toLowerCase(),
  );

  if (new Set(imageNames).size !== imageNames.length) {
    throw new ConflictError(
      'Each buildable component requires a unique image',
    );
  }

  return [
    'name: DeploymentPlanner - Build Docker Images',
    '',
    'on:',
    '  workflow_dispatch:',
    '  push:',
    '    branches:',
    `      - ${JSON.stringify(input.branch ?? 'main')}`,
    '',
    'permissions:',
    '  contents: read',
    '  packages: write',
    '',
    'jobs:',
    ...input.components.flatMap(createJob),
  ].join('\n') + '\n';
}
