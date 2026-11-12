
import {
  apiSlice,
} from "@/store/api";

export interface KubernetesMonitoringParams {
  projectId: string;
  planId: string;
}

export type KubernetesComponentHealth =
  | "HEALTHY"
  | "PROGRESSING"
  | "DEGRADED"
  | "MISSING";

export interface MonitoredPod {
  name: string;
  phase: string;
  ready: boolean;
  restarts: number;
  reason: string | null;
}

export interface MonitoredService {
  name: string;
  type: string;
  clusterIP: string | null;
  ports: number[];
}

export interface MonitoredComponent {
  name: string;
  health: KubernetesComponentHealth;
  desiredReplicas: number;
  readyReplicas: number;
  availableReplicas: number;
  pods: MonitoredPod[];
  service: MonitoredService | null;
}

export interface MonitoredEvent {
  objectName: string;
  reason: string;
  message: string;
  type: string;
  time: string | null;
}

export interface KubernetesMonitoringResult {
  status: "AVAILABLE" | "UNAVAILABLE";
  cluster: string;
  namespace: string;
  checkedAt: string;
  details: string | null;
  components: MonitoredComponent[];
  events: MonitoredEvent[];
}

export interface KubernetesMonitoringResponse {
  message: string;
  data: KubernetesMonitoringResult;
}

export const kubernetesMonitoringApi =
  apiSlice.injectEndpoints({
    endpoints: (build) => ({
      getKubernetesMonitoring: build.query<
        KubernetesMonitoringResponse,
        KubernetesMonitoringParams
      >({
        query: ({ projectId, planId }) => ({
          url:
            `/projects/${projectId}/plans/${planId}/kubernetes/status`,
          method: "GET",
        }),
        keepUnusedDataFor: 0,
      }),
    }),
  });

export const {
  useGetKubernetesMonitoringQuery,
} = kubernetesMonitoringApi;
