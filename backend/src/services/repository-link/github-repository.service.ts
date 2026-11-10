import { z } from 'zod';

import { InvariantViolationError } from '../../domain/errors/index.js';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_TIMEOUT_MS = 10_000;

const FAILURE_MESSAGE_BY_STATUS: Readonly<Partial<Record<number, string>>> = {
  403: 'GitHub rate limit reached, try again later',
  429: 'GitHub rate limit reached, try again later',
};

const repositorySchema = z.object({
  default_branch: z.string().min(1),
});

type RepositoryCheck =
  | { ok: true; defaultBranch: string }
  | { ok: false; reason: string };

async function fetchGithub(path: string): Promise<Response> {
  try {
    return await fetch(`${GITHUB_API_URL}${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'deploymentplanner-ai',
      },
      signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
    });
  } catch {
    throw new InvariantViolationError('GitHub is unreachable, try again later');
  }
}

function assertReachable(response: Response): void {
  if (response.ok) {
    return;
  }

  throw new InvariantViolationError(
    FAILURE_MESSAGE_BY_STATUS[response.status] ??
      `GitHub request failed (${response.status})`,
    { status: response.status },
  );
}

export function createGithubRepositoryService() {
  async function checkRepository(
    owner: string,
    name: string,
    branch: string,
  ): Promise<RepositoryCheck> {
    const repoResponse = await fetchGithub(`/repos/${owner}/${name}`);

    if (repoResponse.status === 404) {
      return { ok: false, reason: 'Repository not found or not public' };
    }

    assertReachable(repoResponse);

    const repo = repositorySchema.parse(await repoResponse.json());

    const branchResponse = await fetchGithub(
      `/repos/${owner}/${name}/branches/${branch}`,
    );

    if (branchResponse.status === 404) {
      return { ok: false, reason: `Branch "${branch}" not found` };
    }

    assertReachable(branchResponse);

    return { ok: true, defaultBranch: repo.default_branch };
  }

  return { checkRepository };
}

export type GithubRepositoryService = ReturnType<typeof createGithubRepositoryService>;