import { apiSlice } from "@/store/api";
import type { ProjectResponse } from "@/types/project";
import type {
  AiAuditRequested,
  AnalysisListResponse,
  AnalysisResponse,
  RecommendationAuditResponse,
  RecommendationListResponse,
  RecommendationResponse,
  RejectRecommendationBody,
} from "@/types/analysis";

export const analysesApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getProject: build.query<ProjectResponse, { id: string }>({
      query: ({ id }) => `/projects/${id}`,
      providesTags: (_result, _error, arg) => [{ type: "Project", id: arg.id }],
    }),
    listAnalyses: build.query<
      AnalysisListResponse,
      { projectId: string; page: number; limit: number }
    >({
      query: ({ projectId, page, limit }) => ({
        url: `/projects/${projectId}/analyses`,
        params: { page, limit },
      }),
      providesTags: (_result, _error, arg) => [{ type: "Analyses", id: arg.projectId }],
    }),
    getAnalysis: build.query<
      AnalysisResponse,
      { projectId: string; analysisId: string }
    >({
      query: ({ projectId, analysisId }) =>
        `/projects/${projectId}/analyses/${analysisId}`,
      providesTags: (_result, _error, arg) => [
        { type: "Analyses", id: `${arg.projectId}:${arg.analysisId}` },
      ],
    }),
    launchAnalysis: build.mutation<AnalysisResponse, { projectId: string }>({
      query: ({ projectId }) => ({
        url: `/projects/${projectId}/analyses`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: "Analyses", id: arg.projectId }],
    }),
    listRecommendations: build.query<
      RecommendationListResponse,
      { projectId: string; analysisId: string }
    >({
      query: ({ projectId, analysisId }) =>
        `/projects/${projectId}/analyses/${analysisId}/recommendations`,
      providesTags: (_result, _error, arg) => [
        { type: "Recommendations", id: `${arg.projectId}:${arg.analysisId}` },
      ],
    }),
    runAudit: build.mutation<
      RecommendationAuditResponse,
      { projectId: string; analysisId: string }
    >({
      query: ({ projectId, analysisId }) => ({
        url: `/projects/${projectId}/analyses/${analysisId}/audit`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Recommendations", id: `${arg.projectId}:${arg.analysisId}` },
      ],
    }),
    acceptRecommendation: build.mutation<
      RecommendationResponse,
      { projectId: string; analysisId: string; recommendationId: string }
    >({
      query: ({ projectId, analysisId, recommendationId }) => ({
        url: `/projects/${projectId}/analyses/${analysisId}/recommendations/${recommendationId}/accept`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Recommendations", id: `${arg.projectId}:${arg.analysisId}` },
      ],
    }),
    rejectRecommendation: build.mutation<
      RecommendationResponse,
      { projectId: string; analysisId: string; recommendationId: string; body?: RejectRecommendationBody }
    >({
      query: ({ projectId, analysisId, recommendationId, body }) => ({
        url: `/projects/${projectId}/analyses/${analysisId}/recommendations/${recommendationId}/reject`,
        method: "POST",
        body: body ?? {},
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Recommendations", id: `${arg.projectId}:${arg.analysisId}` },
      ],
    }),
    launchAiAudit: build.mutation<
      AiAuditRequested,
      { projectId: string; analysisId: string }
    >({
      query: ({ projectId, analysisId }) => ({
        url: `/projects/${projectId}/analyses/${analysisId}/audit/ai`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Recommendations", id: `${arg.projectId}:${arg.analysisId}` },
      ],
    }),
  }),
});

export const {
  useGetProjectQuery,
  useListAnalysesQuery,
  useGetAnalysisQuery,
  useLaunchAnalysisMutation,
  useListRecommendationsQuery,
  useRunAuditMutation,
  useAcceptRecommendationMutation,
  useRejectRecommendationMutation,
  useLaunchAiAuditMutation,
} = analysesApi;
