
"use client";

import { useState } from "react";

import { Button } from "@/shared/button";

import {
  useValidateKubernetesServerMutation,
  type KubernetesServerValidationResult,
} from "@/store/kubernetes-server-validation-api";

interface Props {
  projectId: string;
  planId: string;
  eligible: boolean;
}

function errorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Unable to validate Kubernetes manifests.";
  }

  const response = error as {
    data?: {
      error?: {
        message?: string;
      };
    };
    message?: string;
  };

  return (
    response.data?.error?.message ??
    response.message ??
    "Unable to validate Kubernetes manifests."
  );
}

export function KubernetesServerValidation({
  projectId,
  planId,
  eligible,
}: Props) {
  const [result, setResult] =
    useState<KubernetesServerValidationResult | null>(
      null,
    );

  const [error, setError] =
    useState<string | null>(null);

  const [validateServer, state] =
    useValidateKubernetesServerMutation();

  async function handleValidate(): Promise<void> {
    if (!eligible || state.isLoading) {
      return;
    }

    setError(null);
    setResult(null);

    try {
      const response = await validateServer({
        projectId,
        planId,
      }).unwrap();

      setResult(response.data);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  const labels = {
    VALID: "Accepted by Kubernetes",
    INVALID: "Rejected by Kubernetes",
    UNAVAILABLE: "Kubernetes cluster unavailable",
  };

  return (
    <div className="mt-5 rounded-xl border border-steel/50 bg-basin p-4">
      <h4 className="font-display text-body-md font-semibold text-foam">
        Kubernetes Server Validation
      </h4>

      <p className="mt-2 text-body-sm text-mist">
        Validate the generated manifests against
        the Minikube API using a server-side dry run.
        No Kubernetes resources will be deployed.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant="teal"
          disabled={!eligible || state.isLoading}
          onClick={() => void handleValidate()}
          className="min-h-10 px-5"
        >
          {state.isLoading
            ? "Validating with Minikube..."
            : "Validate with Minikube"}
        </Button>

        {!eligible ? (
          <span className="text-body-sm text-champagne">
            All manifests must pass local validation first.
          </span>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 text-body-sm text-crimson"
        >
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          role="status"
          className="mt-5 space-y-3 rounded-xl border border-steel/50 bg-abyss p-4"
        >
          <p className="font-display text-body-md font-semibold text-foam">
            {labels[result.status]}
          </p>

          <p className="text-body-sm text-mist">
            Cluster: {result.cluster}
          </p>

          <p className="text-body-sm text-mist">
            Namespace: {result.namespace}
          </p>

          <p className="text-body-sm text-mist">
            {result.details}
          </p>

          <p className="text-label-sm text-mist">
            Checked at:{" "}
            {new Date(
              result.validatedAt,
            ).toLocaleString()}
          </p>

          {result.results.map((file) => (
            <div
              key={file.path}
              className="rounded-lg border border-steel/40 p-3"
            >
              <p className="break-all font-mono text-code-md text-foam">
                {file.path}
              </p>

              <p className="mt-2 text-body-sm text-ice">
                {file.status}
              </p>

              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-code-sm text-mist">
                {file.details}
              </pre>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
