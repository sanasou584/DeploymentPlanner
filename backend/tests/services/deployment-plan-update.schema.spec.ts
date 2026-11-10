import { describe, expect, it } from 'vitest';

import {
  updatePlanComponentBodySchema,
} from '../../src/services/deployment-plans/deployment-plan.schema.js';

describe('Deployment Plan component update schema', () => {
  it('accepts a valid replica update', () => {
    const result = updatePlanComponentBodySchema.safeParse({
      replicas: 3,
    });

    expect(result.success).toBe(true);
  });

  it('accepts an empty image while editing a draft', () => {
    const result = updatePlanComponentBodySchema.safeParse({
      image: '',
      replicas: 2,
    });

    expect(result.success).toBe(true);
  });

  it('accepts an image provided by the user', () => {
    const result = updatePlanComponentBodySchema.safeParse({
      image: 'ghcr.io/acme/api:1.0.0',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid container port', () => {
    const result = updatePlanComponentBodySchema.safeParse({
      containerPort: 70000,
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid replica count', () => {
    const result = updatePlanComponentBodySchema.safeParse({
      replicas: 0,
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty update', () => {
    const result = updatePlanComponentBodySchema.safeParse({});

    expect(result.success).toBe(false);
  });
});