
import {
  ConflictError,
} from '../../domain/errors/index.js';

import {
  contentHashOf,
} from '../../models/entities/index.js';

import type {
  ManifestOutput,
} from '../kubernetes-manifests/kubernetes-manifest.builder.js';

export interface StoredKubernetesManifest {
  kind: string;
  componentName?: string;
  path: string;
  content: string;
  contentHash: string;
  planVersion?: number;
  validation: {
    status: string;
  };
}

export function assertManifestsReadyForServerValidation(
  stored: readonly StoredKubernetesManifest[],
  expected: readonly ManifestOutput[],
  planVersion: number,
): void {
  if (
    expected.length === 0 ||
    stored.length !== expected.length
  ) {
    throw new ConflictError(
      'The Kubernetes manifest set is incomplete or contains unexpected files',
    );
  }

  for (const output of expected) {
    const matches = stored.filter(
      (file) =>
        file.kind === output.kind &&
        file.componentName === output.componentName,
    );

    if (matches.length !== 1) {
      throw new ConflictError(
        `Expected exactly one manifest: ${output.path}`,
      );
    }

    const file = matches[0];

    if (!file) {
      throw new ConflictError(
        `Missing Kubernetes manifest: ${output.path}`,
      );
    }

    if (file.validation.status !== 'VALID') {
      throw new ConflictError(
        `Local validation is required for ${output.path}`,
      );
    }

    if (
      file.planVersion !== planVersion ||
      file.path !== output.path ||
      file.content !== output.content ||
      file.contentHash !== contentHashOf(file.content)
    ) {
      throw new ConflictError(
        `Kubernetes manifest differs from the approved plan: ${output.path}`,
      );
    }
  }
}
