
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  mkdtemp,
  writeFile,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execute = promisify(execFile);

export interface DeploymentCommandResult {
  success: boolean;
  output: string;
}

export interface KubectlDeploymentOptions {
  context: string;
  namespace: string;
}

function describeFailure(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Kubernetes command failed';
  }

  const commandError = error as Error & {
    stderr?: string;
    code?: string | number;
  };

  if (commandError.code === 'ENOENT') {
    return 'kubectl executable not found';
  }

  return (
    commandError.stderr?.trim() ||
    commandError.message
  ).slice(0, 2000);
}

export function createKubectlDeploymentClient(
  options: KubectlDeploymentOptions,
) {
  const prefix = [
    '--context',
    options.context,
    '--namespace',
    options.namespace,
  ];

  async function run(
    args: string[],
  ): Promise<DeploymentCommandResult> {
    try {
      const { stdout } = await execute(
        'kubectl',
        [...prefix, ...args],
        {
          timeout: 45000,
          maxBuffer: 1024 * 1024,
          windowsHide: true,
        },
      );

      return {
        success: true,
        output: stdout.trim(),
      };
    } catch (error) {
      return {
        success: false,
        output: describeFailure(error),
      };
    }
  }

  async function namespaceExists(): Promise<boolean> {
    const result = await run([
      'get',
      'namespace',
      options.namespace,
      '-o',
      'name',
    ]);

    return result.success;
  }

  async function withManifestFile(
    content: string,
    command: (path: string) => Promise<DeploymentCommandResult>,
  ): Promise<DeploymentCommandResult> {
    const directory = await mkdtemp(
      join(tmpdir(), 'deploymentplanner-deploy-'),
    );

    const path = join(directory, 'manifests.yaml');

    try {
      await writeFile(
        path,
        content,
        {
          encoding: 'utf8',
          mode: 0o600,
        },
      );

      return await command(path);
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  }

  async function dryRun(
    content: string,
  ): Promise<DeploymentCommandResult> {
    return withManifestFile(
      content,
      (path) =>
        run([
          'apply',
          '--dry-run=server',
          '--validate=true',
          '-f',
          path,
        ]),
    );
  }

  async function apply(
    content: string,
  ): Promise<DeploymentCommandResult> {
    return withManifestFile(
      content,
      (path) =>
        run([
          'apply',
          '--validate=true',
          '-f',
          path,
        ]),
    );
  }

  return {
    namespaceExists,
    dryRun,
    apply,
  };
}

export type KubectlDeploymentClient =
  ReturnType<typeof createKubectlDeploymentClient>;
