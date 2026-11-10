import type { Types } from 'mongoose';

import { GithubConnection, type GithubConnectionDocument, type GithubConnectionFields, type GithubConnectionMethods, type GithubConnectionVirtuals } from '../models/entities/index.js';
import { BaseRepository, type RepositoryOptions } from './base.repository.js';

export class GithubConnectionRepository extends BaseRepository<GithubConnectionFields, GithubConnectionMethods, GithubConnectionVirtuals> {
  constructor() {
    super(GithubConnection);
  }

  findByUser(
    userId: Types.ObjectId | string,
    options: RepositoryOptions = {},
  ): Promise<GithubConnectionDocument | null> {
    return this.findOne({ user: userId }, options);
  }
}
