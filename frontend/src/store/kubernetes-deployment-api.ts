
import {
  apiSlice,
} from "@/store/api";

export interface KubernetesDeploymentParams {
  projectId: string;
  planId: string;
  confirm: true;
}

export interface KubernetesDeploymentResult {
  status: "APPLIED";
  context: string;
  namespace: string;
  planVersion: number;
  appliedAt: string;
  output: string;
}

export interface KubernetesDeploymentResponse {
  message: string;
  data: KubernetesDeploymentResult;
}

export const kubernetesDeploymentApi =
  apiSlice.injectEndpoints({
    endpoints: (build) => ({
      deployKubernetesManifests: build.mutation<
        KubernetesDeploymentResponse,
        KubernetesDeploymentParams
      >({
        query: ({ projectId, planId, confirm }) => ({
          url: `/projects/${projectId}/plans/${planId}/deploy`,
          method: "POST",
          body: { confirm },
        }),
      }),
    }),
  });

export const {
  useDeployKubernetesManifestsMutation,
} = kubernetesDeploymentApi;
