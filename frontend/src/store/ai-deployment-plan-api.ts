
import { apiSlice } from "@/store/api";

import type { AiGeneratedPlanResponse } from "@/types/ai-deployment-plan";

export const aiDeploymentPlanApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    generateAiDeploymentPlan: build.mutation<
      AiGeneratedPlanResponse,
      {
        projectId: string;
        analysisId: string;
      }
    >({
      query: ({ projectId, analysisId }) => ({
        url: `/projects/${projectId}/plans/generate-ai`,
        method: "POST",
        body: { analysisId },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "DeploymentPlans", id: projectId },
      ],
    }),
  }),
});

export const {
  useGenerateAiDeploymentPlanMutation,
} = aiDeploymentPlanApi;
