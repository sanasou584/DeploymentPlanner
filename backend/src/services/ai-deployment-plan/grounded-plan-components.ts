
import type {
  AnalysisKubernetesEvidence,
} from '../../models/entities/analysis.model.js';

import type {
  AiPlanResult,
} from './ai-deployment-plan.schema.js';

export interface GroundedComponent {
  name: string;
  kubernetes?: AnalysisKubernetesEvidence;
}

type PlanComponents = AiPlanResult['components'];

function resourcesFromEvidence(
  component: PlanComponents[number],
  source: AnalysisKubernetesEvidence,
): PlanComponents[number]['resources'] {
  const requests = source.resources?.requests;
  const limits = source.resources?.limits;

  return {
    requests: {
      cpu: requests?.cpu ?? component.resources.requests.cpu,
      memory: requests?.memory ?? component.resources.requests.memory,
    },
    limits: {
      cpu: limits?.cpu ?? component.resources.limits.cpu,
      memory: limits?.memory ?? component.resources.limits.memory,
    },
  };
}

function evidenceWarnings(
  component: PlanComponents[number],
  source: AnalysisKubernetesEvidence,
): string[] {
  const warnings: string[] = [];

  if (source.requiresReview) {
    warnings.push(
      `${component.name}: Kubernetes evidence requires review`,
    );
  }

  if (!source.image) {
    warnings.push(
      `${component.name}: container image was not detected`,
    );
  } else if (
    !source.image.includes('/') &&
    !source.image.includes('@')
  ) {
    warnings.push(
      `${component.name}: image "${source.image}" requires registry or build verification`,
    );
  }

  if (source.containerPort === null) {
    warnings.push(
      `${component.name}: no container port declared`,
    );
  }

  if (source.resources === null) {
    warnings.push(
      `${component.name}: resource limits and requests were not detected`,
    );
  }

  return warnings;
}

function applyEvidence(
  component: PlanComponents[number],
  source: AnalysisKubernetesEvidence,
): PlanComponents[number] {
  const noPortWorker =
    component.type === 'WORKER' &&
    source.containerPort === null;

  const containerPort = noPortWorker
    ? null
    : source.containerPort ?? component.containerPort;

  return {
    ...component,
    containerPort,
    servicePort: containerPort === null
      ? null
      : source.servicePort ?? component.servicePort ?? null,
    targetPort: containerPort === null
      ? null
      : source.targetPort ?? component.targetPort ?? null,
    image: source.image ?? component.image,
    resources: resourcesFromEvidence(component, source),
    ingress: containerPort === null
      ? {
          ...component.ingress,
          enabled: false,
        }
      : component.ingress,
  };
}

export function groundPlanComponents(
  components: PlanComponents,
  evidence: readonly GroundedComponent[],
): {
  components: PlanComponents;
  warnings: string[];
} {
  const byName = new Map(
    evidence.map((component) => [
      component.name.toLowerCase(),
      component.kubernetes,
    ]),
  );

  const warnings: string[] = [];

  const grounded = components.map((component) => {
    const source = byName.get(
      component.name.toLowerCase(),
    );

    if (!source) {
      warnings.push(
        `${component.name}: Kubernetes evidence unavailable`,
      );

      return component;
    }

    warnings.push(
      ...evidenceWarnings(component, source),
    );

    return applyEvidence(component, source);
  });

  return {
    components: grounded,
    warnings,
  };
}
