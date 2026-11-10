import type { Types } from 'mongoose';

import { DeploymentPlan, type DeploymentPlanDocument, type DeploymentPlanDocumentMethods, type DeploymentPlanFields, type DeploymentPlanVirtuals } from '../models/entities/index.js';
import { BaseRepository, type RepositoryFilter, type RepositoryOptions } from './base.repository.js';

export class PlanRepository extends BaseRepository<DeploymentPlanFields, DeploymentPlanDocumentMethods, DeploymentPlanVirtuals> {
  constructor() {
    super(DeploymentPlan);
  }

  /** What the NEXT plan of a project must be: 1 when none exists, else latest + 1. */
  async nextVersionFor(
    projectId: Types.ObjectId | string,
    options: RepositoryOptions = {},
  ): Promise<number> {
    const query = this.model
      .findOne({ project: projectId })
      .sort({ version: -1 })
      .session(options.session ?? null);
    if (options.withDeleted) {
      query.setOptions({ withDeleted: true });
    }
    const latest = (await query.exec()) as DeploymentPlanDocument | null;
    return latest ? latest.version + 1 : 1;
  }

  async findLatestByProject(
    projectId: Types.ObjectId | string,
    options: RepositoryOptions = {},
  ): Promise<DeploymentPlanDocument | null> {
    const query = this.model
      .findOne({ project: projectId })
      .sort({ version: -1 })
      .session(options.session ?? null);
    if (options.withDeleted) {
      query.setOptions({ withDeleted: true });
    }
    return (await query.exec()) as DeploymentPlanDocument | null;
  }

  /** The plan an approved analysis flow can generate files from, newest first. */
  async findApprovedByProject(
    projectId: Types.ObjectId | string,
    options: RepositoryOptions = {},
  ): Promise<DeploymentPlanDocument | null> {
    const filter: RepositoryFilter<DeploymentPlanFields> = { project: projectId, status: 'APPROVED' };
    const query = this.model
      .findOne(filter)
      .sort({ version: -1 })
      .session(options.session ?? null);
    if (options.withDeleted) {
      query.setOptions({ withDeleted: true });
    }
    return (await query.exec()) as DeploymentPlanDocument | null;
  }

  listByProject(projectId: Types.ObjectId | string, options: RepositoryOptions = {}): Promise<DeploymentPlanDocument[]> {
    return this.find({ project: projectId }, { ...options, sort: { version: -1 } });
  }
}
