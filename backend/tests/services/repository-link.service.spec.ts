import { describe, expect, it, vi } from 'vitest';

import { InvariantViolationError, NotFoundError } from '../../src/domain/errors/index.js';
import type { RepositoryRefFields } from '../../src/models/value-objects/repository-ref.schema.js';
import type { ProjectRepository } from '../../src/repositories/project.repository.js';
import type { GithubRepositoryService } from '../../src/services/repository-link/github-repository.service.js';
import { createRepositoryLinkService } from '../../src/services/repository-link/repository-link.service.js';

const REPOSITORY: RepositoryRefFields = {
  provider: 'github',
  owner: 'octocat',
  name: 'Hello-World',
  branch: 'main',
  isValid: false,
};

function fakeProject(repository?: RepositoryRefFields) {
  const project = {
    id: 'p1',
    repository,
    connectRepository: vi.fn(),
    markRepositoryVerified: vi.fn(),
    markRepositoryInvalid: vi.fn(),
  };

  project.connectRepository.mockImplementation(async () => {
    project.repository = REPOSITORY;

    return project;
  });
  project.markRepositoryVerified.mockResolvedValue(project);
  project.markRepositoryInvalid.mockResolvedValue(project);

  return project;
}

function build(project: ReturnType<typeof fakeProject> | null) {
  const findByIdForOwner = vi.fn().mockResolvedValue(project);
  const checkRepository = vi.fn();
  const service = createRepositoryLinkService(
    { findByIdForOwner } as unknown as ProjectRepository,
    { checkRepository } as unknown as GithubRepositoryService,
  );

  return { service, findByIdForOwner, checkRepository };
}

const INPUT = { url: 'https://github.com/octocat/Hello-World', branch: 'main' };

describe('createRepositoryLinkService.connect', () => {
  it('saves the repository then marks it verified', async () => {
    const project = fakeProject();
    const { service, findByIdForOwner, checkRepository } = build(project);

    checkRepository.mockResolvedValue({ ok: true, defaultBranch: 'master' });

    const result = await service.connect('u1', 'p1', INPUT);

    expect(findByIdForOwner).toHaveBeenCalledWith('p1', 'u1');
    expect(project.connectRepository).toHaveBeenCalledWith({ url: INPUT.url }, 'main');
    expect(checkRepository).toHaveBeenCalledWith('octocat', 'Hello-World', 'main');
    expect(project.markRepositoryVerified).toHaveBeenCalledWith('master');
    expect(project.markRepositoryInvalid).not.toHaveBeenCalled();
    expect(result).toBe(project);
  });

  it('stores the reason when GitHub says the branch is missing', async () => {
    const project = fakeProject();
    const { service, checkRepository } = build(project);

    checkRepository.mockResolvedValue({ ok: false, reason: 'Branch "main" not found' });

    await service.connect('u1', 'p1', INPUT);

    expect(project.markRepositoryInvalid).toHaveBeenCalledWith('Branch "main" not found');
    expect(project.markRepositoryVerified).not.toHaveBeenCalled();
  });

  it('answers not found for a project that is not the caller\'s', async () => {
    const { service, checkRepository } = build(null);

    await expect(service.connect('u1', 'p1', INPUT)).rejects.toBeInstanceOf(NotFoundError);
    expect(checkRepository).not.toHaveBeenCalled();
  });

  it('keeps the repository state untouched when GitHub is unavailable', async () => {
    const project = fakeProject();
    const { service, checkRepository } = build(project);

    checkRepository.mockRejectedValue(new InvariantViolationError('GitHub is unreachable, try again later'));

    await expect(service.connect('u1', 'p1', INPUT)).rejects.toBeInstanceOf(
      InvariantViolationError,
    );
    expect(project.markRepositoryVerified).not.toHaveBeenCalled();
    expect(project.markRepositoryInvalid).not.toHaveBeenCalled();
  });
});

describe('createRepositoryLinkService.verify', () => {
  it('re-checks the stored repository', async () => {
    const project = fakeProject(REPOSITORY);
    const { service, checkRepository } = build(project);

    checkRepository.mockResolvedValue({ ok: true, defaultBranch: 'main' });

    await service.verify('u1', 'p1');

    expect(checkRepository).toHaveBeenCalledWith('octocat', 'Hello-World', 'main');
    expect(project.markRepositoryVerified).toHaveBeenCalledWith('main');
    expect(project.connectRepository).not.toHaveBeenCalled();
  });

  it('answers not found when no repository is linked', async () => {
    const { service, checkRepository } = build(fakeProject());

    await expect(service.verify('u1', 'p1')).rejects.toThrow(
      'Project has no connected repository',
    );
    expect(checkRepository).not.toHaveBeenCalled();
  });
});