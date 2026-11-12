
import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  contentHashOf,
} from '../../src/models/entities/index.js';

import {
  assertManifestsReadyForServerValidation,
} from '../../src/services/kubernetes-server-validation/kubernetes-server-validation.rules.js';

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
    '',
  ].join('\n'),
};

const stored = {
  kind: expected.kind,
  componentName: expected.componentName,
  path: expected.path,
  content: expected.content,
  contentHash: contentHashOf(expected.content),
  planVersion: 5,
  validation: {
    status: 'VALID',
  },
};

describe('Kubernetes server validation rules', () => {
  it('accepts locally validated manifests', () => {
    expect(() =>
      assertManifestsReadyForServerValidation(
        [stored],
        [expected],
        5,
      ),
    ).not.toThrow();
  });

  it('rejects pending local validation', () => {
    expect(() =>
      assertManifestsReadyForServerValidation(
        [{
          ...stored,
          validation: {
            status: 'PENDING',
          },
        }],
        [expected],
        5,
      ),
    ).toThrow('Local validation is required');
  });

  it('rejects outdated plan versions', () => {
    expect(() =>
      assertManifestsReadyForServerValidation(
        [{
          ...stored,
          planVersion: 4,
        }],
        [expected],
        5,
      ),
    ).toThrow('differs from the approved plan');
  });

  it('rejects modified manifest content', () => {
    expect(() =>
      assertManifestsReadyForServerValidation(
        [{
          ...stored,
          content: 'kind: "Service"\n',
          contentHash: contentHashOf(
            'kind: "Service"\n',
          ),
        }],
        [expected],
        5,
      ),
    ).toThrow('differs from the approved plan');
  });

  it('rejects missing files', () => {
    expect(() =>
      assertManifestsReadyForServerValidation(
        [],
        [expected],
        5,
      ),
    ).toThrow('incomplete');
  });

  it('rejects duplicate manifests', () => {
    expect(() =>
      assertManifestsReadyForServerValidation(
        [stored, stored],
        [expected],
        5,
      ),
    ).toThrow();
  });
});
