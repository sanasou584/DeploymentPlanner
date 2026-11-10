import { NotFoundError } from '../../domain/errors/index.js';
import type { ProjectDocument } from '../../models/entities/index.js';
import { ProjectRepository } from '../../repositories/project.repository.js';
import { createGithubRepositoryService } from './github-repository.service.js';
import type { GithubRepositoryService } from './github-repository.service.js';
import type { ConnectRepositoryInput } from './repository-link.schema.js';

export function createRepositoryLinkService(
  projects: ProjectRepository = new ProjectRepository(),
  github: GithubRepositoryService = createGithubRepositoryService(),
) {
  async function findOwnedProject(
    userId: string,
    projectId: string,
  ): Promise<ProjectDocument> {
    const project = await projects.findByIdForOwner(projectId, userId);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    return project;
  }

  async function recordVerification(
    project: ProjectDocument,
  ): Promise<ProjectDocument> {
    const { repository } = project;

    if (!repository) {
      throw new NotFoundError('Project has no connected repository');
    }

    const check = await github.checkRepository(
      repository.owner,
      repository.name,
      repository.branch,
    );

    return check.ok
      ? project.markRepositoryVerified(check.defaultBranch)
      : project.markRepositoryInvalid(check.reason);
  }

  async function connect(
    userId: string,
    projectId: string,
    input: ConnectRepositoryInput,
  ): Promise<ProjectDocument> {
    const project = await findOwnedProject(userId, projectId);
    const connected = await project.connectRepository(
      { url: input.url },
      input.branch,
    );

    return recordVerification(connected);
  }

  async function verify(
    userId: string,
    projectId: string,
  ): Promise<ProjectDocument> {
    return recordVerification(await findOwnedProject(userId, projectId));
  }

  return { connect, verify };
}

export type RepositoryLinkService = ReturnType<typeof createRepositoryLinkService>;