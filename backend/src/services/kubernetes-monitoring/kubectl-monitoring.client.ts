
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);

export interface KubernetesResource {
  kind?: string;
  metadata?: {
    name?: string;
    labels?: Record<string, string>;
  };
  spec?: {
    replicas?: number;
    type?: string;
    clusterIP?: string;
    ports?: Array<{
      port?: number;
      targetPort?: number | string;
    }>;
  };
  status?: {
    replicas?: number;
    readyReplicas?: number;
    availableReplicas?: number;
    phase?: string;
    conditions?: Array<{
      type?: string;
      status?: string;
    }>;
    containerStatuses?: Array<{
      ready?: boolean;
      restartCount?: number;
      state?: {
        waiting?: {
          reason?: string;
        };
        terminated?: {
          reason?: string;
        };
      };
    }>;
  };
  involvedObject?: {
    kind?: string;
    name?: string;
  };
  reason?: string;
  message?: string;
  type?: string;
  lastTimestamp?: string;
  eventTime?: string;
  metadataTimestamp?: string;
}

export type KubernetesSnapshot =
  | {
      ok: true;
      items: KubernetesResource[];
    }
  | {
      ok: false;
      error: string;
    };

function errorText(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Unable to query Kubernetes';
  }

  const processError = error as Error & {
    stderr?: string;
    code?: string | number;
  };

  if (processError.code === 'ENOENT') {
    return 'kubectl executable was not found';
  }

  return (
    processError.stderr?.trim() ||
    processError.message
  ).slice(0, 1500);
}

function parseSnapshot(value: unknown): KubernetesResource[] {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('items' in value) ||
    !Array.isArray(value.items)
  ) {
    throw new Error('Unexpected Kubernetes API response');
  }

  return value.items as KubernetesResource[];
}

export function createKubectlMonitoringClient(
  context: string,
  namespace: string,
) {
  async function snapshot(): Promise<KubernetesSnapshot> {
    try {
      const { stdout } = await execute(
        'kubectl',
        [
          '--context', context,
          '--namespace', namespace,
          'get',
          'deployments,pods,services,events',
          '-o', 'json',
        ],
        {
          timeout: 15000,
          maxBuffer: 4 * 1024 * 1024,
          windowsHide: true,
        },
      );

      const parsed: unknown = JSON.parse(stdout);

      return {
        ok: true,
        items: parseSnapshot(parsed),
      };
    } catch (error) {
      return {
        ok: false,
        error: errorText(error),
      };
    }
  }

  return {
    snapshot,
  };
}

export type KubectlMonitoringClient =
  ReturnType<typeof createKubectlMonitoringClient>;
