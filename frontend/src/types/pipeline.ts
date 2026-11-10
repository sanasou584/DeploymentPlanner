import type { MaterialIconName } from "@/types/icons";

export type PipelineStepId =
  | "github-repo"
  | "analyze"
  | "ai-plan"
  | "kubernetes"
  | "argo-cd";

export type PipelineNodeIcon = MaterialIconName | "github-logo";

export interface PipelineStep {
  id: PipelineStepId;
  label: string;
  meta?: string;
}
