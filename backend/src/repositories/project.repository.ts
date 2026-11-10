import { type Types } from 'mongoose';

import { Project, type ProjectDocument, type ProjectFields, type ProjectMethods, type ProjectVirtuals } from '../models/entities/index.js';
import { BaseRepository, type RepositoryOptions } from './base.repository.js';

export class ProjectRepository extends BaseRepository<ProjectFields, ProjectMethods, ProjectVirtuals> {
  constructor() {
    super(Project);
  }

  findByOwner(ownerId: Types.ObjectId | string, options: RepositoryOptions = {}): Promise<ProjectDocument[]> {
    return this.find({ owner: ownerId }, { ...options, sort: { createdAt: -1 } });
  }

  findByIdForOwner(
    id: Types.ObjectId | string,
    ownerId: Types.ObjectId | string,
    options: RepositoryOptions = {},
  ): Promise<ProjectDocument | null> {
    return this.findOne({ _id: id, owner: ownerId }, options);
  }

  /**
   * Case-insensitive ownership probe for the name-availability feature
   * (locale collation, strength 2) — stored casing stays untouched.
   */
  async existsForOwnerNameInsensitive(
    ownerId: Types.ObjectId | string,
    name: string,
    options: RepositoryOptions = {},
  ): Promise<boolean> {
    const query = this.model
      .findOne({ owner: ownerId, name })
      .collation({ locale: 'en', strength: 2 })
      .select({ _id: 1 })
      .session(options.session ?? null);
    if (options.withDeleted) {
      query.setOptions({ withDeleted: true });
    }
    return (await query.exec()) !== null;
  }
}
