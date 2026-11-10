
export type KubernetesManifestKind =
  | "K8S_DEPLOYMENT"
  | "K8S_SERVICE"
  | "K8S_INGRESS"
  | "K8S_HPA";

export type ManifestValidationStatus =
  | "PENDING"
  | "VALID"
  | "INVALID";

export interface KubernetesManifest {
  id: string;
  project: string;
  plan: string;
  planVersion: number;
  kind: KubernetesManifestKind;
  componentName: string;
  fileName: string;
  path: string;
  content: string;
  contentHash: string;
  validation: {
    status: ManifestValidationStatus;
    issues: string[];
    validatedAt?: string;
  };
}

export interface KubernetesManifestResponse {
  message: string;
  data: KubernetesManifest[];
}

export interface KubernetesManifestParams {
  projectId: string;
  planId: string;
}
