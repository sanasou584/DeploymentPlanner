import type {
  ArgoSatelliteRow,
  HeroBadge,
  HeroCta,
  HeroHeadline,
  PlanWindow,
  ReplicasSatelliteRow,
  ServiceTab,
} from "@/types/landing";

export const HERO_BADGE: HeroBadge = {
  id: "ai-powered",
  icon: "auto_awesome",
  label: "AI-powered deployment planning",
};

export const HERO_HEADLINE: HeroHeadline = {
  main: "Ship to Kubernetes",
  accent: "without the headache",
};

export const HERO_SUBTITLE =
  "Connect your GitHub repository. DeploymentPlanner AI analyzes your stack, builds a deployment plan, generates Kubernetes and CI files, and deploys with GitOps, after you approve every decision.";

export const HERO_CTAS: HeroCta[] = [
  {
    id: "get-started",
    label: "Get started free",
    href: "/signup",
    kind: "ice",
    icon: "arrow_forward",
  },
  {
    id: "github-connect",
    label: "Continue with GitHub",
    href: "/login",
    kind: "teal-outline",
    icon: "terminal",
  },
];

export const HERO_REASSURANCE: HeroBadge = {
  id: "human-validation",
  icon: "verified_user",
  label: "Human validation before every deployment",
};

export const SERVICE_TABS: ServiceTab[] = [
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "database", label: "Database" },
];

export const REPLICA_SATELLITE: ReplicasSatelliteRow = {
  id: "replicas",
  ariaLabel: "Replica validation passed",
  float: { path: [-5, 5, -5], duration: 5 },
  codeLabel: "$ replicas:",
  codeValue: "3",
  tag: "Valid",
};

export const ARGO_SATELLITE: ArgoSatelliteRow = {
  id: "argo",
  ariaLabel: "Argo CD sync status",
  float: { path: [4, -6, 4], duration: 6 },
  icon: "sync",
  title: "Argo CD",
  status: "Synced · Healthy",
};

export const PLAN_WINDOW: PlanWindow = {
  id: "plan-preview",
  title: "Deployment Plan · shopflow-store",
  metrics: [
    { id: "replicas", label: "Replicas", value: "3" },
    { id: "cpu-limit", label: "CPU Limit", value: "250m" },
    { id: "memory", label: "Memory", value: "512Mi" },
  ],
  hpa: {
    id: "hpa",
    icon: "tune",
    label: "Auto-scaling (HPA)",
    meta: "Target CPU: 70% · Min 2 · Max 8",
  },
  aiChip: {
    id: "ai-chip",
    icon: "auto_awesome",
    label: "AI suggested: Ingress with TLS & health probe v2",
  },
  riskLabel: "Risk: Low",
  approveLabel: "Approve plan",
  rejectLabel: "Reject",
};
