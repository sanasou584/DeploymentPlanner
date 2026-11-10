"use client";

import { AnimatePresence, MotionConfig } from "motion/react";
import { useMemo, useState } from "react";
import {
  DASHBOARD_STATE_ROWS,
  PROJECT_PAGINATION_ROW,
  PROJECT_STATS_ROWS,
} from "@/data/dashboard";
import type {
  DashboardFilterId,
  DashboardStateRow,
  DashboardViewMode,
  ProjectTargetRow,
  ProjectModalValues,
  ProjectRow,
} from "@/types/dashboard";
import type { ConnectRepositoryBody, Project } from "@/types/project";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useProjectsPage, useProjectMutations } from "@/hooks/use-projects";
import { firstName } from "@/utils/identity";
import {
  projectCountsOf,
  projectRowsOf,
  projectsCountLabel,
  projectsStatusLabel,
  paginationPageWindow,
  statRowsOf,
} from "@/utils/project-view";
import { DashboardEmptyContent, DashboardEmptyStats } from "@/components/dashboard/dashboard-empty";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ConnectRepositoryModal } from "@/components/dashboard/connect-repository-modal";
import { DeleteProjectModal } from "@/components/dashboard/delete-project-modal";
import { NewProjectModal } from "@/components/dashboard/new-project-modal";
import { PaginationBar } from "@/components/dashboard/pagination-bar";
import { ProjectGrid } from "@/components/dashboard/project-grid";
import { ProjectsToolbar } from "@/components/dashboard/projects-toolbar";
import { StatGrid } from "@/components/dashboard/stat-grid";
import { MaterialIcon } from "@/shared/material-icon";
import { Button } from "@/shared/button";

export function DashboardView() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<DashboardFilterId>("all");
  const [viewMode, setViewMode] = useState<DashboardViewMode>("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<ProjectTargetRow | null>(null);
  const [repositoryTargetId, setRepositoryTargetId] = useState<string | null>(null);
  const { user } = useAuthSession();
  const { data, loading, error, refetch } = useProjectsPage(page);
  const { submitting, removing, connecting, verifying, create, update, remove, connect, verify } =
    useProjectMutations();

  const projects = useMemo(
    () => (data?.data ?? []) as Project[],
    [data],
  );
  const repositoryTarget = useMemo(
    () =>
      repositoryTargetId === null
        ? null
        : (data?.data ?? []).find((project) => project.id === repositoryTargetId) ?? null,
    [data, repositoryTargetId],
  );
  const rows = useMemo(() => projectRowsOf(projects), [projects]);
  const counts = useMemo(() => projectCountsOf(projects), [projects]);
  const statRows = useMemo(
    () => statRowsOf(PROJECT_STATS_ROWS, counts),
    [counts],
  );
  const countLabel = useMemo(
    () => projectsCountLabel(data?.pagination.total ?? 0),
    [data],
  );
  const catalogComplete = useMemo(
    () => (data?.data.length ?? 0) >= (data?.pagination.total ?? 0),
    [data],
  );
  const pageCount = data?.pagination.pageCount ?? 1;
  const statusLabel = useMemo(
    () => projectsStatusLabel(data?.pagination),
    [data],
  );

  const projectsEmpty = !loading && !error && rows.length === 0;

  async function handleSubmitNext(
    next: ProjectModalValues,
    repository: ConnectRepositoryBody | null,
  ) {
    if (editing) {
      return update({ id: editing.id, name: editing.name, description: editing.description }, next);
    }
    const created = await create(next);
    if (created.kind !== "success" || !repository) {
      return created;
    }
    if (!created.projectId) {
      return { kind: "partial" as const };
    }
    const linked = await connect({ id: created.projectId }, repository);
    if (linked.kind === "success") {
      return { kind: "success" as const, projectId: created.projectId };
    }
    if (linked.kind === "unverifiable") {
      return { kind: "unverifiable" as const, message: linked.message };
    }
    return {
      kind: "partial" as const,
      message:
        linked.message ?? Object.values(linked.fieldErrors ?? {})[0]?.[0],
    };
  }

  async function handleDelete(row: ProjectTargetRow) {
    const confirmed = await remove(row);
    if (confirmed) {
      setDeleteRow(null);
      setPage(1);
    }
  }

  async function handleConnectSubmit(body: ConnectRepositoryBody) {
    if (!repositoryTargetId) {
      return { kind: "failed" as const };
    }
    return connect({ id: repositoryTargetId }, body);
  }

  async function handleVerifyRepository(): Promise<boolean> {
    if (!repositoryTargetId) {
      return false;
    }
    return verify({ id: repositoryTargetId });
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex w-full flex-col space-y-8 p-8">
        <DashboardHeader
          name={user ? firstName(user.name) : ""}
          onCreate={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        />
        {projectsEmpty ? (
          <>
            <DashboardEmptyStats />
            <DashboardEmptyContent
              onCreate={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            />
          </>
        ) : (
          <>
            <StatGrid rows={statRows} />
            <ProjectsToolbar
              countLabel={countLabel}
              filter={filter}
              onFilter={setFilter}
              viewMode={viewMode}
              onView={setViewMode}
            />
            {loading ? (
              <DashboardStateSheet row={DASHBOARD_STATE_ROWS.loading} />
            ) : error ? (
              <DashboardErrorSheet message={error.message} onRetry={refetch} />
            ) : (
              <>
                <ProjectGrid
                  rows={filteredRows(rows, filter)}
                  pendingId={removing ? deleteRow?.id ?? null : null}
                  onEdit={(row) => {
                    setEditing(row);
                    setModalOpen(true);
                  }}
                  onDelete={(row) => setDeleteRow(row)}
                  onConnect={(row) => setRepositoryTargetId(row.id)}
                />
                <PaginationBar
                  pages={paginationPageWindow(page, pageCount)}
                  current={page}
                  statusLabel={statusLabel}
                  onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                  onNext={() => setPage((current) => Math.min(pageCount, current + 1))}
                  onPage={setPage}
                  row={PROJECT_PAGINATION_ROW}
                />
              </>
            )}
          </>
        )}
      </div>
      <AnimatePresence>
        {modalOpen ? (
          <NewProjectModal
            key={editing ? `edit-${editing.id}` : "create"}
            mode={editing ? "edit" : "create"}
            onClose={() => setModalOpen(false)}
            existingNames={
              editing ? rows.filter((row) => row.id !== editing.id).map((row) => row.name) : rows.map((row) => row.name)
            }
            catalogComplete={catalogComplete}
            pending={submitting}
            initialValues={
              editing ? { name: editing.name, description: editing.description, environment: editing.environment } : undefined
            }
            onSubmit={handleSubmitNext}
          />
        ) : null}
        {deleteRow ? (
          <DeleteProjectModal
            row={deleteRow}
            pending={removing}
            onClose={() => setDeleteRow(null)}
            onConfirm={handleDelete}
          />
        ) : null}
        {repositoryTargetId ? (
          <ConnectRepositoryModal
            key={repositoryTargetId}
            projectName={repositoryTarget?.name ?? ""}
            repository={repositoryTarget?.repository ?? null}
            pending={connecting}
            verifying={verifying}
            onClose={() => setRepositoryTargetId(null)}
            onSubmit={handleConnectSubmit}
            onVerify={handleVerifyRepository}
          />
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}

function filteredRows(rows: ProjectRow[], filter: DashboardFilterId): ProjectRow[] {
  return filter === "all"
    ? rows
    : rows.filter((row) => row.environment === filter);
}

function DashboardStateSheet({ row }: { row: DashboardStateRow }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-steel/60 bg-surface-high/90 px-10 py-16 text-center shadow-md backdrop-blur-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-basin border border-steel">
        <MaterialIcon
          name={row.icon}
          className={row.iconSpin ? "animate-spin text-[22px] text-tide" : "text-[22px] text-tide"}
        />
      </div>
      <span className="font-display text-headline-sm font-semibold text-frost">
        {row.heading}
      </span>
      <span className="font-display text-body-md text-smoke">
        {row.copy}
      </span>
    </div>
  );
}

function DashboardErrorSheet({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const row = DASHBOARD_STATE_ROWS.error;
  return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-crimson/40 bg-surface-high/90 px-10 py-16 text-center shadow-md backdrop-blur-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-basin border border-crimson/60">
          <MaterialIcon name={row.icon} className="text-[22px] text-rose" />
        </div>
        <span className="font-display text-headline-sm font-semibold text-frost">
          {row.heading}
        </span>
        <span className="font-display text-body-md text-smoke">{row.copy}</span>
        <span className="font-mono text-label-sm text-cinder">{message}</span>
        {row.actionLabel ? (
          <Button onClick={onRetry} className="mt-1 h-10 gap-2 px-5 font-bold">
            <MaterialIcon name="refresh" className="text-[18px]" />
            <span>{row.actionLabel}</span>
          </Button>
        ) : null}
      </div>
  );
}
