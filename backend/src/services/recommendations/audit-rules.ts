import type {
  RecommendationSeverity,
  RecommendationType,
} from '../../domain/enums/recommendation.enums.js';

export const RULES_GENERATED_BY = { provider: 'internal', model: 'audit-rules-v1' } as const;

export const MISSING_DOCKERFILE_TITLE = 'No Dockerfile found in the repository';
export const MISSING_CI_TITLE = 'No GitHub Actions workflow found';

export interface AuditFinding {
  ruleId: string;
  severity: string;
  message: string;
  file?: string | undefined;
  line?: number | undefined;
}

export interface AuditContext {
  detectedFiles: readonly string[];
  docker: {
    hasDockerfile: boolean;
    findings: readonly AuditFinding[];
  };
}

export interface RuleRecommendation {
  type: RecommendationType;
  severity: RecommendationSeverity;
  title: string;
  description: string;
  suggestedValue?: string;
}

type AuditRule = (context: AuditContext) => RuleRecommendation[];

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;
const WORKFLOW_PATH = /^\.github\/workflows\/[^/]+\.ya?ml$/;

const SEVERITY_BY_FINDING: Readonly<Partial<Record<string, RecommendationSeverity>>> = {
  ERROR: 'CRITICAL',
  WARNING: 'WARNING',
};

const TYPE_BY_RULE: Readonly<Partial<Record<string, RecommendationType>>> = {
  COMPOSE_PLAINTEXT_CREDENTIAL: 'SECURITY',
};

const ADVICE_BY_RULE: Readonly<Partial<Record<string, string>>> = {
  COMPOSE_PLAINTEXT_CREDENTIAL:
    'Reference the value from an environment variable or a secret instead of writing it in the file, and keep real values out of version control.',
};

const clip = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 3)}...`;

const locationOf = (finding: AuditFinding): string => {
  if (finding.file === undefined) {
    return '';
  }

  return finding.line === undefined ? ` (${finding.file})` : ` (${finding.file}:${finding.line})`;
};

const dockerFindingsRule: AuditRule = (context) =>
  context.docker.findings.map((finding) => {
    const advice = ADVICE_BY_RULE[finding.ruleId];

    return {
      type: TYPE_BY_RULE[finding.ruleId] ?? 'DOCKER',
      severity: SEVERITY_BY_FINDING[finding.severity] ?? 'INFO',
      title: clip(`${finding.message}${locationOf(finding)}`, TITLE_MAX),
      description: clip(
        `Rule ${finding.ruleId}: ${finding.message}${locationOf(finding)}`,
        DESCRIPTION_MAX,
      ),
      ...(advice !== undefined ? { suggestedValue: advice } : {}),
    };
  });

const missingDockerfileRule: AuditRule = (context) =>
  context.docker.hasDockerfile
    ? []
    : [
        {
          type: 'DOCKER',
          severity: 'WARNING',
          title: MISSING_DOCKERFILE_TITLE,
          description:
            'No Dockerfile was detected, so the application cannot be containerized and deployed to Kubernetes as is.',
          suggestedValue: 'Generate a multi-stage Dockerfile for each deployable component.',
        },
      ];

const missingCiRule: AuditRule = (context) =>
  context.detectedFiles.some((path) => WORKFLOW_PATH.test(path))
    ? []
    : [
        {
          type: 'GENERAL',
          severity: 'INFO',
          title: MISSING_CI_TITLE,
          description:
            'No workflow was detected under .github/workflows, so builds and tests are not automated.',
          suggestedValue:
            'Add a GitHub Actions workflow that runs the tests and builds the Docker image.',
        },
      ];

export const AUDIT_RULES: readonly AuditRule[] = [
  dockerFindingsRule,
  missingDockerfileRule,
  missingCiRule,
];

export function runAuditRules(context: AuditContext): RuleRecommendation[] {
  return AUDIT_RULES.flatMap((rule) => rule(context));
}