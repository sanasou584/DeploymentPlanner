import type { PipelineNodeIcon, PipelineStep, PipelineStepId } from "@/types/pipeline";

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: "github-repo", label: "GitHub repo" },
  { id: "analyze", label: "Analyze" },
  { id: "ai-plan", label: "AI plan", meta: "GPT-4o" },
  { id: "kubernetes", label: "Kubernetes" },
  { id: "argo-cd", label: "Argo CD" },
];

export const PIPELINE_NODE_ICONS: Record<PipelineStepId, PipelineNodeIcon> = {
  "github-repo": "github-logo",
  analyze: "radar",
  "ai-plan": "auto_awesome",
  kubernetes: "deployed_code",
  "argo-cd": "sync",
};

export const HIGHLIGHTED_STEP_IDS: readonly PipelineStepId[] = ["ai-plan"];
