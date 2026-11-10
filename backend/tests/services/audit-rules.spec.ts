import { describe, expect, it } from 'vitest';

import {
  runAuditRules,
  RULES_GENERATED_BY,
  type AuditContext,
} from '../../src/services/recommendations/audit-rules.js';

/** Extracts item 0 with a loud failure instead of a partial-product assertion. */
function first<T>(items: readonly T[]): T {
  const [item] = items;
  if (item === undefined) {
    throw new Error('expected at least one rule result');
  }
  return item;
}

function context(overrides: Partial<AuditContext> = {}): AuditContext {
  return {
    detectedFiles: ['src/index.ts'],
    docker: { hasDockerfile: false, findings: [] },
    ...overrides,
  };
}

describe('audit rules', () => {
  it('flags a missing Dockerfile as a DOCKER/WARNING recommendation', () => {
    const rules = runAuditRules(context());

    expect(rules.map((rule) => rule.title)).toContain('No Dockerfile found in the repository');
    expect(first(rules.filter((rule) => rule.title === 'No Dockerfile found in the repository')))
      .toMatchObject({
        type: 'DOCKER',
        severity: 'WARNING',
      });
    expect(typeof first(rules).suggestedValue).toBe('string');
  });

  it('flags a missing CI workflow as a GENERAL/INFO recommendation', () => {
    const ci = first(runAuditRules(context()).filter((rule) => rule.type === 'GENERAL'));

    expect(ci).toMatchObject({
      severity: 'INFO',
      title: 'No GitHub Actions workflow found',
    });
  });

  it('skips both missing-* rules when the repository already has them', () => {
    const rules = runAuditRules(
      context({
        detectedFiles: ['.github/workflows/ci.yml'],
        docker: { hasDockerfile: true, findings: [] },
      }),
    );

    expect(rules).toHaveLength(0);
  });

  it('maps ERROR findings to CRITICAL docker recommendations with their location', () => {
    const finding = first(
      runAuditRules(
        context({
          docker: {
            hasDockerfile: true,
            findings: [
              {
                ruleId: 'IMAGE_TAG_LATEST',
                severity: 'ERROR',
                message: 'Uses the latest tag',
                file: 'Dockerfile',
                line: 4,
              },
            ],
          },
        }),
      ),
    );

    expect(finding).toMatchObject({
      type: 'DOCKER',
      severity: 'CRITICAL',
      title: 'Uses the latest tag (Dockerfile:4)',
    });
    expect(finding.description).toContain('IMAGE_TAG_LATEST');
  });

  it('maps WARNING findings to WARNING and keeps the file reference', () => {
    const finding = first(
      runAuditRules(
        context({
          docker: {
            hasDockerfile: true,
            findings: [
              {
                ruleId: 'NO_HEALTHCHECK',
                severity: 'WARNING',
                message: 'No healthcheck',
                file: 'Dockerfile',
              },
            ],
          },
        }),
      ),
    );

    expect(finding).toMatchObject({
      severity: 'WARNING',
      title: 'No healthcheck (Dockerfile)',
    });
  });

  it('falls back to DOCKER/INFO for unknown rule ids and severities', () => {
    const finding = first(
      runAuditRules(
        context({
          docker: {
            hasDockerfile: true,
            findings: [{ ruleId: 'SOMETHING_NEW', severity: 'INFO', message: 'New detection' }],
          },
        }),
      ),
    );

    expect(finding).toMatchObject({ type: 'DOCKER', severity: 'INFO' });
    expect(finding.suggestedValue).toBeUndefined();
  });

  it('turns the plaintext-credential compose rule into a SECURITY recommendation with advice', () => {
    const finding = first(
      runAuditRules(
        context({
          docker: {
            hasDockerfile: true,
            findings: [
              {
                ruleId: 'COMPOSE_PLAINTEXT_CREDENTIAL',
                severity: 'WARNING',
                message: 'Plaintext secret in compose',
                file: 'docker-compose.yml',
                line: 12,
              },
            ],
          },
        }),
      ),
    );

    expect(finding).toMatchObject({ type: 'SECURITY', severity: 'WARNING' });
    expect(typeof finding.suggestedValue).toBe('string');
    expect(finding.suggestedValue).toContain('environment variable');
  });

  it('stamps every ruleset with the internal audit-rules origin', () => {
    expect(RULES_GENERATED_BY).toMatchObject({ provider: 'internal', model: 'audit-rules-v1' });
  });
});
