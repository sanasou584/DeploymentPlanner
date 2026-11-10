import type {
  AnalysisKubernetesEvidence,
} from '../../models/entities/analysis.model.js';

import { ConflictError } from '../../domain/errors/index.js';

export interface AiPlanContext {
  analysisId: string;
  branch: string;
  environment: string;
    components: Array<{
    name: string;
    type: string;
    rootPath: string;
    kubernetes?: AnalysisKubernetesEvidence;
  }>;
  technologies: Array<{
    name: string;
    version?: string | undefined;
    category: string;
  }>;
  detectedFiles: string[];
  docker: {
    hasDockerfile: boolean;
    hasCompose: boolean;
  };
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    componentName?: string | undefined;
    suggestedValue?: string | undefined;
  }>;
}

export function createN8nAiPlanTrigger(
  webhookUrl: string,
  sharedSecret: string,
) {
  async function generate(payload: AiPlanContext): Promise<unknown> {
    let response: Response;

    try {
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': sharedSecret,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(90_000),
      });
    } catch {
      throw new ConflictError(
        'AI deployment plan workflow is unreachable',
      );
    }

    if (!response.ok) {
      throw new ConflictError(
        `AI deployment plan workflow failed (${response.status})`,
      );
    }

    try {
      return await response.json() as unknown;
    } catch {
      throw new ConflictError(
        'AI deployment plan workflow returned invalid JSON',
      );
    }
  }

  return { generate };
}

export type N8nAiPlanTrigger = ReturnType<
  typeof createN8nAiPlanTrigger
>;
