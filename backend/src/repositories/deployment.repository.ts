import type { Types } from 'mongoose';

import { Deployment, type DeploymentDocument, type DeploymentDocumentMethods, type DeploymentFields, type DeploymentVirtuals } from '../models/entities/index.js';
import { BaseRepository, type RepositoryOptions } from './base.repository.js';

export class DeploymentRepository extends BaseRepository<DeploymentFields, DeploymentDocumentMethods, DeploymentVirtuals> {
  constructor() {
    super(Deployment);
  }

  /** Projects' deployment history, newest first. */
  listByProject(projectId: Types.ObjectId | string, options: RepositoryOptions = {}): Promise<DeploymentDocument[]> {
    return this.find({ project: projectId }, { ...options, sort: { createdAt: -1 } });
  }
}
