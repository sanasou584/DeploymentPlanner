
import { describe, expect, it } from 'vitest';

import {
  assertAiProposalImages,
  assertPlanImagesReady,
  findContainerImageIssues,
  isPlaceholderImage,
} from '../../src/services/plan-quality/container-image-quality.js';

describe('Container image quality', () => {
  it('detects placeholder registry images', () => {
    expect(
      isPlaceholderImage(
        'registry.example.com/app:1.0.0',
      ),
    ).toBe(true);

    expect(
      isPlaceholderImage(
        'your-registry/frontend:latest',
      ),
    ).toBe(true);
  });

  it('accepts concrete image references', () => {
    expect(
      isPlaceholderImage('redis:7-alpine'),
    ).toBe(false);

    expect(
      isPlaceholderImage(
        'ghcr.io/company/backend:v1',
      ),
    ).toBe(false);
  });

  it('rejects missing images at approval', () => {
    expect(() =>
      assertPlanImagesReady([
        { name: 'frontend' },
      ]),
    ).toThrow(
      'container image is required',
    );
  });

  it('rejects placeholder images in AI proposals', () => {
    expect(() =>
      assertAiProposalImages([
        {
          name: 'frontend',
          image: 'registry.example.com/app:1.0.0',
        },
      ]),
    ).toThrow(
      'AI proposal contains invalid container images',
    );
  });

  it('allows unresolved images in AI drafts', () => {
    expect(() =>
      assertAiProposalImages([
        { name: 'frontend' },
      ]),
    ).not.toThrow();
  });

  it('detects all affected components', () => {
    const issues = findContainerImageIssues(
      [
        { name: 'frontend' },
        {
          name: 'backend',
          image: 'placeholder/backend:v1',
        },
      ],
      true,
    );

    expect(issues).toHaveLength(2);
  });

  it('accepts a complete image configuration', () => {
    expect(() =>
      assertPlanImagesReady([
        {
          name: 'frontend',
          image: 'ghcr.io/company/frontend:v1',
        },
        {
          name: 'backend',
          image: 'ghcr.io/company/backend:v1',
        },
      ]),
    ).not.toThrow();
  });
});