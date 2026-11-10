
import {
  MISSING_CI_TITLE,
  MISSING_DOCKERFILE_TITLE,
} from './audit-rules.js';

interface RecommendationIdentity {
  type: string;
  title: string;
  componentName?: string | undefined;
}

interface AnalysisComponentIdentity {
  name: string;
  type: string;
}

const DEPLOYABLE_TYPES = new Set([
  'BACKEND',
  'FRONTEND',
  'WORKER',
]);

function deployableComponents(
  components: readonly AnalysisComponentIdentity[],
): AnalysisComponentIdentity[] {
  return components.filter((component) =>
    DEPLOYABLE_TYPES.has(component.type),
  );
}

function sameMissingDockerfile(
  existing: RecommendationIdentity,
  incoming: RecommendationIdentity,
  components: readonly AnalysisComponentIdentity[],
): boolean {
  if (
    existing.type !== 'DOCKER' ||
    incoming.type !== 'DOCKER' ||
    existing.title !== MISSING_DOCKERFILE_TITLE
  ) {
    return false;
  }

  if (
    !/^Dockerfile \(.+\) is missing$/i.test(
      incoming.title,
    )
  ) {
    return false;
  }

  if (!incoming.componentName) {
    return false;
  }

  const deployable = deployableComponents(components);

  return (
    deployable.length === 1 &&
    deployable[0]?.name.toLowerCase() ===
      incoming.componentName.toLowerCase()
  );
}

function sameMissingCi(
  existing: RecommendationIdentity,
  incoming: RecommendationIdentity,
): boolean {
  return (
    existing.type === 'GENERAL' &&
    incoming.type === 'GENERAL' &&
    existing.title === MISSING_CI_TITLE &&
    /^CI\/CD pipeline is missing$/i.test(
      incoming.title,
    )
  );
}

export function isEquivalentAuditRecommendation(
  existing: RecommendationIdentity,
  incoming: RecommendationIdentity,
  components: readonly AnalysisComponentIdentity[],
): boolean {
  return (
    sameMissingDockerfile(
      existing,
      incoming,
      components,
    ) ||
    sameMissingCi(existing, incoming)
  );
}
