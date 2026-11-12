
import {
  ConflictError,
} from '../../domain/errors/index.js';

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  head_branch: string | null;
  head_sha: string;
  event: string;
  created_at: string;
  updated_at: string;
}

interface GitHubWorkflowRunsResponse {
  workflow_runs: GitHubWorkflowRun[];
}

interface GitHubFileResponse {
  content: string;
  encoding: string;
}

export function createGitHubActionsClient(
  token: string,
) {
    async function request<T>(
    path: string,
    method = 'GET',
    body?: unknown,
  ): Promise<{
    status: number;
    data: T | null;
  }> {
    if (!token.trim()) {
      throw new ConflictError(
        'GitHub Actions access is not configured',
      );
    }

    let response: Response;

    try {
      response = await fetch(
        `https://api.github.com${path}`,
        {
                    method,
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
            ...(body !== undefined
              ? { 'Content-Type': 'application/json' }
              : {}),
          },
          ...(body !== undefined
            ? { body: JSON.stringify(body) }
            : {}),
          signal: AbortSignal.timeout(30000),
        },
      );
    } catch {
      throw new ConflictError(
        'GitHub Actions API is unreachable',
      );
    }

    if (response.status === 404) {
      return {
        status: 404,
        data: null,
      };
    }

    if (!response.ok) {
      throw new ConflictError(
        `GitHub Actions API failed (${response.status})`,
      );
    }
        if (response.status === 204) {
      return {
        status: 204,
        data: null,
      };
    }
    const data = await response.json() as T;

    return {
      status: response.status,
      data,
    };
  }

  function repositoryPath(
    owner: string,
    repository: string,
  ): string {
    return [
      '/repos',
      encodeURIComponent(owner),
      encodeURIComponent(repository),
    ].join('/');
  }

  async function getWorkflowContent(
    owner: string,
    repository: string,
    branch: string,
  ): Promise<string | null> {
    const base = repositoryPath(
      owner,
      repository,
    );

    const result = await request<GitHubFileResponse>(
      `${base}/contents/.github/workflows/build-images.yml?ref=${encodeURIComponent(branch)}`,
    );

    if (!result.data) {
      return null;
    }

    if (result.data.encoding !== 'base64') {
      throw new ConflictError(
        'Unsupported GitHub workflow encoding',
      );
    }

    return Buffer.from(
      result.data.content.replace(/\s/g, ''),
      'base64',
    ).toString('utf8');
  }

  async function listWorkflowRuns(
    owner: string,
    repository: string,
    branch: string,
  ): Promise<GitHubWorkflowRun[]> {
    const base = repositoryPath(
      owner,
      repository,
    );

    const query = new URLSearchParams({
      branch,
      per_page: '20',
    });

    const result = await request<GitHubWorkflowRunsResponse>(
      `${base}/actions/workflows/build-images.yml/runs?${query}`,
    );

    return result.data?.workflow_runs ?? [];
  }

    async function dispatchWorkflow(
    owner: string,
    repository: string,
    branch: string,
  ): Promise<void> {
    const base = repositoryPath(
      owner,
      repository,
    );

    await request<void>(
      `${base}/actions/workflows/build-images.yml/dispatches`,
      'POST',
      { ref: branch },
    );
  }

  return {
    getWorkflowContent,
    listWorkflowRuns,
    dispatchWorkflow,
  };
}

export type GitHubActionsClient =
  ReturnType<typeof createGitHubActionsClient>;
