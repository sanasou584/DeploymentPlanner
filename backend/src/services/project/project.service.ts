import { Types } from 'mongoose';

import { ConflictError, NotFoundError } from '../../domain/errors/index.js';
import { Project } from '../../models/entities/index.js';
import type { ProjectDocument } from '../../models/entities/index.js';
import { ProjectRepository } from '../../repositories/project.repository.js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ListProjectsInput,
  AvailabilityQuery,
} from './project.schema.js';

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}

// (owner, name) is unique among non-deleted projects: the unique index is
// the source of truth, a duplicate surfaces as E11000 when saving.
async function rejectDuplicateName<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      throw new ConflictError('Project name already used');
    }

    throw error;
  }
}

/**
 * Functional service factory (docs/conventions.md, "Services").
 * Plain closures - never classes. The dependency arrives as a parameter
 * and default-wires itself.
 *
 * Ownership is resolved by the repository query (id + owner): a project that
 * belongs to someone else is simply "not found".
 */
export function createProjectService(
  projects: ProjectRepository = new ProjectRepository(),
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

  async function create(
    userId: string,
    input: CreateProjectInput,
  ): Promise<ProjectDocument> {
    return rejectDuplicateName(() =>
      Project.createFor({
        ownerId: new Types.ObjectId(userId),
        name: input.name,
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.environment !== undefined ? { environment: input.environment } : {}),
      }),
    );
  }

  async function list(
    userId: string,
    pagination: ListProjectsInput,
  ): Promise<{
    message: string;
    data: ProjectDocument[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pageCount: number;
    };
  }> {
    // BaseRepository.paginate is the single page/limit implementation:
    // same defaults and page counting as the admin users list.
    const result = await projects.paginate(
      { owner: new Types.ObjectId(userId) },
      {
        page: pagination.page,
        limit: pagination.limit,
        // _id tie-break: documents created inside the same millisecond still
        // come out in stable, deterministic order.
        sort: { createdAt: -1, _id: -1 },
      },
    );

    return {
      message: 'Projects retrieved successfully',
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pageCount: result.pageCount,
      },
    };
  }

  async function get(
    userId: string,
    projectId: string,
  ): Promise<ProjectDocument> {
    return findOwnedProject(userId, projectId);
  }

  async function update(
    userId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectDocument> {
    const project = await findOwnedProject(userId, projectId);

    // ONE save per update: rename + describe previously meant two writes
    // (and two unique-index race windows) for a single PATCH.
    return rejectDuplicateName(async () => {
      await project.applyUpdate({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      });

      return project;
    });
  }

  async function remove(userId: string, projectId: string): Promise<void> {
    const project = await findOwnedProject(userId, projectId);

    await project.softDelete();
  }

  async function availability(
    userId: string,
    input: AvailabilityQuery,
  ): Promise<{ exists: boolean }> {
    const exists = await projects.existsForOwnerNameInsensitive(
      new Types.ObjectId(userId),
      input.name,
    );

    return { exists };
  }

  return { create, list, get, update, remove, availability };
}

/**
 * Service contract, derived at its SOURCE - never redeclared elsewhere.
 */
export type ProjectService = ReturnType<typeof createProjectService>;