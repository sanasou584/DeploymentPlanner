
import { ConflictError } from '../../domain/errors/index.js';

export interface ImageComponent {
  name: string;
  image?: string | undefined;
}

const PLACEHOLDER_PATTERNS = [
  /(^|[/:._-])example([/:._-]|$)/i,
  /(^|[/:._-])placeholder([/:._-]|$)/i,
  /(^|[/:._-])changeme([/:._-]|$)/i,
  /(^|[/:._-])your-registry([/:._-]|$)/i,
  /^<.*>$/,
];

export function isPlaceholderImage(
  image: string,
): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) =>
    pattern.test(image.trim()),
  );
}

export function findContainerImageIssues(
  components: readonly ImageComponent[],
  requireImages: boolean,
): string[] {
  const issues: string[] = [];

  for (const component of components) {
    const image = component.image?.trim();

    if (!image) {
      if (requireImages) {
        issues.push(
          `${component.name}: container image is required`,
        );
      }

      continue;
    }

    if (isPlaceholderImage(image)) {
      issues.push(
        `${component.name}: placeholder container image is not allowed (${image})`,
      );
    }

    if (/\s/.test(image)) {
      issues.push(
        `${component.name}: container image contains whitespace`,
      );
    }
  }

  return issues;
}

export function assertAiProposalImages(
  components: readonly ImageComponent[],
): void {
  const issues = findContainerImageIssues(
    components,
    false,
  );

  if (issues.length > 0) {
    throw new ConflictError(
      `AI proposal contains invalid container images: ${issues.join('; ')}`,
    );
  }
}

export function assertPlanImagesReady(
  components: readonly ImageComponent[],
): void {
  const issues = findContainerImageIssues(
    components,
    true,
  );

  if (issues.length > 0) {
    throw new ConflictError(
      `Deployment plan is not ready for approval: ${issues.join('; ')}`,
    );
  }
}