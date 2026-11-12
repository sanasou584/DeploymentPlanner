import type {
  PlanComponent,
} from '../../models/entities/deployment-plan.model.js';

import {
  ConflictError,
} from '../../domain/errors/index.js';

import {
  isPlaceholderImage,
} from '../plan-quality/container-image-quality.js';

export interface ImageRepository {
  owner: string;
  name: string;
}

export interface ImageReferenceInput {
  repository: ImageRepository;
  version: number;
  components: readonly PlanComponent[];
}

function slug(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');

  return normalized;
}

function assertRepository(
  repository: ImageRepository,
): void {
  if (
    !repository.owner.trim() ||
    !repository.name.trim() ||
    !slug(repository.owner) ||
    !slug(repository.name)
  ) {
    throw new ConflictError(
      'A valid connected GitHub repository is required',
    );
  }
}

export function buildImageReference(
  repository: ImageRepository,
  componentName: string,
  version: number,
): string {
  assertRepository(repository);

  if (!Number.isSafeInteger(version) || version < 1) {
    throw new ConflictError(
      'Invalid deployment plan version',
    );
  }

  const owner = slug(repository.owner);
  const repositoryName = slug(repository.name);
  const component = slug(componentName);

  if (!component) {
    throw new ConflictError(
      'Invalid deployment component name',
    );
  }

  const imageName =
    `${repositoryName}-${component}`.slice(0, 180);

  return [
    `ghcr.io/${owner}`,
    `${imageName}:plan-v${version}`,
  ].join('/');
}

function isExistingImageUsable(
  image: string | undefined,
): image is string {
  if (!image?.trim()) {
    return false;
  }

  return (
    !isPlaceholderImage(image) &&
    !/\s/.test(image)
  );
}

export function proposeImageReferences(
  input: ImageReferenceInput,
): PlanComponent[] {
  assertRepository(input.repository);

  return input.components.map((component) => {
    if (isExistingImageUsable(component.image)) {
      return {
        ...component,
        image: component.image.trim(),
      };
    }

    if (component.type === 'DATABASE') {
      return {
        ...component,
        image: undefined,
      };
    }

    return {
      ...component,
      image: buildImageReference(
        input.repository,
        component.name,
        input.version,
      ),
    };
  });
}
