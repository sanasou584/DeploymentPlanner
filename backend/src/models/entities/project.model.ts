import {
  Schema,
  default as mongoose,
  type DefaultSchemaOptions,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

import { PROJECT_ENVIRONMENTS, type ProjectEnvironment } from '../../domain/enums/project.enums.js';
import { InvariantViolationError, NotFoundError } from '../../domain/errors/index.js';
import { repositoryRefSchema, type RepositoryRefFields } from '../value-objects/repository-ref.schema.js';
import { parseGitHubUrl, type RepoCoordinates } from '../../domain/value-objects/repository-url.js';
import { baseSchemaOptions } from '../plugins/base-schema-options.js';
import { softDeletePlugin, type SoftDeletableMethods } from '../plugins/soft-delete.js';

/**
 * Project - a container for one app the user wants to deploy. Soft-deleted
 * projects release their (owner, name) pair: the unique index is
 * partialFilterExpression { deletedAt: null } so the name becomes available
 * again while the document is kept for history.
 */

export interface ProjectFields {
  owner: Types.ObjectId;
  name: string;
  description?: string;
  environment: ProjectEnvironment;
  repository?: RepositoryRefFields;
}

export interface ProjectStatics {
  createFor(input: {
    ownerId: Types.ObjectId;
    name: string;
    description?: string;
    environment?: ProjectEnvironment;
  }): Promise<ProjectDocument>;
}

export interface ProjectMethods extends SoftDeletableMethods {
  /**
   * The single field-update path: optional name/description, ONE save.
   * update-with-two-saves (one per field) is banned in services - each
   * save re-opens the unique-index race window for duplicate names.
   */
  applyUpdate(fields: {
    name?: string;
    description?: string;
  }): Promise<ProjectDocument>;
  connectRepository(
    repo: RepoCoordinates | { url: string },
    branch: string,
  ): Promise<ProjectDocument>;
  changeBranch(branch: string): Promise<ProjectDocument>;
  markRepositoryVerified(defaultBranch: string): Promise<ProjectDocument>;
  markRepositoryInvalid(reason: string): Promise<ProjectDocument>;
  canBeAnalyzed(): boolean;
  assertCanBeAnalyzed(): void;
  isOwnedBy(userId: Types.ObjectId): boolean;
}

export type ProjectVirtuals = { isDeleted: boolean };

export type ProjectDocument = HydratedDocument<
  ProjectFields,
  ProjectMethods & ProjectVirtuals
>;

export type ProjectBaseModel = Model<ProjectFields, object, ProjectMethods>;
export type ProjectModel = ProjectBaseModel & ProjectStatics;

const NAME_MAX = 120;
const DESCRIPTION_MAX = 1000;

const projectSchema = new Schema<
  ProjectFields,
  ProjectBaseModel,
  ProjectMethods,
  Record<string, never>,
  ProjectVirtuals,
  ProjectStatics,
  DefaultSchemaOptions
>(
  {
    owner: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: NAME_MAX },
    description: { type: String, trim: true, maxlength: DESCRIPTION_MAX },
    environment: {
      type: String,
      required: true,
      enum: PROJECT_ENVIRONMENTS,
      default: 'DEVELOPMENT',
    },
    repository: { type: repositoryRefSchema, default: undefined },
  },
  baseSchemaOptions(),
);

projectSchema.plugin(softDeletePlugin);

const REPO_VALID = 'repository.isValid';
const REPO_DEFAULT_BRANCH = 'repository.defaultBranch';
const REPO_VERIFIED_AT = 'repository.lastVerifiedAt';
const REPO_VERIFY_ERROR = 'repository.lastVerificationError';

interface SubdocFieldAccess {
  get(path: string): unknown;
  set(path: string, value: unknown): void;
}

const requireRepository = function requireRepository(
  this: ProjectDocument,
): NonNullable<ProjectFields['repository']> & SubdocFieldAccess {
  const repository = this.get('repository') as ProjectFields['repository'];
  if (repository === null || repository === undefined) {
    throw new NotFoundError('Project has no connected repository');
  }

  return repository as NonNullable<ProjectFields['repository']> & SubdocFieldAccess;
};

// Unique (owner, name) among NON-deleted projects. A partialFilterExpression
// with null equality is valid MongoDB (server >= 3.2); the behavior is proven
// by tests/models/project.spec.ts ("allows name re-use once ... soft deleted").
projectSchema.index(
  { owner: 1, name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
projectSchema.index({ owner: 1, createdAt: -1 });

projectSchema.statics.createFor = async function createFor(
  this: ProjectBaseModel,
  input: {
    ownerId: Types.ObjectId;
    name: string;
    description?: string;
    environment?: ProjectEnvironment;
  },
): Promise<ProjectDocument> {
  const created = new this({
    owner: input.ownerId,
    name: input.name,
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.environment !== undefined ? { environment: input.environment } : {}),
  });

  return created.save() as unknown as Promise<ProjectDocument>;
};

projectSchema.methods.applyUpdate = async function applyUpdate(
  this: ProjectDocument,
  fields: { name?: string; description?: string },
): Promise<ProjectDocument> {
  if (fields.name === undefined && fields.description === undefined) {
    throw new InvariantViolationError('applyUpdate: at least one field required');
  }

  if (fields.name !== undefined) {
    this.set('name', fields.name.trim());
  }

  if (fields.description !== undefined) {
    this.set('description', fields.description.trim());
  }

  return this.save() as unknown as Promise<ProjectDocument>;
};

projectSchema.methods.connectRepository = async function connectRepository(
  this: ProjectDocument,
  repo: RepoCoordinates | { url: string },
  branch: string,
): Promise<ProjectDocument> {
  const coordinates = 'url' in repo ? parseGitHubUrl(repo.url) : repo;

  this.set('repository', {
    provider: 'github',
    owner: coordinates.owner,
    name: coordinates.name,
    branch,
  });

  return this.save() as unknown as Promise<ProjectDocument>;
};

projectSchema.methods.changeBranch = async function changeBranch(
  this: ProjectDocument,
  branch: string,
): Promise<ProjectDocument> {
  const repository = requireRepository.call(this);
  repository.set('branch', branch);
  this.set(REPO_VALID, false);
  this.set(REPO_DEFAULT_BRANCH, undefined);
  this.set(REPO_VERIFIED_AT, undefined);
  this.set(REPO_VERIFY_ERROR, undefined);

  return this.save() as unknown as Promise<ProjectDocument>;
};

projectSchema.methods.markRepositoryVerified = async function markRepositoryVerified(
  this: ProjectDocument,
  defaultBranch: string,
): Promise<ProjectDocument> {
  requireRepository.call(this);
  this.set(REPO_VALID, true);
  this.set(REPO_DEFAULT_BRANCH, defaultBranch);
  this.set(REPO_VERIFIED_AT, new Date());
  this.set(REPO_VERIFY_ERROR, undefined);

  return this.save() as unknown as Promise<ProjectDocument>;
};

projectSchema.methods.markRepositoryInvalid = async function markRepositoryInvalid(
  this: ProjectDocument,
  reason: string,
): Promise<ProjectDocument> {
  requireRepository.call(this);
  this.set(REPO_VALID, false);
  this.set(REPO_DEFAULT_BRANCH, undefined);
  this.set(REPO_VERIFIED_AT, undefined);
  this.set(REPO_VERIFY_ERROR, reason);

  return this.save() as unknown as Promise<ProjectDocument>;
};

projectSchema.methods.canBeAnalyzed = function canBeAnalyzed(this: ProjectDocument): boolean {
  const repository = this.get('repository') as ProjectFields['repository'];

  return Boolean(repository?.isValid);
};

projectSchema.methods.assertCanBeAnalyzed = function assertCanBeAnalyzed(
  this: ProjectDocument,
): void {
  if (!this.canBeAnalyzed()) {
    throw new InvariantViolationError(
      'Project is not ready for analysis: connect a repository and verify it first',
    );
  }
};

projectSchema.methods.isOwnedBy = function isOwnedBy(
  this: ProjectDocument,
  userId: Types.ObjectId,
): boolean {
  return this.get('owner').equals(userId);
};

export const PROJECT_MODEL_NAME = 'Project' as const;
export const Project = mongoose.model(PROJECT_MODEL_NAME, projectSchema);
