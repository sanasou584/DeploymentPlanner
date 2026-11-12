
"use client";

import { useState } from "react";

import { Button } from "@/shared/button";

import {
  useDeployKubernetesManifestsMutation,
  type KubernetesDeploymentResult,
} from "@/store/kubernetes-deployment-api";

interface KubernetesDeploymentProps {
  projectId: string;
  planId: string;
  eligible: boolean;
}

function errorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Kubernetes deployment failed.";
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
    "Kubernetes deployment failed."
  );
}

export function KubernetesDeployment({
  projectId,
  planId,
  eligible,
}: KubernetesDeploymentProps) {
  const [result, setResult] =
    useState<KubernetesDeploymentResult | null>(
      null,
    );

  const [error, setError] =
    useState<string | null>(null);

  const [deploy, state] =
    useDeployKubernetesManifestsMutation();

  async function handleDeploy(): Promise<void> {
    if (!eligible || state.isLoading) {
      return;
    }

    const confirmed = window.confirm(
      "Deploy the approved Kubernetes manifests " +
      "to Minikube in namespace deploymentplanner-dev? " +
      "This operation creates or updates real Kubernetes resources.",
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setResult(null);

    try {
      const response = await deploy({
        projectId,
        planId,
        confirm: true,
      }).unwrap();

      setResult(response.data);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  return (
    <div className="mt-5 rounded-xl border border-steel/50 bg-basin p-4">
      <h4 className="font-display text-body-md font-semibold text-foam">
        Deploy to Kubernetes
      </h4>

      <p className="mt-2 text-body-sm text-mist">
        Apply the approved manifests to Minikube
        in namespace deploymentplanner-dev.
        A Kubernetes server-side validation is
        performed immediately before applying.
      </p>

      <div className="mt-4">
        <Button
          disabled={!eligible || state.isLoading}
          onClick={() => void handleDeploy()}
          className="min-h-10 px-5"
        >
          {state.isLoading
            ? "Deploying to Minikube..."
            : "Deploy to Minikube"}
        </Button>
      </div>

      {!eligible ? (
        <p className="mt-3 text-body-sm text-champagne">
          An approved plan and locally validated
          manifests are required.
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-crimson/40 p-3"
        >
          <p className="text-body-sm text-crimson">
            {error}
          </p>
        </div>
      ) : null}

      {result ? (
        <div
          role="status"
          className="mt-4 rounded-xl border border-steel/50 bg-abyss p-4"
        >
          <p className="font-display text-body-md font-semibold text-foam">
            Manifests applied to Kubernetes
          </p>

          <p className="mt-2 text-body-sm text-mist">
            Cluster: {result.context}
          </p>

          <p className="mt-1 text-body-sm text-mist">
            Namespace: {result.namespace}
          </p>

          <p className="mt-1 text-body-sm text-mist">
            Plan version: {result.planVersion}
          </p>

          <p className="mt-1 text-body-sm text-mist">
            Applied at:{" "}
            {new Date(
              result.appliedAt,
            ).toLocaleString()}
          </p>

          <pre className="mt-4 whitespace-pre-wrap break-words rounded-lg border border-steel/40 p-3 font-mono text-code-sm text-ice">
            {result.output}
          </pre>

          <p className="mt-3 text-body-sm text-champagne">
            Resources were applied. Pod readiness
            and application availability have not
            yet been verified.
          </p>
        </div>
      ) : null}
    </div>
  );
}
