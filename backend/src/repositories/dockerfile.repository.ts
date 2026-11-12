import type { Types } from 'mongoose';
import {
  GeneratedFile,
  type GeneratedFileDocument,
  type GeneratedFileFields,
  type GeneratedFileMethods,
} from '../models/entities/index.js';

import {
  BaseRepository,
} from './base.repository.js';

export class DockerfileRepository extends BaseRepository<
  GeneratedFileFields,
  GeneratedFileMethods
> {
  constructor() {
    super(GeneratedFile);
  }

  listForAnalysis(
    projectId: string | Types.ObjectId,
    analysisId: string | Types.ObjectId,
  ): Promise<GeneratedFileDocument[]> {
    return this.find({
      project: projectId,
      analysis: analysisId,
      kind: { $in: ['DOCKERFILE', 'DOCKER_ASSET'] },
    });
  }
}
