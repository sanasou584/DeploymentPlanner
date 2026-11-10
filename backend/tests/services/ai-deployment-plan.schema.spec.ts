
import { describe, expect, it } from 'vitest';

import {
  aiPlanResultSchema,
} from '../../src/services/ai-deployment-plan/ai-deployment-plan.schema.js';

const validProposal = {
  components: [
    {
      name: 'backend',
      type: 'BACKEND',
      containerPort: 4000,
      replicas: 1,
      resources: {
        requests: {
          cpu: '100m',
          memory: '128Mi',
        },
        limits: {
          cpu: '500m',
          memory: '512Mi',
        },
      },
      hpa: {
        enabled: false,
      },
      ingress: {
        enabled: false,
        tls: false,
      },
    },
  ],
  assumptions: [
    'Port 4000 must be verified against the application configuration.',
  ],
};

describe('AI deployment plan schema', () => {
  it('accepts a valid proposal', () => {
    const result = aiPlanResultSchema.safeParse(validProposal);
    expect(result.success).toBe(true);
  });

  it('rejects a missing container port', () => {
    const component = validProposal.components[0];

    if (!component) {
      throw new Error('Test component missing');
    }

    const withoutPort = {
      ...component,
      containerPort: undefined,
    };

    const result = aiPlanResultSchema.safeParse({
      components: [withoutPort],
      assumptions: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects zero replicas', () => {
    const invalid = structuredClone(validProposal);
    invalid.components[0]!.replicas = 0;

    expect(
      aiPlanResultSchema.safeParse(invalid).success,
    ).toBe(false);
  });

  it('rejects missing HPA enabled', () => {
    const component = validProposal.components[0];

    expect(
      aiPlanResultSchema.safeParse({
        components: [{
          ...component,
          hpa: {},
        }],
        assumptions: [],
      }).success,
    ).toBe(false);
  });

  it('rejects missing Ingress TLS', () => {
    const component = validProposal.components[0];

    expect(
      aiPlanResultSchema.safeParse({
        components: [{
          ...component,
          ingress: {
            enabled: false,
          },
        }],
        assumptions: [],
      }).success,
    ).toBe(false);
  });

  it('rejects unknown fields', () => {
    const result = aiPlanResultSchema.safeParse({
      ...validProposal,
      unexpected: 'value',
    });

    expect(result.success).toBe(false);
  });
});
