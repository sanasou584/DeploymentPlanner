
import type {
  PlanComponent,
} from "@/types/deployment-plan";

export interface AssumptionStatus {
  text: string;
  status: "ALIGNED" | "REVIEW_REQUIRED";
  explanation: string;
}

export function classifyAiAssumption(
  assumption: string,
  components: readonly PlanComponent[],
): AssumptionStatus {
  const portMatch = assumption.match(
    /^(.+?): container port (\d+) inferred from generated Dockerfile/i,
  );

  if (portMatch) {
    const componentName = portMatch[1]?.trim();
    const expectedPort = Number(portMatch[2]);

    const component = components.find(
      (item) =>
        item.name.toLowerCase() ===
        componentName?.toLowerCase(),
    );

    if (
      component &&
      component.containerPort === expectedPort &&
      (
        component.targetPort == null ||
        component.targetPort === expectedPort
      )
    ) {
      return {
        text: assumption,
        status: "ALIGNED",
        explanation:
          "The approved plan matches the port inferred from the generated Dockerfile. Runtime verification is still required.",
      };
    }
  }

  return {
    text: assumption,
    status: "REVIEW_REQUIRED",
    explanation:
      "Historical AI assumption. Approval does not independently verify this technical condition.",
  };
}
