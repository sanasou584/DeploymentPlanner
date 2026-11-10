"use client";

import Link from "next/link";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/class-names";
import {
  CARD_ACTION_ROW,
  ENVIRONMENT_LABELS,
} from "@/data/dashboard";
import { REPOSITORY_FEEDBACK } from "@/data/dashboard-form";
import type { EnvironmentTone, ProjectRow } from "@/types/dashboard";
import { repositorySummaryOf, repositoryUrlOf } from "@/utils/project-view";
import { MaterialIcon } from "@/shared/material-icon";

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const ENV_CHIP_CLASSES: Record<EnvironmentTone, string> = {
  development: "bg-lagoon/30 text-tide",
  production: "bg-champagne-soft/20 text-champagne-bright",
  staging: "bg-champagne-soft/30 text-champagne-dim",
};

function CardMenu({
  open,
  pending,
  repositoryLinked,
  onEdit,
  onDelete,
  onConnect,
}: {
  open: boolean;
  pending: boolean;
  repositoryLinked: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onConnect: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute right-0 top-8 z-30 flex w-44 flex-col gap-0.5 rounded-xl bg-abyss p-1.5 shadow-2xl"
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left font-display text-body-sm text-frost transition-colors hover:bg-surface-mid"
          >
            <MaterialIcon name="edit" className="text-[16px]" />
            <span>{CARD_ACTION_ROW.editLabel}</span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onConnect();
            }}
            disabled={pending}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left font-display text-body-sm text-frost transition-colors hover:bg-surface-mid"
          >
            <MaterialIcon name="link" className="text-[16px]" />
            <span>
              {repositoryLinked
                ? CARD_ACTION_ROW.updateLabel
                : CARD_ACTION_ROW.connectLabel}
            </span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            disabled={pending}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left font-display text-body-sm text-rose transition-colors hover:bg-ember/20"
          >
            <MaterialIcon name="delete" className="text-[16px]" />
            <span>{CARD_ACTION_ROW.deleteLabel}</span>
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ProjectCard({
  row,
  menuPending = false,
  onEdit,
  onDelete,
  onConnect,
}: {
  row: ProjectRow;
  menuPending?: boolean;
  onEdit: (row: ProjectRow) => void;
  onDelete: (row: ProjectRow) => void;
  onConnect: (row: ProjectRow) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const closeMenu = () => setMenuOpen(false);
  const repository = row.repository;

  return (
    <motion.div
      variants={CARD_VARIANTS}
      onClick={() => router.push(`/projects/${row.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/projects/${row.id}`);
        }
      }}
      className="relative flex min-h-[178px] cursor-pointer flex-col justify-between rounded-2xl bg-surface-high/95 p-5 shadow-lg transition-shadow duration-200 hover:shadow-teal-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice/40"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href={`/projects/${row.id}`}
              onClick={(event) => event.stopPropagation()}
              className="truncate font-display text-[18px] font-bold text-frost hover:text-ice"
            >
              {row.name}
            </Link>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 font-mono text-label-sm font-semibold tracking-wide",
                ENV_CHIP_CLASSES[row.environment],
              )}
            >
              {ENVIRONMENT_LABELS[row.environment]}
            </span>
          </div>
          <div className="relative">
            <button
              type="button"
              aria-label={CARD_ACTION_ROW.menuLabel}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
              className={cn(
                "-mr-1 rounded-md p-1 transition-colors",
                menuOpen ? "bg-surface-highest text-frost" : "text-smoke hover:text-frost",
              )}
            >
              <MaterialIcon name="more_vert" className="text-[18px]" />
            </button>
            <CardMenu
              open={menuOpen}
              pending={menuPending}
              repositoryLinked={repository !== null}
              onEdit={() => {
                closeMenu();
                onEdit(row);
              }}
              onDelete={() => {
                closeMenu();
                onDelete(row);
              }}
              onConnect={() => {
                closeMenu();
                onConnect(row);
              }}
            />
          </div>
        </div>
        <p className="mt-3 font-display text-body-md text-smoke line-clamp-2">
          {row.description}
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3 font-mono text-label-md text-smoke">
        <span className="flex items-center gap-2">
          <MaterialIcon name="calendar_today" className="text-[15px]" />
          <span>{row.createdAt}</span>
        </span>
        {repository ? (
          <a
            href={repositoryUrlOf(repository)}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            title={CARD_ACTION_ROW.repositoryOpenLabel}
            aria-label={`${repositorySummaryOf(repository)} — ${
              repository.isValid
                ? REPOSITORY_FEEDBACK.verifiedLabel
                : REPOSITORY_FEEDBACK.invalidLabel
            } — ${repository.branch} — ${CARD_ACTION_ROW.repositoryOpenLabel}`}
            className="flex min-w-0 items-center gap-1.5 font-mono text-label-md text-mist transition-colors hover:text-ice"
          >
            <MaterialIcon
              name={repository.isValid ? "verified" : "error"}
              className={cn(
                "shrink-0 text-[15px]",
                repository.isValid ? "text-mint" : "text-crimson",
              )}
            />
            <span className="truncate">{repositorySummaryOf(repository)}</span>
            <span className="shrink-0 text-cinder">· {repository.branch}</span>
          </a>
        ) : null}
      </div>
    </motion.div>
  );
}
