
"use client";

import { Button } from "@/shared/button";

import {
  useGetKubernetesMonitoringQuery,
  type KubernetesComponentHealth,
} from "@/store/kubernetes-monitoring-api";

interface KubernetesMonitoringProps {
  projectId: string;
  planId: string;
  approved: boolean;
}

const HEALTH_LABELS: Record<
  KubernetesComponentHealth,
  string
> = {
  HEALTHY: "Healthy",
  PROGRESSING: "Progressing",
  DEGRADED: "Degraded",
  MISSING: "Missing",
};

const HEALTH_CLASSES: Record<
  KubernetesComponentHealth,
  string
> = {
  HEALTHY: "text-mint border-mint/40 bg-mint/10",
  PROGRESSING:
    "text-champagne border-champagne/40 bg-champagne/10",
  DEGRADED:
    "text-crimson border-crimson/40 bg-crimson/10",
  MISSING: "text-mist border-steel bg-basin",
};

export function KubernetesMonitoring({
  projectId,
  planId,
  approved,
}: KubernetesMonitoringProps) {
  const monitoring = useGetKubernetesMonitoringQuery(
    { projectId, planId },
    {
      skip: !approved,
      refetchOnMountOrArgChange: true,
    },
  );

  const result = monitoring.data?.data;

  return (
    <section className="mt-5 rounded-xl border border-steel/50 bg-basin p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h4 className="font-display text-body-md font-semibold text-foam">
            Kubernetes Monitoring
          </h4>

          <p className="mt-2 text-body-sm text-mist">
            Live resource snapshot from Minikube.
            No Kubernetes resources are modified.
          </p>
        </div>

        <Button
          variant="teal"
          disabled={
            !approved ||
            monitoring.isFetching
          }
          onClick={() => {
            void monitoring.refetch();
          }}
          className="min-h-10 px-5"
        >
          {monitoring.isFetching
            ? "Refreshing..."
            : "Refresh deployment status"}
        </Button>
      </div>

      {!approved ? (
        <p className="mt-4 text-body-sm text-champagne">
          An approved deployment plan is required.
        </p>
      ) : null}

      {monitoring.isLoading ? (
        <p
          role="status"
          className="mt-4 text-body-sm text-mist"
        >
          Loading Kubernetes resources...
        </p>
      ) : null}

      {monitoring.isError ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-crimson/40 p-3 text-body-sm text-crimson"
        >
          Unable to retrieve monitoring data.
          Verify that the backend is running and
          the monitoring route is registered.
        </p>
      ) : null}

      {result ? (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-body-sm text-mist">
            <span>Cluster: {result.cluster}</span>
            <span>Namespace: {result.namespace}</span>
            <span>
              Checked:{" "}
              {new Date(result.checkedAt).toLocaleString()}
            </span>
          </div>

          {result.status === "UNAVAILABLE" ? (
            <p
              role="alert"
              className="rounded-xl border border-crimson/40 bg-crimson/10 p-4 text-body-sm text-crimson"
            >
              Cluster unavailable:{" "}
              {result.details ?? "Unknown error"}
            </p>
          ) : null}

          {result.status === "AVAILABLE" &&
          result.components.length === 0 ? (
            <p className="text-body-sm text-mist">
              No monitored components were found
              in the deployment plan.
            </p>
          ) : null}

          {result.components.map((component) => (
            <div
              key={component.name}
              className="rounded-xl border border-steel/50 bg-abyss p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h5 className="break-all font-display text-body-md font-semibold text-foam">
                  {component.name}
                </h5>

                <span
                  className={
                    "rounded-full border px-3 py-1 text-label-sm " +
                    HEALTH_CLASSES[component.health]
                  }
                >
                  {HEALTH_LABELS[component.health]}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-steel/40 p-3">
                  <p className="text-label-sm text-mist">
                    Ready replicas
                  </p>
                  <p className="mt-1 text-headline-sm font-bold text-foam">
                    {component.readyReplicas}/
                    {component.desiredReplicas}
                  </p>
                </div>

                <div className="rounded-lg border border-steel/40 p-3">
                  <p className="text-label-sm text-mist">
                    Available replicas
                  </p>
                  <p className="mt-1 text-headline-sm font-bold text-foam">
                    {component.availableReplicas}
                  </p>
                </div>

                <div className="rounded-lg border border-steel/40 p-3">
                  <p className="text-label-sm text-mist">
                    Service
                  </p>
                  <p className="mt-1 break-all text-body-sm text-foam">
                    {component.service
                      ? `${component.service.type} :${component.service.ports.join(", :")}`
                      : "Not found"}
                  </p>
                </div>
              </div>

              <h6 className="mt-5 text-body-sm font-semibold text-foam">
                Pods
              </h6>

              {component.pods.length === 0 ? (
                <p className="mt-2 text-body-sm text-mist">
                  No Pods found for this component.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {component.pods.map((pod) => (
                    <div
                      key={pod.name}
                      className="rounded-lg border border-steel/40 p-3"
                    >
                      <p className="break-all font-mono text-code-sm text-foam">
                        {pod.name}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-4 text-body-sm text-mist">
                        <span>
                          Status: {pod.phase}
                        </span>
                        <span>
                          Ready: {pod.ready ? "Yes" : "No"}
                        </span>
                        <span>
                          Restarts: {pod.restarts}
                        </span>
                      </div>

                      {pod.reason ? (
                        <p className="mt-2 text-body-sm text-crimson">
                          Reason: {pod.reason}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {component.service ? (
                <p className="mt-4 text-body-sm text-mist">
                  Service IP:{" "}
                  {component.service.clusterIP ?? "None"}
                </p>
              ) : null}
            </div>
          ))}

          {result.events.length > 0 ? (
            <div className="rounded-xl border border-steel/50 bg-abyss p-4">
              <h5 className="font-display text-body-md font-semibold text-foam">
                Recent Kubernetes Events
              </h5>

              <div className="mt-4 space-y-3">
                {result.events.map((event, index) => (
                  <div
                    key={`${event.objectName}-${event.reason}-${index}`}
                    className="rounded-lg border border-steel/40 p-3"
                  >
                    <p className="text-body-sm font-semibold text-foam">
                      {event.reason}
                    </p>

                    <p className="mt-1 break-all text-label-sm text-mist">
                      {event.objectName}
                    </p>

                    <p className="mt-2 whitespace-pre-wrap break-words text-body-sm text-mist">
                      {event.message}
                    </p>

                    <p className="mt-2 text-label-sm text-mist">
                      {event.type}
                      {event.time
                        ? ` · ${new Date(event.time).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
