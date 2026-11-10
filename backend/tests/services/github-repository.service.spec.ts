import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvariantViolationError } from '../../src/domain/errors/index.js';
import { createGithubRepositoryService } from '../../src/services/repository-link/github-repository.service.js';

function jsonResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn();

  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createGithubRepositoryService', () => {
  const service = createGithubRepositoryService();

  it('confirms a public repository and an existing branch', async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, { default_branch: 'master' }),
      jsonResponse(200, { name: 'master' }),
    );

    const result = await service.checkRepository('octocat', 'Hello-World', 'master');

    expect(result).toEqual({ ok: true, defaultBranch: 'master' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.github.com/repos/octocat/Hello-World',
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://api.github.com/repos/octocat/Hello-World/branches/master',
    );
  });

  it('keeps slashes in branch names', async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, { default_branch: 'main' }),
      jsonResponse(200),
    );

    await service.checkRepository('octocat', 'Hello-World', 'feature/login');

    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://api.github.com/repos/octocat/Hello-World/branches/feature/login',
    );
  });

  it('reports a missing or private repository without checking the branch', async () => {
    const fetchMock = stubFetch(jsonResponse(404));

    const result = await service.checkRepository('octocat', 'nope', 'main');

    expect(result).toEqual({ ok: false, reason: 'Repository not found or not public' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports a missing branch', async () => {
    stubFetch(jsonResponse(200, { default_branch: 'main' }), jsonResponse(404));

    const result = await service.checkRepository('octocat', 'Hello-World', 'dev');

    expect(result).toEqual({ ok: false, reason: 'Branch "dev" not found' });
  });

  it('throws on a rate limit instead of judging the repository', async () => {
    stubFetch(jsonResponse(403));

    const call = service.checkRepository('octocat', 'Hello-World', 'main');

    await expect(call).rejects.toBeInstanceOf(InvariantViolationError);
    await expect(call).rejects.toThrow('GitHub rate limit reached, try again later');
  });

  it('throws on an unexpected GitHub status', async () => {
    stubFetch(jsonResponse(500));

    await expect(
      service.checkRepository('octocat', 'Hello-World', 'main'),
    ).rejects.toThrow('GitHub request failed (500)');
  });

  it('throws when GitHub is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    const call = service.checkRepository('octocat', 'Hello-World', 'main');

    await expect(call).rejects.toBeInstanceOf(InvariantViolationError);
    await expect(call).rejects.toThrow('GitHub is unreachable, try again later');
  });
});