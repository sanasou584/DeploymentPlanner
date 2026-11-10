import type { Types } from 'mongoose';

import { GeneratedFile, type GeneratedFileDocument, type GeneratedFileFields, type GeneratedFileMethods } from '../models/entities/index.js';
import { BaseRepository, type RepositoryOptions } from './base.repository.js';

export class GeneratedFileRepository extends BaseRepository<GeneratedFileFields, GeneratedFileMethods> {
  constructor() {
    super(GeneratedFile);
  }

  /** Files of a plan, newest first. */
  listByPlan(planId: Types.ObjectId | string, options: RepositoryOptions = {}): Promise<GeneratedFileDocument[]> {
    return this.find({ plan: planId }, { ...options, sort: { createdAt: -1 } });
  }
}
