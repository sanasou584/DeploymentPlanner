"use client";
import { useToast } from "@/components/toast/toast-provider";
import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import {
  classifyAiAssumption,
} from "@/utils/ai-assumption-status";
import type { Analysis } from "@/types/analysis";
import type {
  PlanComponent,
  PlanComponentType,
} from "@/types/deployment-plan";

import { PLAN_STATUS_DISPLAY } from "@/data/deployment-plan";
import { cn } from "@/utils/class-names";
import { Button } from "@/shared/button";
import { MaterialIcon } from "@/shared/material-icon";

import { DeploymentPlanComponentForm } from "@/components/project-detail/deployment-plan-component-form";
import { KubernetesManifestSection } from "@/components/project-detail/kubernetes-manifest-section";

import {
  useListDeploymentPlansQuery,
  useCreateDeploymentPlanMutation,
  useUpdateDeploymentPlanComponentMutation,
  useApproveDeploymentPlanMutation,
  useRejectDeploymentPlanMutation,
} from "@/hooks/use-deployment-plans";

import {
  useGenerateAiDeploymentPlanMutation,
} from "@/hooks/use-ai-deployment-plan";

import {
  CicdSection,
} from "@/components/project-detail/cicd-section";

interface DeploymentPlanSectionProps {
  projectId: string;
  analysis: Analysis | null;
}

interface AiAssumptions {
  planId: string;
  items: string[];
}

function getApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error !== "object" || error === null) {
    return "An unexpected error occurred.";
  }

  const response = error as {
    data?: {
      error?: {
        message?: string;
        details?: {
          fieldErrors?: Record<string, string[]>;
          formErrors?: string[];
        };
      };
      message?: string;
    };
    error?: string;
    message?: string;
  };

  const apiError = response.data?.error;
  const details = apiError?.details;

  const fieldMessages = Object.entries(
    details?.fieldErrors ?? {},
  ).flatMap(([field, messages]) =>
    messages.map((message) => `${field}: ${message}`),
  );

  const allMessages = [
    ...fieldMessages,
    ...(details?.formErrors ?? []),
  ];

  const mainMessage =
    apiError?.message ??
    response.data?.message ??
    response.message ??
    response.error ??
    "An unexpected error occurred.";

  return allMessages.length > 0
    ? `${mainMessage}: ${allMessages.join("; ")}`
    : mainMessage;
}


function buildInitialComponents(
  analysis: Analysis | null,
): PlanComponent[] {
  if (!analysis || analysis.status !== "COMPLETED") {
    return [];
  }

  return analysis.components.map((component) => {
    const evidence = component.kubernetes;
    const resources = evidence?.resources;

    return {
      name: component.name,
      type: component.type as PlanComponentType,

      containerPort:
        component.type === "WORKER" &&
        evidence?.containerPort == null
          ? null
          : evidence?.containerPort ?? 0,

      servicePort: evidence?.servicePort ?? null,
      targetPort: evidence?.targetPort ?? null,
      image: evidence?.image ?? undefined,
      replicas: 1,

      resources: {
        requests: {
          cpu: resources?.requests.cpu ?? "",
          memory: resources?.requests.memory ?? "",
        },
        limits: {
          cpu: resources?.limits.cpu ?? "",
          memory: resources?.limits.memory ?? "",
        },
      },

      hpa: {
        enabled: false,
      },

      ingress: {
        enabled: false,
        tls: false,
      },
    };
  });
}


const PLACEHOLDER_IMAGE_PATTERNS = [
  /(^|[/:._-])example([/:._-]|$)/i,
  /(^|[/:._-])placeholder([/:._-]|$)/i,
  /(^|[/:._-])changeme([/:._-]|$)/i,
  /(^|[/:._-])your-registry([/:._-]|$)/i,
  /^<.*>$/,
];

function isComponentValid(component: PlanComponent): boolean {
  const { resources, hpa, ingress } = component;

  const validPort =
    (component.type === "WORKER" && component.containerPort === null) ||
    (component.containerPort !== null &&
      Number.isInteger(component.containerPort) &&
      component.containerPort >= 1 &&
      component.containerPort <= 65535);

  const validReplicas =
    Number.isInteger(component.replicas) &&
    component.replicas >= 1;

  const resourcesPresent = [
    resources.requests.cpu,
    resources.requests.memory,
    resources.limits.cpu,
    resources.limits.memory,
  ].every((value) => typeof value === "string" && value.trim().length > 0);

  const validHpa =
    !hpa.enabled ||
    (Number.isInteger(hpa.minReplicas) &&
      Number.isInteger(hpa.maxReplicas) &&
      (hpa.minReplicas ?? 0) >= 1 &&
      (hpa.maxReplicas ?? 0) >= (hpa.minReplicas ?? 0) &&
      Number.isInteger(hpa.targetCpuUtilizationPercent) &&
      (hpa.targetCpuUtilizationPercent ?? 0) >= 1 &&
      (hpa.targetCpuUtilizationPercent ?? 0) <= 100 &&
      (hpa.targetMemoryUtilizationPercent === undefined ||
        (Number.isInteger(hpa.targetMemoryUtilizationPercent) &&
          hpa.targetMemoryUtilizationPercent >= 1 &&
          hpa.targetMemoryUtilizationPercent <= 100)));

  const validIngress = !ingress.enabled || Boolean(ingress.host?.trim());

  return validPort && validReplicas && resourcesPresent && validHpa && validIngress;
}

function getApprovalIssues(components: readonly PlanComponent[]): string[] {
  return components.flatMap((component) => {
    const issues: string[] = [];

    if (!isComponentValid(component)) {
      issues.push(`${component.name}: invalid Kubernetes configuration`);
    }

    const image = component.image?.trim() ?? "";

    if (!image) {
      issues.push(`${component.name}: container image is required`);
    } else {
      if (PLACEHOLDER_IMAGE_PATTERNS.some((pattern) => pattern.test(image))) {
        issues.push(`${component.name}: placeholder Docker image is not allowed`);
      }

      if (/\s/.test(image)) {
        issues.push(`${component.name}: container image contains whitespace`);
      }
    }

    return issues;
  });
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-steel/40 bg-basin p-4">
      <p className="font-mono text-label-sm uppercase text-mist">
        {label}
      </p>

      <p className="mt-2 font-display text-headline-md font-bold text-foam">
        {value}
      </p>
    </div>
  );
}

export function DeploymentPlanSection({
  projectId,
  analysis,
}: DeploymentPlanSectionProps) {
  const toast = useToast();
  const plansQuery = useListDeploymentPlansQuery({
    projectId,
  });

  const [generateAiPlan, generateAiMeta] =
    useGenerateAiDeploymentPlanMutation();

  const [createPlan, createMeta] =
    useCreateDeploymentPlanMutation();

  const [updateComponent, updateMeta] =
    useUpdateDeploymentPlanComponentMutation();

  const [approvePlan, approveMeta] =
    useApproveDeploymentPlanMutation();

  const [rejectPlan, rejectMeta] =
    useRejectDeploymentPlanMutation();

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [manualMode, setManualMode] =
    useState(false);

  const [manualComponents, setManualComponents] =
    useState<PlanComponent[]>([]);

  const [editingName, setEditingName] =
    useState<string | null>(null);

  const [editedComponent, setEditedComponent] =
    useState<PlanComponent | null>(null);

  const [showReject, setShowReject] =
    useState(false);

  const [rejectReason, setRejectReason] =
    useState("");

  const [aiAssumptions, setAiAssumptions] =
    useState<AiAssumptions | null>(null);

  const plans = plansQuery.data?.data ?? [];

  const selectedPlan =
    plans.find((plan) => plan.id === selectedId) ??
    plans[0] ??
    null;

  const completedAnalysis =
    analysis?.status === "COMPLETED"
      ? analysis
      : null;

  const isBusy =
    generateAiMeta.isLoading ||
    createMeta.isLoading ||
    updateMeta.isLoading ||
    approveMeta.isLoading ||
    rejectMeta.isLoading;

  const manualValid =
    manualComponents.length > 0 &&
    manualComponents.every((component) => isComponentValid(component));

  const approvalIssues = selectedPlan
    ? getApprovalIssues(selectedPlan.components)
    : [];

  const selectedAssumptions =
    aiAssumptions && selectedPlan && aiAssumptions.planId === selectedPlan.id
      ? aiAssumptions.items
      : [];

  function showError(error: unknown, title: string) {
    toast.push({
      tone: "crimson",
      title,
      message: getApiError(error),
    });
  }

  function resetEditing() {
    setEditingName(null);
    setEditedComponent(null);
  }

  function selectPlan(planId: string) {
    setSelectedId(planId);
    setManualMode(false);
    setShowReject(false);
    setRejectReason("");
    resetEditing();
  }

  function startManualCreation() {
    if (!completedAnalysis || isBusy) {
      return;
    }

    setManualComponents(
      buildInitialComponents(completedAnalysis),
    );

    setManualMode(true);
    resetEditing();
  }

  function updateManualComponent(component: PlanComponent) {
    setManualComponents((current) =>
      current.map((item) =>
        item.name === component.name
          ? component
          : item,
      ),
    );
  }

  async function handleGenerateAiPlan() {
    if (!completedAnalysis || isBusy) {
      return;
    }

    setAiAssumptions(null);
    setManualMode(false);
    resetEditing();

    try {
      const result = await generateAiPlan({
        projectId,
        analysisId: completedAnalysis.id,
      }).unwrap();

      setSelectedId(result.data.id);

      setAiAssumptions({
        planId: result.data.id,
        items: result.assumptions ?? [],
      });

      toast.push({
        tone: "mint",
        title: `AI Deployment Plan v${result.data.version} generated`,
        message: "Review the Kubernetes configuration before approval.",
      });
    } catch (error) {
      showError(error, "AI generation failed");
    }
  }

  async function handleCreateManualPlan() {
    if (
      !completedAnalysis ||
      !manualValid ||
      isBusy
    ) {
      return;
    }

    try {
      const result = await createPlan({
        projectId,
        body: {
          analysisId: completedAnalysis.id,
          components: manualComponents,
        },
      }).unwrap();

      setSelectedId(result.data.id);
      setManualMode(false);
      setManualComponents([]);

      toast.push({
        tone: "mint",
        title: "Deployment plan created",
        message: `Deployment Plan v${result.data.version} created as draft.`,
      });
    } catch (error) {
      showError(error, "Manual plan creation failed");
    }
  }

  function startEditingComponent(component: PlanComponent) {
    if (
      !selectedPlan ||
      selectedPlan.status !== "DRAFT" ||
      isBusy
    ) {
      return;
    }

    setEditingName(component.name);
    setEditedComponent(structuredClone(component));
  }

  async function handleSaveComponent() {
    if (
      !selectedPlan ||
      selectedPlan.status !== "DRAFT" ||
      !editingName ||
      !editedComponent ||
      !isComponentValid(editedComponent) ||
      isBusy
    ) {
      return;
    }

    try {
      await updateComponent({
        projectId,
        planId: selectedPlan.id,
        name: editingName,
        body: {
          containerPort: editedComponent.containerPort,
          servicePort: editedComponent.servicePort ?? null,
          targetPort: editedComponent.targetPort ?? null,
          image: editedComponent.image?.trim() ?? "",
          replicas: editedComponent.replicas,
          resources: editedComponent.resources,
          hpa: editedComponent.hpa,
          ingress: editedComponent.ingress,
        },
      }).unwrap();

      resetEditing();

      toast.push({
        tone: "mint",
        title: "Component updated",
        message: `Component ${editingName} updated successfully.`,
      });
    } catch (error) {
      showError(error, "Component update failed");
    }
  }

  async function handleApprovePlan() {
    if (
      !selectedPlan ||
      selectedPlan.status !== "DRAFT" ||
      editingName !== null ||
      approvalIssues.length > 0 ||
      isBusy
    ) {
      return;
    }

    try {
      const result = await approvePlan({
        projectId,
        planId: selectedPlan.id,
      }).unwrap();

      if (result.data.status !== "APPROVED") {
        throw new Error("The server did not confirm plan approval.");
      }

      setShowReject(false);
      setRejectReason("");
      resetEditing();

      toast.push({
        tone: "mint",
        title: "Deployment plan approved",
        message: `Deployment Plan v${result.data.version} is ready for Kubernetes manifest generation.`,
      });
    } catch (error) {
      showError(error, "Approval failed");
    }
  }

  async function handleRejectPlan() {
    if (
      !selectedPlan ||
      selectedPlan.status !== "DRAFT" ||
      !rejectReason.trim() ||
      isBusy
    ) {
      return;
    }

    try {
      await rejectPlan({
        projectId,
        planId: selectedPlan.id,
        reason: rejectReason.trim(),
      }).unwrap();

      setShowReject(false);
      setRejectReason("");
      resetEditing();

      toast.push({
        tone: "champagne",
        title: "Deployment plan rejected",
        message: `Deployment Plan v${selectedPlan.version} rejected.`,
      });
    } catch (error) {
      showError(error, "Rejection failed");
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-headline-md font-semibold text-foam">
              AI Deployment Plans
            </h2>

            <p className="mt-1 font-display text-body-sm text-mist">
              Generate Kubernetes configurations using AI,
              review the proposed resources and approve
              your deployment plan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => void handleGenerateAiPlan()}
              disabled={!completedAnalysis || isBusy}
              className="h-10 gap-2 px-5"
            >
              <MaterialIcon
                name={
                  generateAiMeta.isLoading
                    ? "progress_activity"
                    : "auto_awesome"
                }
                className={cn(
                  "text-[18px]",
                  generateAiMeta.isLoading && "animate-spin",
                )}
              />

              {generateAiMeta.isLoading
                ? "Generating AI plan..."
                : "Generate AI Plan"}
            </Button>

            <Button
              variant="teal"
              disabled={!completedAnalysis || isBusy}
              onClick={startManualCreation}
              className="h-10 gap-2 px-5"
            >
              <MaterialIcon
                name="edit"
                className="text-[18px]"
              />
              Manual configuration
            </Button>
          </div>
        </div>

        {generateAiMeta.isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-4 rounded-2xl border border-ice/40 bg-ice/5 p-5"
          >
            <MaterialIcon
              name="progress_activity"
              className="animate-spin text-[24px] text-ice"
            />

            <div>
              <h3 className="font-display text-body-md font-semibold text-foam">
                Generating your deployment plan
              </h3>

              <p className="mt-1 font-display text-body-sm text-mist">
                Groq is analyzing the detected stack,
                accepted recommendations and Kubernetes
                resource requirements.
              </p>
            </div>
          </div>
        ) : null}

        {plansQuery.isLoading ? (
          <p
            role="status"
            className="font-display text-body-md text-mist"
          >
            Loading deployment plans...
          </p>
        ) : null}

        {plansQuery.isError ? (
          <div
            role="alert"
            className="rounded-xl border border-crimson/40 bg-crimson/10 p-4"
          >
            <p className="font-display text-body-md text-crimson">
              Could not load deployment plans.
            </p>

            <button
              type="button"
              onClick={() => void plansQuery.refetch()}
              className="mt-2 font-display text-body-sm text-ice hover:underline"
            >
              Retry
            </button>
          </div>
        ) : null}

        {!completedAnalysis ? (
          <div className="rounded-xl border border-champagne/40 bg-champagne/10 p-4">
            <p className="font-display text-body-md text-champagne">
              A completed GitHub analysis is required
              before generating a deployment plan.
            </p>
          </div>
        ) : null}

        {manualMode ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-5"
          >
            <div className="rounded-2xl border border-steel bg-basin p-5">
              <h3 className="font-display text-headline-sm font-semibold text-foam">
                Manual Deployment Plan
              </h3>

              <p className="mt-2 font-display text-body-sm text-mist">
                Configure every detected component manually.
                AI generation is the recommended default.
              </p>

              <p className="mt-2 font-mono text-label-sm text-ice">
                Analysis #{completedAnalysis?.number ?? "-"}
              </p>
            </div>

            {manualComponents.length === 0 ? (
              <p className="font-display text-body-md text-champagne">
                No deployable components were detected.
              </p>
            ) : null}

            {manualComponents.map((component) => (
              <DeploymentPlanComponentForm
                key={component.name}
                component={component}
                onChange={updateManualComponent}
                disabled={isBusy}
              />
            ))}

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="champagne"
                disabled={isBusy}
                onClick={() => setManualMode(false)}
                className="h-10 px-5"
              >
                Cancel
              </Button>

              <Button
                disabled={!manualValid || isBusy}
                onClick={() =>
                  void handleCreateManualPlan()
                }
                className="h-10 gap-2 px-5"
              >
                <MaterialIcon
                  name="save"
                  className="text-[18px]"
                />

                {createMeta.isLoading
                  ? "Creating..."
                  : "Create draft"}
              </Button>
            </div>
          </motion.div>
        ) : (
          <>
            {plans.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {plans.map((plan) => {
                  const status =
                    PLAN_STATUS_DISPLAY[plan.status];

                  const isSelected =
                    selectedPlan?.id === plan.id;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => selectPlan(plan.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                        isSelected
                          ? "border-ice bg-ice/10"
                          : "border-steel/50 bg-basin hover:border-teal",
                      )}
                    >
                      <span className="font-mono text-code-md text-foam">
                        Version {plan.version}
                      </span>

                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 font-mono text-label-sm uppercase",
                          status.className,
                        )}
                      >
                        {status.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {selectedPlan ? (
              <div className="flex flex-col gap-5">
                <div className="rounded-2xl border border-steel bg-panel p-6 shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-headline-md font-semibold text-foam">
                        Deployment Plan v{selectedPlan.version}
                      </h3>

                      <p className="mt-2 font-mono text-label-sm text-mist">
                        Analysis linked to deployment configuration
                      </p>

                      <p className="mt-2 font-mono text-label-sm text-ice">
                        {selectedPlan.components.length} components
                        {" · "}
                        {selectedPlan.recommendations.length} accepted recommendations
                      </p>
                    </div>

                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 font-mono text-label-sm uppercase",
                        PLAN_STATUS_DISPLAY[
                          selectedPlan.status
                        ].className,
                      )}
                    >
                      {
                        PLAN_STATUS_DISPLAY[
                          selectedPlan.status
                        ].label
                      }
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <StatCard
                      label="Components"
                      value={selectedPlan.components.length}
                    />

                    <StatCard
                      label="Total replicas"
                      value={selectedPlan.components.reduce(
                        (sum, component) =>
                          sum + component.replicas,
                        0,
                      )}
                    />

                    <StatCard
                      label="Recommendations"
                      value={selectedPlan.recommendations.length}
                    />
                  </div>
                </div>

                                {selectedAssumptions.length > 0 ? (
                  <div className="rounded-2xl border border-steel/50 bg-basin p-5">
                    <div className="flex items-center gap-3">
                      <MaterialIcon
                        name="info"
                        className="text-[22px] text-ice"
                      />

                      <h3 className="font-display text-body-md font-semibold text-foam">
                        {selectedPlan.status === "APPROVED"
                          ? "AI assumptions — review history"
                          : "AI assumptions — verify before approval"}
                      </h3>
                    </div>

                    <p className="mt-2 font-display text-body-sm text-mist">
                      {selectedPlan.status === "APPROVED"
                        ? "This history records assumptions made during plan generation. Approval does not guarantee runtime verification."
                        : "Review the assumptions and configuration evidence before approving this plan."}
                    </p>

                    <ul className="mt-4 space-y-3">
                      {selectedAssumptions.map(
                        (assumption, index) => {
                          const assessment =
                            classifyAiAssumption(
                              assumption,
                              selectedPlan.components,
                            );

                          return (
                            <li
                              key={`${index}-${assumption}`}
                              className="rounded-xl border border-steel/40 bg-abyss p-3"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={
                                    assessment.status === "ALIGNED"
                                      ? "rounded-lg border border-mint/40 px-2 py-1 text-label-sm text-mint"
                                      : "rounded-lg border border-champagne/40 px-2 py-1 text-label-sm text-champagne"
                                  }
                                >
                                  {assessment.status === "ALIGNED"
                                    ? "Configuration aligned"
                                    : "Review required"}
                                </span>
                              </div>

                              <p className="mt-2 font-display text-body-sm text-foam">
                                {assessment.text}
                              </p>

                              <p className="mt-2 font-display text-label-sm text-mist">
                                {assessment.explanation}
                              </p>
                            </li>
                          );
                        },
                      )}
                    </ul>
                  </div>
                ) : null}

                {selectedPlan.components.map((component) => {
                  const isEditing =
                    selectedPlan.status === "DRAFT" &&
                    editingName === component.name &&
                    editedComponent !== null;

                  const displayedComponent =
                    isEditing && editedComponent
                      ? editedComponent
                      : component;

                  return (
                    <div
                      key={component.name}
                      className="flex flex-col gap-3"
                    >
                      <DeploymentPlanComponentForm
                        component={displayedComponent}
                        onChange={setEditedComponent}
                        disabled={!isEditing || isBusy}
                      />

                      {selectedPlan.status === "DRAFT" ? (
                        <div className="flex flex-wrap justify-end gap-3">
                          {isEditing ? (
                            <>
                              <Button
                                variant="champagne"
                                onClick={resetEditing}
                                disabled={isBusy}
                                className="h-9 px-4"
                              >
                                Cancel
                              </Button>

                              <Button
                                disabled={
                                  isBusy ||
                                  !isComponentValid(
                                    displayedComponent,
                                  )
                                }
                                onClick={() =>
                                  void handleSaveComponent()
                                }
                                className="h-9 gap-2 px-4"
                              >
                                <MaterialIcon
                                  name="save"
                                  className="text-[16px]"
                                />

                                {updateMeta.isLoading
                                  ? "Saving..."
                                  : "Save component"}
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="teal"
                              disabled={isBusy}
                              onClick={() =>
                                startEditingComponent(component)
                              }
                              className="h-9 gap-2 px-4"
                            >
                              <MaterialIcon
                                name="edit"
                                className="text-[16px]"
                              />
                              Edit component
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                <CicdSection
                  key={`cicd-${selectedPlan.id}`}
                  projectId={projectId}
                  planId={selectedPlan.id}
                  approved={selectedPlan.status === "APPROVED"}
                />
                <KubernetesManifestSection
                  key={selectedPlan.id}
                  projectId={projectId}
                  planId={selectedPlan.id}
                  approved={selectedPlan.status === "APPROVED"}
                />
                {selectedPlan.review?.reason ? (
                  <div className="rounded-xl border border-crimson/40 bg-crimson/10 p-5">
                    <h3 className="font-display text-body-md font-semibold text-crimson">
                      Rejection reason
                    </h3>

                    <p className="mt-2 font-display text-body-md text-foam">
                      {selectedPlan.review.reason}
                    </p>
                  </div>
                ) : null}

                {selectedPlan.status === "DRAFT" ? (
                  <div className="rounded-2xl border border-steel bg-basin p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-display text-headline-sm font-semibold text-foam">
                          Human validation
                        </h3>

                        <p className="mt-2 font-display text-body-sm text-mist">
                          Verify the proposed Kubernetes
                          configuration before approving the plan.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="champagne"
                          disabled={isBusy}
                          onClick={() =>
                            setShowReject((value) => !value)
                          }
                          className="h-10 px-5"
                        >
                          Reject plan
                        </Button>

                        <Button
                          disabled={
                            isBusy ||
                            editingName !== null ||
                            approvalIssues.length > 0
                          }
                          onClick={() => void handleApprovePlan()}
                          className="h-10 gap-2 px-5"
                        >
                          <MaterialIcon
                            name={approveMeta.isLoading ? "progress_activity" : "check_circle"}
                            className={cn(
                              "text-[18px]",
                              approveMeta.isLoading && "animate-spin",
                            )}
                          />
                          {approveMeta.isLoading ? "Approving..." : "Approve plan"}
                        </Button>
                      </div>
                    </div>

                    {approvalIssues.length > 0 ? (
                      <div role="alert" className="mt-5 rounded-xl border border-champagne/40 bg-champagne/10 p-4">
                        <p className="font-display text-body-sm font-semibold text-champagne">
                          Deployment plan is not ready for approval.
                        </p>
                        <ul className="mt-3 list-disc space-y-1 pl-5">
                          {approvalIssues.map((issue) => (
                            <li key={issue} className="font-display text-body-sm text-foam">
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {showReject ? (
                      <div className="mt-5 flex flex-col gap-3 border-t border-steel/40 pt-5">
                        <label
                          htmlFor="deployment-plan-reject-reason"
                          className="font-display text-body-sm text-mist"
                        >
                          Rejection reason
                        </label>

                        <textarea
                          id="deployment-plan-reject-reason"
                          value={rejectReason}
                          onChange={(event) =>
                            setRejectReason(
                              event.target.value,
                            )
                          }
                          maxLength={1000}
                          rows={3}
                          placeholder="Explain why this deployment plan should be rejected"
                          className="w-full rounded-xl border border-steel/50 bg-panel p-3 font-display text-body-md text-foam outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                        />

                        <div className="flex justify-end">
                          <Button
                            variant="champagne"
                            disabled={
                              !rejectReason.trim() ||
                              isBusy
                            }
                            onClick={() =>
                              void handleRejectPlan()
                            }
                            className="h-9 px-5"
                          >
                            {rejectMeta.isLoading
                              ? "Rejecting..."
                              : "Confirm rejection"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : !plansQuery.isLoading &&
              !plansQuery.isError ? (
              <div className="rounded-2xl border border-steel bg-panel p-8 text-center">
                <MaterialIcon
                  name="description"
                  className="text-[36px] text-mist"
                />

                <h3 className="mt-3 font-display text-headline-sm font-semibold text-foam">
                  No deployment plans yet
                </h3>

                <p className="mx-auto mt-2 max-w-lg font-display text-body-md text-mist">
                  Generate a deployment plan automatically
                  using AI. Groq will propose Kubernetes
                  resources based on your repository analysis.
                </p>

                {completedAnalysis ? (
                  <Button
                    disabled={isBusy}
                    onClick={() =>
                      void handleGenerateAiPlan()
                    }
                    className="mt-5 gap-2 px-6 py-2.5"
                  >
                    <MaterialIcon
                      name="auto_awesome"
                      className="text-[18px]"
                    />
                    Generate AI Plan
                  </Button>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </MotionConfig>
  );
}