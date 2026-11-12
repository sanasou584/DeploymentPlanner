
"use client";

import {
  useState,
} from "react";

import {
  useGetCicdBuildStatusQuery,
  useRequestCicdBuildMutation,
} from "@/store/cicd-build-status-api";

interface Props {
  projectId: string;
  planId: string;
}

const STATUS_LABELS: Record<string, string> = {
  NOT_INSTALLED: "Workflow not installed",
  OUTDATED: "Workflow does not match this plan",
  NOT_STARTED: "No build has been executed",
  IN_PROGRESS: "Docker build in progress",
  SUCCESS: "Docker build succeeded",
  FAILURE: "Docker build failed",
};

export function CicdBuildStatus({
  projectId,
  planId,
}: Props) {
  const [message, setMessage] =
    useState<string | null>(null);

  const {
    data,
    error,
    isLoading,
    refetch,
  } = useGetCicdBuildStatusQuery(
    { projectId, planId },
    {
      pollingInterval: 15000,
    },
  );

  const [requestBuild, requestState] =
    useRequestCicdBuildMutation();

  const status = data?.data;

  const canBuild =
    status?.workflowInstalled === true &&
    status.workflowMatchesPlan === true &&
    status.status !== "IN_PROGRESS";

  async function handleRunBuild() {
    setMessage(null);

    try {
      await requestBuild({
        projectId,
        planId,
      }).unwrap();

      setMessage(
        "Docker build requested. GitHub Actions may take a short time to report the run.",
      );

      await refetch();
    } catch {
      setMessage(
        "Unable to start Docker build. Check GitHub Actions permissions and workflow availability.",
      );
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-steel/50 bg-basin p-4">
      <h3 className="font-display text-body-md font-semibold text-foam">
        Docker Build Status
      </h3>

      {isLoading && (
        <p className="mt-3 text-body-sm text-mist">
          Checking GitHub Actions...
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-body-sm text-crimson">
          Cannot retrieve GitHub Actions status.
        </p>
      )}

      {status && (
        <div className="mt-4 space-y-4">
          <p
            role="status"
            className="font-display text-body-sm text-foam"
          >
            {STATUS_LABELS[status.status] ?? status.status}
          </p>

          <p className="font-mono text-code-md text-mist">
            {status.workflowPath}
          </p>

          {status.run && (
            <div className="rounded-lg border border-steel/40 p-3">
              <p className="font-display text-body-sm text-foam">
                Execution #{status.run.id}
              </p>

              <p className="mt-2 text-body-sm text-mist">
                Status: {status.run.status}
              </p>

              <p className="mt-1 text-body-sm text-mist">
                Conclusion: {status.run.conclusion ?? "Pending"}
              </p>

              <a
                href={status.run.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-body-sm text-ice underline"
              >
                View GitHub Actions logs
              </a>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleRunBuild()}
              disabled={!canBuild || requestState.isLoading}
              className="rounded-xl bg-teal px-4 py-2 font-display text-body-sm font-semibold text-basin disabled:opacity-50"
            >
              {requestState.isLoading
                ? "Starting Docker Build..."
                : "Run Docker Build"}
            </button>

            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-xl border border-steel px-4 py-2 font-display text-body-sm text-foam"
            >
              Refresh status
            </button>
          </div>
        </div>
      )}

      {message && (
        <p role="status" className="mt-4 text-body-sm text-mist">
          {message}
        </p>
      )}
    </section>
  );
}
