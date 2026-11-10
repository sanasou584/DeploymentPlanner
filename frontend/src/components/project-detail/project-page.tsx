"use client";

import { Suspense } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import { AnimatePresence } from "motion/react";
import { useToast } from "@/components/toast/toast-provider";
import {
  useGetProjectQuery,
  useListAnalysesQuery,
  useGetAnalysisQuery,
  useLaunchAnalysisMutation,
} from "@/store/analyses-api";
import { useConnectProjectRepositoryMutation, useVerifyProjectRepositoryMutation, useUpdateProjectMutation, useDeleteProjectMutation } from "@/store/projects-api";
import type { Analysis } from "@/types/analysis";
import type { Project as ProjectType } from "@/types/project";
import { ProjectHeader, type ProjectTab } from "@/components/project-detail/project-header";
import { RepositoryCard } from "@/components/project-detail/repository-card";
import { PipelineStepper } from "@/components/project-detail/pipeline-stepper";
import { RecentAnalyses } from "@/components/project-detail/recent-analyses";
import { AnalysisSummary } from "@/components/project-detail/analysis-summary";
import { AnalysesTable } from "@/components/project-detail/analyses-table";
import { RecommendationFilters } from "@/components/project-detail/recommendation-filters";
import { RecommendationCard } from "@/components/project-detail/recommendation-card";
import { DeploymentPlanSection } from "@/components/project-detail/deployment-plan-section";
import { EditProjectModal } from "@/components/project-detail/edit-project-modal";
import { UpdateRepositoryModal } from "@/components/project-detail/update-repository-modal";
import { DeleteProjectModal } from "@/components/dashboard/delete-project-modal";
import { useListRecommendationsQuery, useRunAuditMutation, useAcceptRecommendationMutation, useRejectRecommendationMutation, useLaunchAiAuditMutation } from "@/store/analyses-api";
import type { Recommendation } from "@/types/analysis";
import { Button } from "@/shared/button";
import { MaterialIcon } from "@/shared/material-icon";

function ProjectDetailInner() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  const tabParam = (searchParams.get("tab") ?? "overview") as ProjectTab;
  const tab: ProjectTab = [
  "overview",
  "analyses",
  "recommendations",
  "plans",
].includes(tabParam)
  ? tabParam
  : "overview";
  const analysisParam = searchParams.get("analysis");

  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [repoOpen, setRepoOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const notifiedAnalysisIds = useRef<Set<string>>(new Set());
  const projectQuery = useGetProjectQuery({ id }, { skip: !id });
  const analysesQuery = useListAnalysesQuery({ projectId: id, page, limit: 50 }, { skip: !id });
  const recentQuery = useListAnalysesQuery({ projectId: id, page: 1, limit: 4 }, { skip: !id });

  const [launchAnalysis, launchMeta] = useLaunchAnalysisMutation();
  const [connectRepo, connectMeta] = useConnectProjectRepositoryMutation();
  const [verifyRepo, verifyMeta] = useVerifyProjectRepositoryMutation();
  const [updateProject, updateMeta] = useUpdateProjectMutation();
  const [deleteProject, deleteMeta] = useDeleteProjectMutation();

  const project = projectQuery.data?.data as ProjectType | undefined;
  const analyses = analysesQuery.data?.data ?? [];
  const pagination = analysesQuery.data?.pagination;
  const recent = recentQuery.data?.data ?? [];

  const latest = analyses[0] ?? null;
  const selectedId = analysisParam ?? latest?.id ?? null;
  const selectedAnalysis = analyses.find((a) => a.id === selectedId) ?? null;

  const polled = useGetAnalysisQuery(
    { projectId: id, analysisId: runningId ?? "" },
    { skip: !runningId, pollingInterval: runningId ? 3000 : 0, skipPollingIfUnfocused: true },
  );

  useEffect(() => {
  if (!runningId || !polled.data) return;

  const analysis = polled.data.data;

  if (analysis.id !== runningId) return;

  const isCompleted = analysis.status === "COMPLETED";
  const isFailed = analysis.status === "FAILED";

  if (!isCompleted && !isFailed) return;

  if (notifiedAnalysisIds.current.has(analysis.id)) return;

  notifiedAnalysisIds.current.add(analysis.id);

  toast.push({
    tone: isCompleted ? "mint" : "crimson",
    title: `Analysis #${analysis.number} ${
      isCompleted ? "completed" : "failed"
    }`,
    message: isCompleted
      ? "Results are ready to review."
      : analysis.error?.message ?? "The analysis could not finish.",
  });

  void analysesQuery.refetch();
  void recentQuery.refetch();

  window.setTimeout(() => {
    setRunningId((current) =>
      current === analysis.id ? null : current
    );
  }, 0);
}, [
  runningId,
  polled.data,
  toast.push,
  analysesQuery.refetch,
  recentQuery.refetch,
]);

  const latestId = latest?.id;
const latestStatus = latest?.status;

useEffect(() => {
  if (!latestId) return;

  if (latestStatus !== "PENDING" && latestStatus !== "RUNNING") {
    return;
  }

  const timeoutId = window.setTimeout(() => {
    setRunningId((current) => current ?? latestId);
  }, 0);

  return () => window.clearTimeout(timeoutId);
}, [latestId, latestStatus]);

  const setTab = (next: ProjectTab) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", next);
    router.replace(`/projects/${id}?${sp.toString()}`, { scroll: false });
  };

  const selectAnalysis = (aid: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("analysis", aid);
    if (!sp.get("tab")) sp.set("tab", "overview");
    router.replace(`/projects/${id}?${sp.toString()}`, { scroll: false });
  };

  async function handleRunAnalysis() {
    if (launchMeta.isLoading) return;
    try {
      const res = await launchAnalysis({ projectId: id }).unwrap();
      const a = res.data;
      setRunningId(a.id);
      toast.push({ tone: "ice", title: "Analysis started", message: `Analysis #${a.number} is running.` });
      analysesQuery.refetch();
      recentQuery.refetch();
    } catch (err) {
      const e = err as { data?: { error?: { code?: string; message?: string } } };
      const code = e?.data?.error?.code;
      const message = e?.data?.error?.message;
      if (code === "CONFLICT") {
        if (latest) setRunningId(latest.id);
        toast.push({ tone: "champagne", title: "Analysis in progress", message: "An analysis is already running for this project." });
      } else if (code === "INVARIANT_VIOLATION") {
        toast.push({ tone: "crimson", title: "Cannot run analysis", message: message ?? "Repository is not verified or workflow is unreachable." });
      } else {
        toast.push({ tone: "crimson", title: "Could not start analysis", message: message ?? "Try again in a moment." });
      }
    }
  }

  async function handleReverify(): Promise<boolean> {
    if (!project) return false;
    try {
      await verifyRepo({ id: project.id }).unwrap();
      toast.push({ tone: "mint", title: "Repository re-verified", message: "Status updated." });
      projectQuery.refetch();
      return true;
    } catch (err) {
      const e = err as { data?: { error?: { message?: string } } };
      toast.push({ tone: "crimson", title: "Re-verify failed", message: e?.data?.error?.message ?? "Could not reach GitHub." });
      return false;
    }
  }

  async function handleUpdateRepo(body: { url: string; branch: string }) {
    if (!project) return { kind: "failed" as const };
    try {
      const res = await connectRepo({ id: project.id, body }).unwrap();
      const r = res.data.repository;
      projectQuery.refetch();
      if (r && !r.isValid) {
        return { kind: "unverifiable" as const, message: r.lastVerificationError ?? undefined };
      }
      toast.push({ tone: "mint", title: "Repository updated", message: "Verification passed." });
      return { kind: "success" as const };
    } catch (err) {
      const e = err as { data?: { error?: { code?: string; message?: string; details?: { fieldErrors?: Record<string, string[]> } } } };
      const code = e?.data?.error?.code;
      if (code === "VALIDATION_ERROR") {
        const fe = e?.data?.error?.details?.fieldErrors;
        return { kind: "invalid" as const, fieldErrors: fe, message: e?.data?.error?.message };
      }
      return { kind: "failed" as const, message: e?.data?.error?.message };
    }
  }

  async function handleEditProject(values: { name: string; description: string }) {
    if (!project) return { kind: "failed" as const };
    try {
      await updateProject({ id: project.id, body: values }).unwrap();
      projectQuery.refetch();
      toast.push({ tone: "mint", title: "Project updated", message: "Changes saved." });
      return { kind: "success" as const };
    } catch (err) {
      const e = err as { data?: { error?: { code?: string; message?: string; details?: { fieldErrors?: Record<string, string[]> } } } };
      const code = e?.data?.error?.code;
      if (code === "CONFLICT") return { kind: "conflict" as const };
      if (code === "VALIDATION_ERROR") {
        return { kind: "invalid" as const, fieldErrors: e?.data?.error?.details?.fieldErrors, message: e?.data?.error?.message };
      }
      return { kind: "failed" as const, message: e?.data?.error?.message };
    }
  }

  async function handleDeleteProject() {
    if (!project) return;
    try {
      await deleteProject({ id: project.id }).unwrap();
      toast.push({ tone: "mint", title: "Project deleted", message: "Redirecting to projects." });
      router.push("/projects");
    } catch (err) {
      const e = err as { data?: { error?: { message?: string } } };
      toast.push({ tone: "crimson", title: "Delete failed", message: e?.data?.error?.message ?? "Could not delete." });
    }
  }

  if (projectQuery.isLoading) {
    return <div className="p-8 text-mist">Loading project…</div>;
  }
  if (projectQuery.isError) {
    const status = (projectQuery.error as { status?: number })?.status;
    if (status === 404) {
      return (
        <div className="p-8">
          <p className="font-display text-headline-md text-foam">Project not found</p>
          <p className="mt-2 font-display text-body-md text-mist">No project matches “{id}”.</p>
          <Link href="/projects" className="mt-4 inline-block font-display text-body-md text-ice hover:underline">Back to projects</Link>
        </div>
      );
    }
    return (
      <div className="p-8">
        <p className="font-display text-headline-md text-foam">Could not load project</p>
        <p className="mt-2 font-display text-body-md text-mist">{extractMessage(projectQuery.error)}</p>
        <button type="button" onClick={() => projectQuery.refetch()} className="mt-4 font-display text-body-md text-ice hover:underline">Retry</button>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="p-8">
        <p className="font-display text-headline-md text-foam">Project not found</p>
        <Link href="/projects" className="mt-4 inline-block font-display text-body-md text-ice hover:underline">Back to projects</Link>
      </div>
    );
  }

  const invalidRepo = !project.repository || !project.repository.isValid;

  // recommendations for selected/completed analysis
  const analysisForRecs = (selectedAnalysis && selectedAnalysis.status === "COMPLETED") ? selectedAnalysis : (latest && latest.status === "COMPLETED" ? latest : null);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex w-full flex-col gap-6 p-8">
        <ProjectHeader
          project={project}
          tab={tab}
          tabCounts={{ analyses: pagination?.total ?? analyses.length }}
          onTab={setTab}
          onRun={handleRunAnalysis}
          running={!!runningId}
          launchPending={launchMeta.isLoading}
          invalidRepo={invalidRepo}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-steel px-4 py-2 font-display text-body-sm text-foam hover:border-teal"
            >
              <MaterialIcon name="edit" className="text-[14px]" />
              Edit project
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-crimson/40 px-4 py-2 font-display text-body-sm text-crimson hover:bg-crimson/10"
            >
              <MaterialIcon name="delete" className="text-[14px]" />
              Delete
            </button>
          </div>
        </div>

        {invalidRepo ? (
          <InvalidRepositoryState
            project={project}
            onReverify={handleReverify}
            onReverifyPending={verifyMeta.isLoading}
            onUpdate={() => setRepoOpen(true)}
          />
        ) : tab === "overview" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <AnalysisSummary analysis={selectedAnalysis ?? latest} />
              <RecentAnalyses analyses={recent} selectedId={selectedId} onSelect={selectAnalysis} />
            </div>
            <div className="flex flex-col gap-6">
              <RepositoryCard project={project} verifying={verifyMeta.isLoading} onReverify={handleReverify} onUpdate={() => setRepoOpen(true)} />
              <PipelineStepper analysisStatus={(selectedAnalysis ?? latest)?.status ?? null} />
            </div>
          </div>
        ) : tab === "analyses" ? (
          <div className="flex flex-col gap-6">
            <AnalysesTable analyses={analyses} selectedId={selectedId} onSelect={selectAnalysis} />
            {pagination && pagination.pageCount > 1 ? (
              <div className="flex items-center justify-center gap-2">
                <Button variant="champagne" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-9 px-4">Previous</Button>
                <span className="font-mono text-label-sm text-mist">Page {pagination.page} of {pagination.pageCount}</span>
                <Button variant="champagne" disabled={page >= pagination.pageCount} onClick={() => setPage((p) => Math.min(pagination.pageCount, p + 1))} className="h-9 px-4">Next</Button>
              </div>
            ) : null}
          </div>
        ) : tab === "recommendations" ? (
  <RecommendationsSection
    project={project}
    analysis={analysisForRecs}
  />
) : (
  <DeploymentPlanSection
    key={analysisForRecs?.id ?? "no-analysis"}
    projectId={project.id}
    analysis={analysisForRecs}
  />
)}
      </div>

      <AnimatePresence>
        {editOpen ? (
          <EditProjectModal
            project={project}
            pending={updateMeta.isLoading}
            onClose={() => setEditOpen(false)}
            onSubmit={handleEditProject}
          />
        ) : null}
        {repoOpen ? (
          <UpdateRepositoryModal
            project={project}
            pending={connectMeta.isLoading}
            verifying={verifyMeta.isLoading}
            onClose={() => setRepoOpen(false)}
            onSubmit={handleUpdateRepo}
            onVerify={handleReverify}
          />
        ) : null}
        {deleteOpen ? (
          <DeleteProjectModal
            row={{ id: project.id, name: project.name }}
            pending={deleteMeta.isLoading}
            onClose={() => setDeleteOpen(false)}
            onConfirm={() => handleDeleteProject()}
          />
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}

function InvalidRepositoryState({
  project,
  onReverify,
  onReverifyPending,
  onUpdate,
}: {
  project: ProjectType;
  onReverify: () => void;
  onReverifyPending: boolean;
  onUpdate: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-crimson/40 bg-crimson/10 p-6">
      <div className="flex items-center gap-3">
        <MaterialIcon name="error" className="text-[24px] text-crimson" />
        <p className="font-display text-headline-sm font-bold text-crimson">Invalid repository</p>
      </div>
      <p className="font-display text-body-md text-mist">
        {project.repository?.lastVerificationError ?? "The linked repository could not be verified."}
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={onReverify} disabled={onReverifyPending} className="h-9 gap-2 px-4">
          <MaterialIcon name={onReverifyPending ? "progress_activity" : "refresh"} className={onReverifyPending ? "animate-spin text-[16px]" : "text-[16px]"} />
          <span>{onReverifyPending ? "Verifying…" : "Re-verify"}</span>
        </Button>
        <Button variant="champagne" onClick={onUpdate} className="h-9 px-4">
          Update repository
        </Button>
      </div>
    </div>
  );
}

function RecommendationsSection({ project, analysis }: { project: ProjectType; analysis: Analysis | null }) {
  const [typeFilter, setTypeFilter] = useState<Recommendation["type"] | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] = useState<Recommendation["severity"] | "ALL">("ALL");
  const [runAudit, runAuditMeta] = useRunAuditMutation();
  const [launchAi, launchAiMeta] = useLaunchAiAuditMutation();
  const [accept, acceptMeta] = useAcceptRecommendationMutation();
  const [reject, rejectMeta] = useRejectRecommendationMutation();
  const toast = useToast();
  const [polling, setPolling] = useState(false);
  const [initialRecommendationCount, setInitialRecommendationCount] =
  useState<number | null>(null);

  const listQuery = useListRecommendationsQuery(
    { projectId: project.id, analysisId: analysis?.id ?? "" },
    { skip: !analysis?.id },
  );

  const recs = listQuery.data?.data ?? [];
  const filtered = recs.filter((r) => {
    if (typeFilter !== "ALL" && r.type !== typeFilter) return false;
    if (severityFilter !== "ALL" && r.severity !== severityFilter) return false;
    return true;
  });

  // poll recommendations while AI audit running
  useEffect(() => {
    if (!polling) return;
    const interval = window.setInterval(() => {
      listQuery.refetch();
    }, 5000);
    const stop = window.setTimeout(() => {
      setPolling(false);
      toast.push({ tone: "champagne", title: "AI audit timed out", message: "Stopped waiting after 3 minutes." });
    }, 3 * 60 * 1000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, [polling, listQuery, toast]);

  useEffect(() => {
  if (!polling || initialRecommendationCount === null) return;

  if (recs.length <= initialRecommendationCount) return;

  const timeoutId = window.setTimeout(() => {
    setPolling(false);
    setInitialRecommendationCount(null);
  }, 0);

  return () => window.clearTimeout(timeoutId);
}, [polling, initialRecommendationCount, recs.length]);

  async function handleRunAudit() {
    if (!analysis) return;
    try {
      await runAudit({ projectId: project.id, analysisId: analysis.id }).unwrap();
      listQuery.refetch();
      toast.push({ tone: "mint", title: "Audit complete", message: "Recommendations refreshed." });
    } catch (err) {
      const e = err as { data?: { error?: { message?: string } } };
      toast.push({ tone: "crimson", title: "Audit failed", message: e?.data?.error?.message ?? "Could not run audit." });
    }
  }

  async function handleAiAudit() {
    if (!analysis) return;
    setInitialRecommendationCount(recs.length);
    try {
      await launchAi({ projectId: project.id, analysisId: analysis.id }).unwrap();
      setPolling(true);
      toast.push({ tone: "ice", title: "AI audit requested", message: "Waiting for results…" });
    } catch (err) {
      const e = err as { data?: { error?: { code?: string; message?: string } } };
      if (e?.data?.error?.code === "CONFLICT") {
        setPolling(true);
        toast.push({ tone: "champagne", title: "AI audit in progress", message: "An AI audit is already running." });
      } else {
        toast.push({ tone: "crimson", title: "AI audit failed", message: e?.data?.error?.message ?? "Could not request." });
      }
    }
  }

  function stopWaiting() {
    setPolling(false);
  }

  const blocking = analysis?.docker.findings.some((f) => f.severity === "ERROR") ?? false;

  if (!analysis) {
    return (
      <div className="rounded-2xl border border-steel bg-panel p-6 shadow-md">
        <p className="font-display text-body-md text-mist">Run an analysis first to see recommendations.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <RecommendationFilters
        recommendations={recs}
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        severityFilter={severityFilter}
        onSeverityFilter={setSeverityFilter}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleRunAudit} disabled={runAuditMeta.isLoading} className="h-9 gap-2 px-4">
          <MaterialIcon name={runAuditMeta.isLoading ? "progress_activity" : "fact_check"} className={runAuditMeta.isLoading ? "animate-spin text-[16px]" : "text-[16px]"} />
          <span>{runAuditMeta.isLoading ? "Running…" : "Run audit"}</span>
        </Button>
        <Button
          variant="champagne"
          onClick={handleAiAudit}
          disabled={blocking || launchAiMeta.isLoading || polling}
          className="h-9 gap-2 px-4"
          title={blocking ? "Resolve blocking Docker issues first" : "Request an AI audit"}
        >
          <MaterialIcon name={launchAiMeta.isLoading || polling ? "progress_activity" : "auto_awesome"} className={launchAiMeta.isLoading || polling ? "animate-spin text-[16px]" : "text-[16px]"} />
          <span>{polling ? "AI audit running…" : "Run AI audit"}</span>
        </Button>
        {polling ? (
          <button type="button" onClick={stopWaiting} className="font-display text-body-sm text-mist hover:text-foam">
            Stop waiting
          </button>
        ) : null}
        {blocking ? (
          <span className="font-display text-body-sm text-champagne">Disabled: blocking Docker issue</span>
        ) : null}
      </div>

      {polling ? (
        <div className="flex items-center gap-3 rounded-xl border border-ice/40 bg-ice/5 p-4">
          <MaterialIcon name="progress_activity" className="animate-spin text-[20px] text-ice" />
          <p className="font-display text-body-md text-foam">AI audit running — polling for results every 5s (up to 3 min).</p>
        </div>
      ) : null}

      {listQuery.isLoading ? (
        <p className="font-display text-body-md text-mist">Loading recommendations…</p>
      ) : listQuery.isError ? (
        <p className="font-display text-body-md text-crimson">Could not load recommendations.</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-steel bg-panel p-8 text-center">
          <MaterialIcon name="manage_search" className="text-[32px] text-mist" />
          <p className="mt-2 font-display text-body-md text-mist">
            {recs.length === 0 ? "No recommendations yet. Run an audit to generate them." : "No recommendations match these filters."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((r) => (
            <RecommendationCard
              key={r.id}
              recommendation={r}
              pending={acceptMeta.isLoading || rejectMeta.isLoading}
              onAccept={async () => {
                try {
                  await accept({ projectId: project.id, analysisId: analysis.id, recommendationId: r.id }).unwrap();
                  listQuery.refetch();
                  toast.push({ tone: "mint", title: "Accepted", message: r.title });
                } catch (err) {
                  const e = err as { data?: { error?: { code?: string; message?: string } } };
                  if (e?.data?.error?.code === "INVALID_STATE_TRANSITION") {
                    listQuery.refetch();
                    toast.push({ tone: "champagne", title: "Already decided", message: "This recommendation was already decided." });
                  } else {
                    toast.push({ tone: "crimson", title: "Accept failed", message: e?.data?.error?.message ?? "Try again." });
                  }
                }
              }}
              onReject={async (note) => {
                try {
                  await reject({ projectId: project.id, analysisId: analysis.id, recommendationId: r.id, body: note ? { note } : undefined }).unwrap();
                  listQuery.refetch();
                  toast.push({ tone: "mint", title: "Rejected", message: r.title });
                } catch (err) {
                  const e = err as { data?: { error?: { code?: string; message?: string } } };
                  if (e?.data?.error?.code === "INVALID_STATE_TRANSITION") {
                    listQuery.refetch();
                    toast.push({ tone: "champagne", title: "Already decided", message: "This recommendation was already decided." });
                  } else {
                    toast.push({ tone: "crimson", title: "Reject failed", message: e?.data?.error?.message ?? "Try again." });
                  }
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function extractMessage(error: unknown): string {
  const e = error as { data?: { error?: { message?: string } }; message?: string };
  return e?.data?.error?.message ?? e?.message ?? "Unknown error";
}

export function ProjectDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-mist">Loading…</div>}>
      <ProjectDetailInner />
    </Suspense>
  );
}
