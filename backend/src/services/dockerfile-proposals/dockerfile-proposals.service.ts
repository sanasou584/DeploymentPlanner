
import { Types } from 'mongoose';

import {
  ConflictError,
  NotFoundError,
} from '../../domain/errors/index.js';

import {
  GeneratedFile,
  type AnalysisDocument,
  type GeneratedFileDocument,
} from '../../models/entities/index.js';

import {
  AnalysisRepository,
} from '../../repositories/analysis.repository.js';

import {
  ProjectRepository,
} from '../../repositories/project.repository.js';

import {
  DockerfileRepository,
} from '../../repositories/dockerfile.repository.js';

import {
  inspectDockerfiles,
} from './dockerfile-proposals.builder.js';

import type {
  GenerateDockerfilesBody,
} from './dockerfile-proposals.schema.js';

export function createDockerfileProposalService(
  analyses = new AnalysisRepository(),
  projects = new ProjectRepository(),
  files = new DockerfileRepository(),
) {
  async function requireAnalysis(
    userId: string,
    projectId: string,
    analysisId: string,
  ): Promise<AnalysisDocument> {
    const project = await projects.findByIdForOwner(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const analysis = await analyses.findOneForOwner(
      analysisId,
      projectId,
      userId,
    );

    if (!analysis) {
      throw new NotFoundError('Analysis not found');
    }

    if (analysis.status !== 'COMPLETED') {
      throw new ConflictError(
        'Only completed analyses support Dockerfile proposals',
      );
    }

    return analysis;
  }

  async function inspect(
    userId: string,
    projectId: string,
    analysisId: string,
  ) {
    const analysis = await requireAnalysis(
      userId,
      projectId,
      analysisId,
    );

    const candidates = inspectDockerfiles(analysis);

    const generated = await files.listForAnalysis(
      projectId,
      analysisId,
    );

    return { candidates, generated };
  }

  async function generate(
    userId: string,
    projectId: string,
    analysisId: string,
    input: GenerateDockerfilesBody,
  ): Promise<GeneratedFileDocument[]> {
    const analysis = await requireAnalysis(
      userId,
      projectId,
      analysisId,
    );

    const candidates = inspectDockerfiles(analysis);

    const names = new Set(input.componentNames);

    if (names.size !== input.componentNames.length) {
      throw new ConflictError(
        'Duplicate component names in request',
      );
    }

    const chosen = input.componentNames.map((name) =>
      candidates.find((item) => item.componentName === name)
    );

    if (
      chosen.some(
        (item) =>
          !item ||
          item.status !== 'GENERATABLE' ||
          !item.proposal
      )
    ) {
      throw new ConflictError(
        'Selected component has an existing Dockerfile or unsupported stack',
      );
    }

    const stored = await files.listForAnalysis(
      projectId,
      analysisId,
    );

        const selected = chosen.flatMap((item) =>
      item?.proposal
        ? item.proposal.files.map((file) => ({
            componentName: item.componentName,
            path: file.path,
            content: file.content,
          }))
        : []
    );

    if (
      selected.some((item) =>
        stored.some((file) => file.path === item.path)
      )
    ) {
      throw new ConflictError(
        'Dockerfile proposal already generated; existing files are immutable',
      );
    }

    const output: GeneratedFileDocument[] = [];

    for (const item of selected) {
      output.push(
        await GeneratedFile.generate({
          projectId: new Types.ObjectId(projectId),
          analysisId: analysis._id,
          kind: item.path.endsWith('/Dockerfile') ||
            item.path === 'Dockerfile'
              ? 'DOCKERFILE'
              : 'DOCKER_ASSET',
          fileName: item.path.split('/').at(-1)!,
          path: item.path,
          content: item.content,
          componentName: item.componentName,
        }),
      );
    }

    return output;
  }

  return { inspect, generate };
}

export type DockerfileProposalService = ReturnType<
  typeof createDockerfileProposalService
>;
