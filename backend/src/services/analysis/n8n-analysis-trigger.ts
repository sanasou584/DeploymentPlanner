import { InvariantViolationError } from '../../domain/errors/index.js';
import { INTERNAL_SECRET_HEADER } from '../../shared/security/internal-auth.js';

const TRIGGER_TIMEOUT_MS = 10_000;

export interface AnalysisTriggerPayload {
  analysisId: string;
  repository: {
    owner: string;
    name: string;
    branch: string;
  };
}

export function createN8nAnalysisTrigger(webhookUrl: string, sharedSecret: string) {
  async function trigger(payload: AnalysisTriggerPayload): Promise<void> {
    let response: Response;

    try {
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [INTERNAL_SECRET_HEADER]: sharedSecret,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(TRIGGER_TIMEOUT_MS),
      });
    } catch {
      throw new InvariantViolationError('Analysis workflow is unreachable, try again later');
    }

    if (!response.ok) {
      throw new InvariantViolationError(
        `Analysis workflow rejected the request (${response.status})`,
        { status: response.status },
      );
    }
  }

  return { trigger };
}

export type AnalysisTrigger = ReturnType<typeof createN8nAnalysisTrigger>;