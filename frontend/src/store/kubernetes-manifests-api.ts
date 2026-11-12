
import { apiSlice } from "@/store/api";

import type {
  KubernetesManifestParams,
  KubernetesManifestResponse,
} from "@/types/kubernetes-manifest";

export const kubernetesManifestsApi =
  apiSlice.injectEndpoints({
    endpoints: (build) => ({
      listKubernetesManifests: build.query<
        KubernetesManifestResponse,
        KubernetesManifestParams
      >({
        query: ({ projectId, planId }) => ({
          url: `/projects/${projectId}/plans/${planId}/manifests`,
          method: "GET",
        }),

        providesTags: (_result, _error, { planId }) => [
          {
            type: "DeploymentPlans",
            id: `${planId}-manifests`,
          },
        ],
      }),

      generateKubernetesManifests: build.mutation<
        KubernetesManifestResponse,
        KubernetesManifestParams
      >({
        query: ({ projectId, planId }) => ({
          url: `/projects/${projectId}/plans/${planId}/manifests`,
          method: "POST",
        }),

        invalidatesTags: (_result, _error, { planId }) => [
          {
            type: "DeploymentPlans",
            id: `${planId}-manifests`,
          },
        ],
      }),

      validateKubernetesManifests: build.mutation<
        KubernetesManifestResponse,
        KubernetesManifestParams
      >({
        query: ({ projectId, planId }) => ({
          url: `/projects/${projectId}/plans/${planId}/manifests/validate`,
          method: "POST",
        }),

        invalidatesTags: (_result, _error, { planId }) => [
          {
            type: "DeploymentPlans",
            id: `${planId}-manifests`,
          },
        ],
      }),
    }),
  });

export const {
  useListKubernetesManifestsQuery,
  useGenerateKubernetesManifestsMutation,
  useValidateKubernetesManifestsMutation,
} = kubernetesManifestsApi;
