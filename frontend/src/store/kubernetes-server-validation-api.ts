
import {
  apiSlice,
} from "@/store/api";

export interface KubernetesServerValidationParams {
  projectId: string;
  planId: string;
}

export interface KubernetesServerValidationResult {
  status: "VALID" | "INVALID" | "UNAVAILABLE";
  cluster: string;
  namespace: string;
  details: string;
  validatedAt: string;
  results: Array<{
    path: string;
    kind: string;
    status: "VALID" | "INVALID";
    details: string;
  }>;
}

export interface KubernetesServerValidationResponse {
  message: string;
  data: KubernetesServerValidationResult;
}

export const kubernetesServerValidationApi =
  apiSlice.injectEndpoints({
    endpoints: (build) => ({
      validateKubernetesServer: build.mutation<
        KubernetesServerValidationResponse,
        KubernetesServerValidationParams
      >({
        query: ({ projectId, planId }) => ({
          url:
            `/projects/${projectId}/plans/${planId}/manifests/validate-server`,
          method: "POST",
        }),
      }),
    }),
  });

export const {
  useValidateKubernetesServerMutation,
} = kubernetesServerValidationApi;
