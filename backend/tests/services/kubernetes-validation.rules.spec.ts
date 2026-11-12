
import {
  describe,
  expect,
  it,
} from 'vitest';

import { createHash } from 'node:crypto';

import {
  validateManifestContent,
} from '../../src/services/kubernetes-validation/kubernetes-validation.rules.js';

import type {
  ManifestOutput,
} from '../../src/services/kubernetes-manifests/kubernetes-manifest.builder.js';

const expected: ManifestOutput = {
  kind: 'K8S_DEPLOYMENT',
  componentName: 'MovieMatchLibrary-frontend',
  fileName: 'deployment.yaml',
  path: 'k8s/moviematchlibrary-frontend/deployment.yaml',
  content: [
    'apiVersion: "apps/v1"',
    'kind: "Deployment"',
    'metadata:',
    '  name: "moviematchlibrary-frontend"',
    '',
  ].join('\n'),
};

function hash(content: string): string {
  return createHash('sha256')
    .update(content, 'utf8')
    .digest('hex');
}

const actual = {
  kind: expected.kind,
  componentName: expected.componentName,
  path: expected.path,
  content: expected.content,
  contentHash: hash(expected.content),
  planVersion: 5,
};

describe('Kubernetes validation rules', () => {
  it('accepts a manifest matching the approved plan', () => {
    expect(
      validateManifestContent(actual, expected, 5),
    ).toEqual([]);
  });

  it('rejects content differing from the approved plan', () => {
    const modifiedContent = actual.content.replace(
      'Deployment',
      'Service',
    );

    const issues = validateManifestContent(
      {
        ...actual,
        content: modifiedContent,
        contentHash: hash(modifiedContent),
      },
      expected,
      5,
    );

    expect(issues).toContain(
      'Manifest content differs from the approved plan configuration',
    );
  });

  it('detects a corrupted content hash', () => {
    const issues = validateManifestContent(
      {
        ...actual,
        contentHash: 'incorrect',
      },
      expected,
      5,
    );

    expect(issues).toContain(
      'Manifest content integrity check failed',
    );
  });

  it('rejects an outdated plan version', () => {
    const issues = validateManifestContent(
      {
        ...actual,
        planVersion: 4,
      },
      expected,
      5,
    );

    expect(issues).toContain(
      'Manifest plan version is outdated',
    );
  });

  it('detects the wrong manifest path', () => {
    const issues = validateManifestContent(
      {
        ...actual,
        path: 'k8s/other/deployment.yaml',
      },
      expected,
      5,
    );

    expect(issues).toContain(
      'Manifest path does not match the expected path',
    );
  });
});
