
"use client";

import { useState } from "react";

import { Button } from "@/shared/button";

import { KUBERNETES_MANIFEST_TEXT, KUBERNETES_KIND_LABELS, KUBERNETES_VALIDATION_LABELS } from "@/data/kubernetes-manifest";

import {
  useGenerateKubernetesManifestsMutation,
  useListKubernetesManifestsQuery,
  useValidateKubernetesManifestsMutation,
} from "@/hooks/use-kubernetes-manifests";

import type {
  KubernetesManifest,
} from "@/types/kubernetes-manifest";
import {
  KubernetesServerValidation,
} from "@/components/project-detail/kubernetes-server-validation";
interface KubernetesManifestSectionProps {
  projectId: string;
  planId: string;
  approved: boolean;
}

function errorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "An unexpected error occurred.";
  }

  const response = error as {
    data?: { error?: { message?: string } };
    message?: string;
  };

  return (
    response.data?.error?.message ??
    response.message ??
    "An unexpected error occurred."
  );
}

function downloadManifest(file: KubernetesManifest): void {
  const blob = new Blob([file.content], {
    type: "application/yaml;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${file.componentName}-${file.fileName}`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

function downloadAllManifests(
  files: readonly KubernetesManifest[],
  planId: string,
): void {
  if (files.length === 0) {
    return;
  }

  const content = files
    .map(
      (file) =>
        [
          `# ${file.path}`,
          file.content.trim(),
        ].join("\n"),
    )
    .join("\n---\n") + "\n";

  const blob = new Blob([content], {
    type: "application/yaml;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `deployment-plan-${planId}-kubernetes.yaml`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export function KubernetesManifestSection({
  projectId,
  planId,
  approved,
}: KubernetesManifestSectionProps) {
  const [selectedPath, setSelectedPath] =
    useState<string | null>(null);

  const [feedback, setFeedback] =
    useState<string | null>(null);

  const manifestsQuery = useListKubernetesManifestsQuery(
    { projectId, planId },
    { skip: !approved },
  );

    const [
    generateManifests,
    generateState,
  ] = useGenerateKubernetesManifestsMutation();

  const [
    validateManifests,
    validateState,
  ] = useValidateKubernetesManifestsMutation();

  const files = manifestsQuery.data?.data ?? [];
    const deploymentCount = files.filter(
    (file) => file.kind === "K8S_DEPLOYMENT",
  ).length;

  const serviceCount = files.filter(
    (file) => file.kind === "K8S_SERVICE",
  ).length;

  const selectedFile =
    files.find((file) => file.path === selectedPath) ??
    files[0] ??
    null;

  async function handleGenerate() {
    if (!approved || generateState.isLoading) {
      return;
    }

    setFeedback(null);

    try {
      await generateManifests({
        projectId,
        planId,
      }).unwrap();

      await manifestsQuery.refetch();

      setFeedback(KUBERNETES_MANIFEST_TEXT.generated);
    } catch (error) {
      setFeedback(
        `${KUBERNETES_MANIFEST_TEXT.generationFailed} ${errorMessage(error)}`,
      );
    }
  }
    async function handleValidate() {
    if (
      !approved ||
      files.length === 0 ||
      validateState.isLoading
    ) {
      return;
    }

    setFeedback(null);

    try {
      const response = await validateManifests({
        projectId,
        planId,
      }).unwrap();

      const invalid = response.data.filter(
        (file) => file.validation.status === "INVALID",
      );

      await manifestsQuery.refetch();

      setFeedback(
        invalid.length === 0
          ? "All manifests passed local validation against the approved plan."
          : `${invalid.length} manifest(s) failed local validation. Review the reported issues.`,
      );
    } catch (error) {
      setFeedback(
        `Kubernetes manifest validation failed: ${errorMessage(error)}`,
      );
    }
  }

  return (
    <section className="rounded-2xl border border-steel bg-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-headline-sm font-semibold text-foam">
            {KUBERNETES_MANIFEST_TEXT.title}
          </h3>

          <p className="mt-2 max-w-xl font-display text-body-sm text-mist">
            {KUBERNETES_MANIFEST_TEXT.description}
          </p>
        </div>

                <div className="flex flex-wrap gap-3">
          <Button
            disabled={
              !approved ||
              generateState.isLoading ||
              validateState.isLoading
            }
            onClick={() => void handleGenerate()}
            className="min-h-10 px-5"
          >
            {generateState.isLoading
              ? KUBERNETES_MANIFEST_TEXT.generating
              : KUBERNETES_MANIFEST_TEXT.generate}
          </Button>

          <Button
            variant="teal"
            disabled={
              !approved ||
              files.length === 0 ||
              generateState.isLoading ||
              validateState.isLoading
            }
            onClick={() => void handleValidate()}
            className="min-h-10 px-5"
          >
            {validateState.isLoading
              ? "Validating manifests..."
              : "Validate Kubernetes Manifests"}
          </Button>
        </div>
      </div>

      {!approved ? (
        <p
          role="status"
          className="mt-5 rounded-xl border border-champagne/40 bg-champagne/10 p-4 font-display text-body-sm text-champagne"
        >
          {KUBERNETES_MANIFEST_TEXT.approvalRequired}
        </p>
      ) : null}

      {feedback ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-5 rounded-xl border border-steel bg-basin p-4 font-display text-body-sm text-foam"
        >
          {feedback}
        </p>
      ) : null}

      {approved && manifestsQuery.isLoading ? (
        <p role="status" className="mt-5 text-body-sm text-mist">
          {KUBERNETES_MANIFEST_TEXT.loading}
        </p>
      ) : null}

      {approved && manifestsQuery.isError ? (
        <div role="alert" className="mt-5 rounded-xl border border-crimson/40 bg-crimson/10 p-4">
          <p className="text-body-sm text-crimson">
            {KUBERNETES_MANIFEST_TEXT.loadingFailed}
          </p>

          <button
            type="button"
            onClick={() => void manifestsQuery.refetch()}
            className="mt-3 text-body-sm text-ice underline"
          >
            {KUBERNETES_MANIFEST_TEXT.retry}
          </button>
        </div>
      ) : null}

      {approved &&
      manifestsQuery.isSuccess &&
      files.length === 0 ? (
        <p className="mt-5 rounded-xl border border-steel/50 bg-basin p-4 text-body-sm text-mist">
          {KUBERNETES_MANIFEST_TEXT.empty}
        </p>
      ) : null}

                  {files.length > 0 ? (
        <>
          <KubernetesServerValidation
            projectId={projectId}
            planId={planId}
            eligible={
              approved &&
              files.every(
                (file) =>
                  file.validation.status === "VALID",
              )
            }
          />
          <div className="mt-5 rounded-xl border border-steel/50 bg-basin p-4">
            <h4 className="font-display text-body-md font-semibold text-foam">
              Kubernetes generation summary
            </h4>

            <div className="mt-3 flex flex-wrap gap-4 font-display text-body-sm text-mist">
              <span>
                Generated files: {files.length}
              </span>

              <span>
                Deployments: {deploymentCount}
              </span>

              <span>
                Services: {serviceCount}
              </span>
            </div>

            <p className="mt-3 text-body-sm text-mist">
              These manifests have been generated and stored.
              They have not been applied to a Kubernetes cluster.
            </p>

            <Button
              variant="teal"
              className="mt-4 min-h-10 px-5"
              onClick={() =>
                downloadAllManifests(
                  files,
                  planId,
                )
              }
            >
              Download all manifests
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            {files.map((file) => {
              const active = selectedFile?.id === file.id;

              return (
                <button
                  key={file.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedPath(file.path)}
                  className={
                    active
                      ? "rounded-xl border border-ice bg-ice/10 p-4 text-left"
                      : "rounded-xl border border-steel/50 bg-basin p-4 text-left hover:border-teal"
                  }
                >
                  <span className="block break-all font-mono text-code-md text-foam">
                    {file.componentName}/{file.fileName}
                  </span>

                  <span className="mt-1 block text-body-sm text-mist">
                    {KUBERNETES_KIND_LABELS[file.kind]}
                  </span>

                  <span className="mt-2 block text-label-sm text-ice">
                    {KUBERNETES_VALIDATION_LABELS[file.validation.status]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="min-w-0 rounded-xl border border-steel bg-basin p-4 lg:col-span-2">
            {selectedFile ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="break-all font-mono text-code-md text-foam">
                      {selectedFile.path}
                    </h4>

                    <p className="mt-1 text-label-sm text-mist">
                      Plan version {selectedFile.planVersion}
                    </p>
                  </div>

                  <Button
                    variant="teal"
                    className="min-h-9 px-4"
                    onClick={() => downloadManifest(selectedFile)}
                  >
                    {KUBERNETES_MANIFEST_TEXT.download}
                  </Button>
                </div>

                <pre className="mt-4 max-h-96 overflow-auto rounded-xl border border-steel/40 bg-abyss p-4 font-mono text-code-md text-ice">
                  <code>{selectedFile.content}</code>
                </pre>

                {selectedFile.validation.issues.length > 0 ? (
                  <div role="alert" className="mt-4 rounded-lg border border-crimson/40 p-3">
                    {selectedFile.validation.issues.map((issue) => (
                      <p key={issue} className="text-body-sm text-crimson">
                        {issue}
                      </p>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
                  </div>
        </>
      ) : null}
    </section>
  );
}