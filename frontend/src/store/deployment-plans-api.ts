
import { apiSlice } from "@/store/api";

import type {
  CreateDeploymentPlanBody,
  DeploymentPlanListResponse,
  DeploymentPlanResponse,
  UpdatePlanComponentBody,
} from "@/types/deployment-plan";

export const deploymentPlansApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    listDeploymentPlans: build.query<
      DeploymentPlanListResponse,
      { projectId: string }
    >({
      query: ({ projectId }) =>
        `/projects/${projectId}/plans`,

      providesTags: (_result, _error, { projectId }) => [
        { type: "DeploymentPlans", id: projectId },
      ],
    }),

    getDeploymentPlan: build.query<
      DeploymentPlanResponse,
      {
        projectId: string;
        planId: string;
      }
    >({
      query: ({ projectId, planId }) =>
        `/projects/${projectId}/plans/${planId}`,

      providesTags: (_result, _error, { planId }) => [
        { type: "DeploymentPlans", id: planId },
      ],
    }),

    createDeploymentPlan: build.mutation<
      DeploymentPlanResponse,
      {
        projectId: string;
        body: CreateDeploymentPlanBody;
      }
    >({
      query: ({ projectId, body }) => ({
        url: `/projects/${projectId}/plans`,
        method: "POST",
        body,
      }),

      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "DeploymentPlans", id: projectId },
      ],
    }),

    updateDeploymentPlanComponent: build.mutation<
      DeploymentPlanResponse,
      {
        projectId: string;
        planId: string;
        name: string;
        body: UpdatePlanComponentBody;
      }
    >({
      query: ({
        projectId,
        planId,
        name,
        body,
      }) => ({
        url: `/projects/${projectId}/plans/${planId}/components/${encodeURIComponent(name)}`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (_result, _error, { projectId, planId }) => [
        { type: "DeploymentPlans", id: projectId },
        { type: "DeploymentPlans", id: planId },
      ],
    }),

    approveDeploymentPlan: build.mutation<
      DeploymentPlanResponse,
      {
        projectId: string;
        planId: string;
      }
    >({
      query: ({ projectId, planId }) => ({
        url: `/projects/${projectId}/plans/${planId}/approve`,
        method: "POST",
      }),

      invalidatesTags: (_result, _error, { projectId, planId }) => [
        { type: "DeploymentPlans", id: projectId },
        { type: "DeploymentPlans", id: planId },
      ],
    }),

    rejectDeploymentPlan: build.mutation<
      DeploymentPlanResponse,
      {
        projectId: string;
        planId: string;
        reason: string;
      }
    >({
      query: ({ projectId, planId, reason }) => ({
        url: `/projects/${projectId}/plans/${planId}/reject`,
        method: "POST",
        body: { reason },
      }),

      invalidatesTags: (_result, _error, { projectId, planId }) => [
        { type: "DeploymentPlans", id: projectId },
        { type: "DeploymentPlans", id: planId },
      ],
    }),
  }),
});

export const {
  useListDeploymentPlansQuery,
  useGetDeploymentPlanQuery,
  useCreateDeploymentPlanMutation,
  useUpdateDeploymentPlanComponentMutation,
  useApproveDeploymentPlanMutation,
  useRejectDeploymentPlanMutation,
} = deploymentPlansApi;
