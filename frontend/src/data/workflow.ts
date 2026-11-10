import type { WorkflowStep } from "@/types/landing";

export const WORKFLOW_LABEL = "Workflow Sequence";

export const WORKFLOW_HEADING = "From repository to running app in 5 steps";

export const WORKFLOW_SUBHEADING =
  "Transparent, auditable, and human-in-the-loop every step of the journey.";

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "connect-repository",
    index: "01",
    icon: "merge_type",
    title: "Connect repository",
    description: "Grant read permissions to your public or private GitHub repos.",
    tone: "ice",
  },
  {
    id: "analyze-detect",
    index: "02",
    icon: "manage_search",
    title: "Analyze & detect",
    description: "Deep AST inspection of language, framework, dependencies, and ports.",
    tone: "ice",
  },
  {
    id: "review-ai-plan",
    index: "03",
    icon: "auto_awesome",
    title: "Review AI plan",
    description: "AI constructs workload topologies, sizing models, and network ingress.",
    tone: "lavender",
  },
  {
    id: "approve-plan",
    index: "04",
    icon: "check_circle",
    title: "Approve plan",
    description: "Tweak variables, commit parameters, or reject changes completely.",
    tone: "gold",
    badge: "You decide",
  },
  {
    id: "deploy-gitops",
    index: "05",
    icon: "rocket_launch",
    title: "Deploy GitOps",
    description: "Manifests pushed to Git repo; Argo CD synchronizes target cluster.",
    tone: "mint",
  },
];
