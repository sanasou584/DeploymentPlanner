import { Types, type QueryFilter } from 'mongoose';

import type { AnalysisFields } from '../models/entities/analysis.model.js';
import type { AnalysisStatus } from '../domain/enums/analysis.enums.js';
import {
  Analysis,
  type AnalysisDocument,
  type ProjectDocument,
} from '../models/entities/index.js';
import type { RepositoryOptions } from './base.repository.js';

const ACTIVE_STATUSES = ['PENDING', 'RUNNING'] as const satisfies readonly AnalysisStatus[];
const ACTIVE_WINDOW_MS = 15 * 60 * 1000;

export interface AnalysisPageQuery {
  page: number;
  limit: number;
}

export interface AnalysisPage {
  items: AnalysisDocument[];
  total: number;
}

export class AnalysisRepository {
  async request(project: ProjectDocument, userId: string): Promise<AnalysisDocument> {
    return Analysis.request({ project, userId: new Types.ObjectId(userId) });
  }

  async hasActive(projectId: string): Promise<boolean> {
    const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
    const found = await Analysis.exists({
      project: projectId,
      status: { $in: [...ACTIVE_STATUSES] },
      createdAt: { $gte: since },
    });

    return found !== null;
  }

  /** Newest analysis of a project whatever its status (latest snapshot). */
  async findLatestByProject(
    projectId: Types.ObjectId | string,
    options: RepositoryOptions = {},
  ): Promise<AnalysisDocument | null> {
    const query = Analysis.findOne({ project: projectId })
      .sort({ createdAt: -1 })
      .session(options.session ?? null);
    if (options.withDeleted) {
      query.setOptions({ withDeleted: true });
    }

    return (await query.exec()) as unknown as AnalysisDocument | null;
  }

  /** All analyses of a project, newest first (status-agnostic history). */
  async listByProject(
    projectId: Types.ObjectId | string,
    options: RepositoryOptions = {},
  ): Promise<AnalysisDocument[]> {
    const query = Analysis.find({ project: projectId })
      .sort({ createdAt: -1 })
      .session(options.session ?? null);
    if (options.withDeleted) {
      query.setOptions({ withDeleted: true });
    }

    return (await query.exec()) as unknown as AnalysisDocument[];
  }

  async findForWorkflow(analysisId: string): Promise<AnalysisDocument | null> {
    const analysis = await Analysis.findById(analysisId).exec();

    return analysis as unknown as AnalysisDocument | null;
  }

  async findOneForOwner(
    analysisId: string,
    projectId: string,
    userId: string,
  ): Promise<AnalysisDocument | null> {
    const analysis = await Analysis.findOne({
      _id: analysisId,
      project: projectId,
      requestedBy: userId,
    }).exec();

    return analysis as unknown as AnalysisDocument | null;
  }

  async findPage(
    projectId: string,
    userId: string,
    query: AnalysisPageQuery,
  ): Promise<AnalysisPage> {
    const filter = { project: projectId, requestedBy: userId };
    const [items, total] = await Promise.all([
      Analysis.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      Analysis.countDocuments(filter).exec(),
    ]);

    return { items: items as unknown as AnalysisDocument[], total };
  }

  /**
   * Existence probe. Unknown filter keys throw at the model boundary
   * (`strictQuery: 'throw'`), never silently strip.
   */
  async exists(
    filter: QueryFilter<AnalysisFields>,
    options: RepositoryOptions = {},
  ): Promise<boolean> {
    const query = Analysis.exists(filter as never).session(options.session ?? null);
    const found = await query.exec();

    return found !== null;
  }
}