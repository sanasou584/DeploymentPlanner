
import { apiSlice } from "@/store/api";

import type {
  CicdPreviewResponse,
  CicdPullRequestResponse,
} from "@/types/cicd";

interface CicdPlanParams {
  projectId: string;
  planId: string;
}

export const cicdApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    previewCicd: builder.query<
      CicdPreviewResponse,
      CicdPlanParams
    >({
      query: ({ projectId, planId }) =>
        `/projects/${projectId}/plans/${planId}/cicd/preview`,
    }),

    createCicdPullRequest: builder.mutation<
      CicdPullRequestResponse,
      CicdPlanParams
    >({
      query: ({ projectId, planId }) => ({
        url:
          `/projects/${projectId}/plans/${planId}/cicd/pull-request`,
        method: "POST",
      }),
    }),
  }),
});

export const {
  usePreviewCicdQuery,
  useCreateCicdPullRequestMutation,
} = cicdApi;
