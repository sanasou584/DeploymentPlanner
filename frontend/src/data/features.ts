import type { FeatureCard } from "@/types/landing";

export const FEATURES_HEADING = "Everything between your repo and your cluster";

export const FEATURES_SUBHEADING =
  "No more crafting boilerplate manifests by hand or debugging broken Helm charts in production.";

export const FEATURE_CARDS: FeatureCard[] = [
  {
    id: "repository-analysis",
    icon: "document_scanner",
    title: "Repository analysis",
    description: [
      { text: "Detects your stack from ", kind: "text" },
      { text: "package.json", kind: "code" },
      { text: ", ", kind: "text" },
      { text: "requirements.txt", kind: "code" },
      { text: ", Go modules, and Docker compose files.", kind: "text" },
    ],
    tone: "teal",
  },
  {
    id: "docker-review",
    icon: "inventory_2",
    title: "Docker review",
    description: [
      {
        text: "Finds bad practices, vulnerabilities, unpinned base tags, and automatically synthesizes a missing multi-stage Dockerfile.",
        kind: "text",
      },
    ],
    tone: "teal",
  },
  {
    id: "ai-recommendations",
    icon: "auto_awesome",
    title: "AI recommendations",
    description: [
      {
        text: "Replicas, CPU, memory, dynamic HPA thresholds, readiness probes, and fine-grained Ingress routing suggestions.",
        kind: "text",
      },
    ],
    tone: "lavender",
    tag: "Model v4",
  },
  {
    id: "deployment-plan",
    icon: "fact_check",
    title: "Deployment plan",
    description: [
      {
        text: "One consolidated, completely editable architectural plan that you inspect, fine-tune, approve, or reject.",
        kind: "text",
      },
    ],
    tone: "teal",
  },
  {
    id: "kubernetes-ci",
    icon: "description",
    title: "Kubernetes & CI files",
    description: [
      {
        text: "Automated output of Deployment, Service, Ingress, HPA, ConfigMaps, and hardened GitHub Actions workflows.",
        kind: "text",
      },
    ],
    tone: "teal",
  },
  {
    id: "gitops-deploy",
    icon: "fork_right",
    title: "GitOps deploy",
    description: [
      {
        text: "Argo CD syncs your target cluster straight from Git repositories. Real-time drift detection and rollbacks included.",
        kind: "text",
      },
    ],
    tone: "teal",
  },
];
