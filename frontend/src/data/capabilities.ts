import type { FeaturePill } from "@/types/pill";

export const REQUEST_ACCESS_PILL: FeaturePill = {
  id: "request-access",
  label: "Request access",
  icon: "auto_awesome",
  iconTone: "lavender",
  iconFill: true,
};

export const AI_BADGE_PILL: FeaturePill = {
  id: "ai-powered",
  label: "AI-powered deployments",
  icon: "auto_awesome",
  iconTone: "lavender",
  iconFill: true,
};

export const CAPABILITY_PILLS: FeaturePill[] = [
  { id: "repository-analysis", label: "Repository analysis", icon: "terminal" },
  {
    id: "ai-plan",
    label: "AI deployment plan",
    icon: "auto_awesome",
    iconTone: "lavender",
    iconFill: true,
  },
  { id: "gitops", label: "GitOps deploy", icon: "rocket" },
];
