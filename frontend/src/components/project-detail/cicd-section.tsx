
"use client";

import { useState } from "react";
import {
  useGetCicdBuildStatusQuery,
} from "@/store/cicd-build-status-api";
import {
  usePreviewCicdQuery,
  useCreateCicdPullRequestMutation,
} from "@/store/cicd-api";

import {
  CicdBuildStatus,
} from "@/components/project-detail/cicd-build-status";

interface Props {
  projectId: string;
  planId: string;
  approved: boolean;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error
  ) {
    const data = error.data as {
      error?: { message?: string };
    };

    if (data?.error?.message) {
      return data.error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "CI/CD operation failed.";
}

export function CicdSection({
  projectId,
  planId,
  approved,
}: Props) {
  const [showWorkflow, setShowWorkflow] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [pullRequestUrl, setPullRequestUrl] =
    useState<string | null>(null);

  const previewQuery = usePreviewCicdQuery(
    { projectId, planId },
    { skip: !approved },
  );

  const [createPullRequest, createState] =
    useCreateCicdPullRequestMutation();

    const preview = previewQuery.data?.data;

  const buildStatusQuery =
    useGetCicdBuildStatusQuery(
      { projectId, planId },
      {
        skip: !approved,
        pollingInterval: 15000,
      },
    );

  const buildStatus = buildStatusQuery.data?.data;

  const workflowMessage = (() => {
    if (buildStatusQuery.isError) {
      return "Unable to verify GitHub Actions status.";
    }

    if (!buildStatus) {
      return "Checking GitHub Actions workflow status...";
    }

    const messages: Record<string, string> = {
      NOT_INSTALLED:
        "The workflow is not installed in the connected repository.",
      OUTDATED:
        "The installed workflow does not match this deployment plan.",
      NOT_STARTED:
        "The workflow is installed. No Docker build has been executed yet.",
      IN_PROGRESS:
        "Docker build is currently running on GitHub Actions.",
      SUCCESS:
        "Docker image build and publication completed successfully.",
      FAILURE:
        "The Docker build failed. Review GitHub Actions logs.",
    };

    return (
      messages[buildStatus.status] ??
      "GitHub Actions workflow status is unknown."
    );
  })();

  async function handleCreatePullRequest() {
    setErrorMessage(null);

    try {
      const response = await createPullRequest({
        projectId,
        planId,
      }).unwrap();

      setPullRequestUrl(response.data.url);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <section className="rounded-2xl border border-steel/50 bg-panel p-6 shadow-md">
      <div>
        <h2 className="font-display text-headline-md font-semibold text-foam">
          CI/CD — Docker Build and Publish
        </h2>

        <p className="mt-2 font-display text-body-sm text-mist">
          Generate a GitHub Actions workflow from the approved
          deployment plan.
        </p>
      </div>
        {approved ? (
        <CicdBuildStatus
          projectId={projectId}
          planId={planId}
        />
      ) : null}
      {!approved ? (
        <div className="mt-5 rounded-xl border border-champagne/40 bg-champagne/10 p-4">
          <p className="font-display text-body-sm text-champagne">
            Approve the deployment plan before preparing CI/CD.
          </p>
        </div>
      ) : null}

      {approved && previewQuery.isLoading ? (
        <p
          role="status"
          className="mt-5 font-display text-body-sm text-mist"
        >
          Generating CI/CD preview...
        </p>
      ) : null}

      {approved && previewQuery.isError ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-crimson/40 bg-crimson/10 p-4"
        >
          <p className="font-display text-body-sm text-crimson">
            {getErrorMessage(previewQuery.error)}
          </p>

          <button
            type="button"
            onClick={() => void previewQuery.refetch()}
            className="mt-3 font-display text-body-sm text-ice underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {preview ? (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border border-steel/40 bg-basin p-4">
            <p className="font-display text-body-sm font-semibold text-foam">
              Generated workflow
            </p>

            <p className="mt-2 font-mono text-code-md text-ice">
              {preview.workflowPath}
            </p>

            <p
              role="status"
              className="mt-2 font-display text-body-sm text-mist"
            >
              {workflowMessage}
            </p>
          </div>

          <div>
            <h3 className="font-display text-body-md font-semibold text-foam">
              Docker images
            </h3>

            <div className="mt-3 space-y-3">
              {preview.components.map((component) => (
                <div
                  key={component.name}
                  className="rounded-xl border border-steel/40 bg-basin p-4"
                >
                  <p className="font-display text-body-sm font-semibold text-foam">
                    {component.name}
                  </p>

                  <p className="mt-2 break-all font-mono text-code-md text-ice">
                    {component.image}
                  </p>

                  <p className="mt-2 font-mono text-label-sm text-mist">
                    Dockerfile: {component.dockerfilePath}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display text-body-md font-semibold text-foam">
              Files proposed for GitHub
            </h3>

            <ul className="mt-3 space-y-2">
              {preview.files.map((file) => (
                <li
                  key={file}
                  className="break-all rounded-lg border border-steel/40 bg-basin px-3 py-2 font-mono text-code-md text-foam"
                >
                  {file}
                </li>
              ))}
            </ul>
          </div>

          {preview.warnings.length > 0 ? (
            <div className="rounded-xl border border-champagne/40 bg-champagne/10 p-4">
              <h3 className="font-display text-body-sm font-semibold text-champagne">
                Review required
              </h3>

              <ul className="mt-3 list-disc space-y-2 pl-5">
                {preview.warnings.map((warning) => (
                  <li
                    key={warning}
                    className="font-display text-body-sm text-foam"
                  >
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <button
              type="button"
              onClick={() =>
                setShowWorkflow((current) => !current)
              }
              className="rounded-xl border border-steel/50 bg-basin px-4 py-2 font-display text-body-sm text-foam hover:border-ice"
            >
              {showWorkflow
                ? "Hide workflow YAML"
                : "Preview workflow YAML"}
            </button>

            {showWorkflow ? (
              <pre className="mt-3 max-h-96 overflow-auto rounded-xl border border-steel/40 bg-basin p-4 text-xs text-foam">
                <code>{preview.workflow}</code>
              </pre>
            ) : null}
          </div>

          {pullRequestUrl ? (
            <div className="rounded-xl border border-mint/40 bg-mint/10 p-4">
              <p className="font-display text-body-sm text-mint">
                CI/CD Pull Request created.
              </p>

              <a
                href={pullRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block break-all font-display text-body-sm text-ice underline"
              >
                Open Pull Request on GitHub
              </a>
            </div>
          ) : (
            <button
              type="button"
              disabled={createState.isLoading}
              onClick={() => void handleCreatePullRequest()}
              className="rounded-xl bg-teal px-5 py-3 font-display text-body-sm font-semibold text-basin transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {createState.isLoading
                ? "Creating Pull Request..."
                : "Create CI/CD Pull Request"}
            </button>
          )}

          {errorMessage ? (
            <p
              role="alert"
              className="font-display text-body-sm text-crimson"
            >
              {errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
