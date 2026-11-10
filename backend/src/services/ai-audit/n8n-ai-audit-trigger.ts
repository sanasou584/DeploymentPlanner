import { InvariantViolationError } from '../../domain/errors/index.js';
import { INTERNAL_SECRET_HEADER } from '../../shared/security/internal-auth.js';

const TRIGGER_TIMEOUT_MS = 10_000;

export interface AiAuditTriggerPayload {
  analysisId: string;
  repository: {
    owner: string;
    name: string;
    branch: string;
  };
}

export function createN8nAiAuditTrigger(webhookUrl: string, sharedSecret: string) {
  async function trigger(payload: AiAuditTriggerPayload): Promise<void> {
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
      throw new InvariantViolationError('AI audit workflow is unreachable, try again later');
    }

    if (!response.ok) {
      throw new InvariantViolationError(
        `AI audit workflow rejected the request (${response.status})`,
        { status: response.status },
      );
    }
  }

  return { trigger };
}

export type AiAuditTrigger = ReturnType<typeof createN8nAiAuditTrigger>;
