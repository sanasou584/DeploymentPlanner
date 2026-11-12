
import { createHash } from 'node:crypto';

import type {
  ManifestOutput,
} from '../kubernetes-manifests/kubernetes-manifest.builder.js';

export interface ManifestToValidate {
  kind: string;
  componentName?: string;
  path: string;
  content: string;
  contentHash: string;
  planVersion?: number;
}

function sha256(content: string): string {
  return createHash('sha256')
    .update(content, 'utf8')
    .digest('hex');
}

export function validateManifestContent(
  actual: ManifestToValidate,
  expected: ManifestOutput,
  planVersion: number,
): string[] {
  const issues: string[] = [];

  if (actual.kind !== expected.kind) {
    issues.push('Manifest kind does not match the plan');
  }

  if (actual.componentName !== expected.componentName) {
    issues.push('Manifest component does not match the plan');
  }

  if (actual.planVersion !== planVersion) {
    issues.push('Manifest plan version is outdated');
  }

  if (actual.path !== expected.path) {
    issues.push('Manifest path does not match the expected path');
  }

  if (actual.contentHash !== sha256(actual.content)) {
    issues.push('Manifest content integrity check failed');
  }

  if (actual.content !== expected.content) {
    issues.push(
      'Manifest content differs from the approved plan configuration',
    );
  }

  return issues;
}
