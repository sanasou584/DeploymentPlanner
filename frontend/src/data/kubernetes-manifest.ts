
import type {
  KubernetesManifestKind,
  ManifestValidationStatus,
} from "@/types/kubernetes-manifest";

export const KUBERNETES_MANIFEST_TEXT = {
  title: "Kubernetes Manifests",
  description:
    "Generate, preview and download Kubernetes manifests from an approved deployment plan.",
  generate: "Generate Kubernetes Manifests",
  generating: "Generating manifests...",
  refresh: "Refresh",
  loading: "Loading Kubernetes manifests...",
  empty: "No Kubernetes manifests have been generated.",
  approvalRequired:
    "Approve the deployment plan before generating Kubernetes manifests.",
  download: "Download YAML",
  generated: "Kubernetes manifests generated successfully.",
  generationFailed: "Manifest generation failed.",
  loadingFailed: "Unable to load Kubernetes manifests.",
  retry: "Retry",
} as const;

export const KUBERNETES_KIND_LABELS: Record<
  KubernetesManifestKind,
  string
> = {
  K8S_DEPLOYMENT: "Deployment",
  K8S_SERVICE: "Service",
  K8S_INGRESS: "Ingress",
  K8S_HPA: "HorizontalPodAutoscaler",
};

export const KUBERNETES_VALIDATION_LABELS: Record<
  ManifestValidationStatus,
  string
> = {
  PENDING: "Pending validation",
  VALID: "Valid",
  INVALID: "Invalid",
};
