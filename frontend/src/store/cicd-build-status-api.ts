
import {
  apiSlice,
} from "@/store/api";

interface BuildParams {
  projectId: string;
  planId: string;
}

export interface BuildRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  url: string;
  event: string;
  branch: string | null;
  commit: string;
  createdAt: string;
  updatedAt: string;
}

export interface BuildStatus {
  workflowPath: string;
  workflowInstalled: boolean;
  workflowMatchesPlan: boolean;
  status:
    | "NOT_INSTALLED"
    | "OUTDATED"
    | "NOT_STARTED"
    | "IN_PROGRESS"
    | "SUCCESS"
    | "FAILURE";
  run: BuildRun | null;
}

interface BuildStatusResponse {
  message: string;
  data: BuildStatus;
}

interface BuildRequestResponse {
  message: string;
  data: {
    accepted: boolean;
    message: string;
  };
}

export const cicdBuildStatusApi =
  apiSlice.injectEndpoints({
    endpoints: (builder) => ({
      getCicdBuildStatus: builder.query<
        BuildStatusResponse,
        BuildParams
      >({
        query: ({ projectId, planId }) =>
          `/projects/${projectId}/plans/${planId}/cicd/build-status`,
      }),

      requestCicdBuild: builder.mutation<
        BuildRequestResponse,
        BuildParams
      >({
        query: ({ projectId, planId }) => ({
          url:
            `/projects/${projectId}/plans/${planId}/cicd/build`,
          method: "POST",
        }),
      }),
    }),
  });

export const {
  useGetCicdBuildStatusQuery,
  useRequestCicdBuildMutation,
} = cicdBuildStatusApi;
