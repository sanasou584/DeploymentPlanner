
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

export function groundPlanComponents(
  components: AiPlanResult['components'],
  evidence: GroundedComponent[],
): {
  components: AiPlanResult['components'];
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

    const requests = source.resources?.requests;
    const limits = source.resources?.limits;

    const hasResources = Boolean(
      requests?.cpu &&
      requests?.memory &&
      limits?.cpu &&
      limits?.memory,
    );

    const hasDeployableImage = Boolean(
      source.image &&
      (
        source.image.includes('/') ||
        source.image.includes('@')
      ),
    );

    if (source.requiresReview) {
      warnings.push(
        `${component.name}: Kubernetes configuration requires review`,
      );
    }

    if (source.image && !hasDeployableImage) {
      warnings.push(
        `${component.name}: image ${source.image} requires a build or registry resolution`,
      );
    }

    if (source.containerPort === null) {
      warnings.push(
        `${component.name}: container port not declared in the repository`,
      );
    }

    return {
      ...component,
        containerPort:
        component.type === 'WORKER' &&
        source.containerPort === null
          ? null
          : source.containerPort ?? component.containerPort,
        image: source.image ?? component.image,
      resources: hasResources
        ? {
            requests: {
              cpu: requests!.cpu!,
              memory: requests!.memory!,
            },
            limits: {
              cpu: limits!.cpu!,
              memory: limits!.memory!,
            },
          }
        : component.resources,
    };
  });

  return {
    components: grounded,
    warnings,
  };
}
