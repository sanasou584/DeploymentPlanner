
import type {
  PlanComponentType,
  PlanStatus,
} from "@/types/deployment-plan";

export const PLAN_STATUS_DISPLAY: Record<
  PlanStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "border-ice/40 bg-ice/10 text-ice",
  },
  APPROVED: {
    label: "Approved",
    className: "border-mint/40 bg-mint/10 text-mint",
  },
  REJECTED: {
    label: "Rejected",
    className: "border-crimson/40 bg-crimson/10 text-crimson",
  },
  SUPERSEDED: {
    label: "Superseded",
    className: "border-steel bg-surface-high text-mist",
  },
};

export const PLAN_COMPONENT_LABELS: Record<
  PlanComponentType,
  string
> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  DATABASE: "Database",
  WORKER: "Worker",
  OTHER: "Other",
};

export const PLAN_FORM_LABELS = {
  containerPort: "Container port",
  image: "Container image",
  replicas: "Replicas",
  requestCpu: "Requested CPU",
  requestMemory: "Requested memory",
  limitCpu: "CPU limit",
  limitMemory: "Memory limit",
  hpa: "Horizontal Pod Autoscaler",
  ingress: "Ingress",
} as const;
