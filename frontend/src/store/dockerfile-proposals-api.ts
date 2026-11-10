
import { apiSlice } from '@/store/api';

import type {
  DockerfileInspectionResponse,
  DockerfileGenerationResponse,
} from '@/types/dockerfile-proposals';

type Identity = {
  projectId: string;
  analysisId: string;
};

export const dockerfileProposalsApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    inspectDockerfileProposals: build.query<
      DockerfileInspectionResponse,
      Identity
    >({
      query: ({ projectId, analysisId }) =>
        `/projects/${projectId}/analyses/${analysisId}/dockerfiles`,

      providesTags: (_result, _error, arg) => [
        {
          type: 'Analyses',
          id: `${arg.projectId}:${arg.analysisId}`,
        },
      ],
    }),

    generateDockerfileProposals: build.mutation<
      DockerfileGenerationResponse,
      Identity & { componentNames: string[] }
    >({
      query: ({
        projectId,
        analysisId,
        componentNames,
      }) => ({
        url: `/projects/${projectId}/analyses/${analysisId}/dockerfiles`,
        method: 'POST',
        body: { componentNames },
      }),

      invalidatesTags: (_result, _error, arg) => [
        {
          type: 'Analyses',
          id: `${arg.projectId}:${arg.analysisId}`,
        },
      ],
    }),
  }),
});

export const {
  useInspectDockerfileProposalsQuery,
  useGenerateDockerfileProposalsMutation,
} = dockerfileProposalsApi;
