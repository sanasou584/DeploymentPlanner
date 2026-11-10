
import type { DeploymentPlan } from "@/types/deployment-plan";

export interface AiGeneratedPlanResponse {
  message: string;
  data: DeploymentPlan;
  assumptions: string[];
}
