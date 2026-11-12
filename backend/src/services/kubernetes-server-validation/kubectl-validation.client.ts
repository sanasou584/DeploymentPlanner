
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execute = promisify(execFile);

export interface ClusterAvailability {
  ready: boolean;
  details: string;
}

export interface ManifestDryRun {
  valid: boolean;
  details: string;
}

export interface KubectlValidationOptions {
  context: string;
  namespace: string;
}

function readableError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Kubernetes command failed';
  }

  const commandError = error as Error & {
    stderr?: string;
    code?: string | number;
  };

  if (commandError.code === 'ENOENT') {
    return 'kubectl executable was not found';
  }

  const output = commandError.stderr?.trim();

  return (
    output ||
    'Kubernetes command failed or timed out'
  ).slice(0, 1500);
}

export function createKubectlValidationClient(
  options: KubectlValidationOptions,
) {
  const prefix = [
    '--context',
    options.context,
    '--namespace',
    options.namespace,
  ];

  async function check(): Promise<ClusterAvailability> {
    try {
      const { stdout } = await execute(
        'kubectl',
        [
          ...prefix,
          'get',
          '--raw=/readyz',
        ],
        {
          timeout: 15000,
          maxBuffer: 1024 * 1024,
          windowsHide: true,
        },
      );

      const ready = stdout.trim() === 'ok';

      return {
        ready,
        details: ready
          ? 'Kubernetes API is ready'
          : 'Kubernetes API did not return ready',
      };
    } catch (error) {
      return {
        ready: false,
        details: readableError(error),
      };
    }
  }

  async function validate(
    content: string,
  ): Promise<ManifestDryRun> {
    const directory = await mkdtemp(
      join(tmpdir(), 'deploymentplanner-k8s-'),
    );

    const filePath = join(
      directory,
      'manifest.yaml',
    );

    try {
      await writeFile(
        filePath,
        content,
        {
          encoding: 'utf8',
          mode: 0o600,
        },
      );

      const { stdout } = await execute(
        'kubectl',
        [
          ...prefix,
          'apply',
          '--dry-run=server',
          '--validate=true',
          '-f',
          filePath,
        ],
        {
          timeout: 30000,
          maxBuffer: 1024 * 1024,
          windowsHide: true,
        },
      );

      return {
        valid: true,
        details: stdout.trim(),
      };
    } catch (error) {
      return {
        valid: false,
        details: readableError(error),
      };
    } finally {
      await rm(
        directory,
        {
          recursive: true,
          force: true,
        },
      );
    }
  }

  return {
    check,
    validate,
  };
}

export type KubectlValidationClient =
  ReturnType<typeof createKubectlValidationClient>;
