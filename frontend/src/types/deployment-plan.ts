
export type PlanStatus =
  | "DRAFT"
  | "APPROVED"
  | "REJECTED"
  | "SUPERSEDED";

export type PlanComponentType =
  | "FRONTEND"
  | "BACKEND"
  | "DATABASE"
  | "WORKER"
  | "OTHER";

export interface PlanResourceQuantity {
  cpu: string;
  memory: string;
}

export interface PlanResources {
  requests: PlanResourceQuantity;
  limits: PlanResourceQuantity;
}

export interface PlanHpa {
  enabled: boolean;
  minReplicas?: number;
  maxReplicas?: number;
  targetCpuUtilizationPercent?: number;
  targetMemoryUtilizationPercent?: number;
}

export interface PlanIngress {
  enabled: boolean;
  host?: string;
  path?: string;
  tls: boolean;
}

export interface PlanComponent {
  name: string;
  type: PlanComponentType;
  containerPort: number | null;
  servicePort?: number | null;
  targetPort?: number | string | null;
  image?: string;
  replicas: number;
  resources: PlanResources;
  hpa: PlanHpa;
  ingress: PlanIngress;
}

export interface PlanReview {
  decidedBy: string;
  decidedAt: string;
  reason?: string;
}

export interface DeploymentPlan {
  id: string;
  project: string;
  analysis: string;
  version: number;
  previousPlan?: string;
  status: PlanStatus;
  components: PlanComponent[];
  recommendations: string[];
  createdBy: string;
  review?: PlanReview;
  totalReplicas?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeploymentPlanBody {
  analysisId: string;
  components: PlanComponent[];
}

export type UpdatePlanComponentBody = Partial<
  Omit<PlanComponent, "name">
>;

export interface DeploymentPlanResponse {
  message: string;
  data: DeploymentPlan;
}

export interface DeploymentPlanListResponse {
  message: string;
  data: DeploymentPlan[];
}
