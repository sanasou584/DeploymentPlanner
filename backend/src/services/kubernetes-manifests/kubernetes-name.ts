
import {
  ConflictError,
} from '../../domain/errors/index.js';

export function toKubernetesName(
  value: string,
): string {
  const name = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (
    !name ||
    name.length > 63 ||
    !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(name)
  ) {
    throw new ConflictError(
      `Component name ${value} cannot be converted to a Kubernetes DNS label (max 63 characters)`,
    );
  }

  return name;
}
