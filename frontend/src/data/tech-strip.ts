import type { TechTool } from "@/types/landing";

export const TECH_STRIP_LABEL = "Works with the tools you already use";

export const TECH_TOOLS: TechTool[] = [
  { id: "github", label: "GitHub", icon: "code" },
  { id: "docker", label: "Docker", icon: "layers" },
  { id: "kubernetes", label: "Kubernetes", icon: "token" },
  { id: "github-actions", label: "GitHub Actions", icon: "play_circle" },
  { id: "argo-cd", label: "Argo CD", icon: "sync_alt" },
  { id: "minikube", label: "Minikube", icon: "view_in_ar" },
  { id: "n8n", label: "n8n", icon: "hub" },
];
