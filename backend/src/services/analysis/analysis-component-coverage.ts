
import { ConflictError } from '../../domain/errors/index.js';

import type {
  AnalysisComponent,
} from '../../models/entities/analysis.model.js';

function normalizePath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

function dockerfileRoot(path: string): string | null {
  const normalized = normalizePath(path);

  if (!normalized.endsWith('/dockerfile')) {
    return null;
  }

  const root = normalized.slice(
    0,
    -'/dockerfile'.length,
  );

  return root.length > 0 ? root : null;
}

export function findMissingDockerComponents(
  detectedFiles: readonly string[],
  components: readonly AnalysisComponent[],
): string[] {
  const componentRoots = new Set(
    components.map((component) =>
      normalizePath(component.rootPath),
    ),
  );

  const dockerRoots = new Set(
    detectedFiles
      .map(dockerfileRoot)
      .filter((root): root is string => root !== null),
  );

  return [...dockerRoots]
    .filter((root) => !componentRoots.has(root))
    .sort();
}

export function assertAnalysisComponentCoverage(
  detectedFiles: readonly string[],
  components: readonly AnalysisComponent[],
): void {
  const missing = findMissingDockerComponents(
    detectedFiles,
    components,
  );

  if (missing.length > 0) {
    throw new ConflictError(
      `Repository analysis omitted Docker components: ${missing.join(', ')}`,
    );
  }
}