"use client";

import { motion } from "motion/react";
import { cn } from "@/utils/class-names";
import { MaterialIcon } from "@/shared/material-icon";
import { Button } from "@/shared/button";
import type { Project } from "@/types/project";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "analyses", label: "Analyses" },
  { id: "recommendations", label: "Recommendations" },
  { id: "plans", label: "Deployment Plans" },
] as const;

export type ProjectTab = (typeof TABS)[number]["id"];

export function ProjectHeader({
  project,
  tab,
  tabCounts,
  onTab,
  onRun,
  running,
  launchPending,
  invalidRepo,
}: {
  project: Project;
  tab: ProjectTab;
  tabCounts: { analyses: number };
  onTab: (tab: ProjectTab) => void;
  onRun: () => void;
  running: boolean;
  launchPending: boolean;
  invalidRepo: boolean;
}) {
  const runDisabled = invalidRepo || running || launchPending;
  const runTitle = invalidRepo
    ? "Verify the repository before running an analysis"
    : running
      ? "An analysis is already in progress"
      : "Run a new analysis";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-headline-lg font-bold tracking-tight text-foam">
              {project.name}
            </h1>
            <span className="rounded-full bg-surface-high px-2.5 py-0.5 font-mono text-label-sm uppercase text-mist">
              {project.environment}
            </span>
          </div>
          {project.description ? (
            <p className="mt-2 max-w-2xl font-display text-body-md text-mist">
              {project.description}
            </p>
          ) : null}
        </div>
        <div title={runTitle}>
          <Button
            onClick={onRun}
            disabled={runDisabled}
            className="h-10 gap-2 px-5 font-bold shadow-ice-submit hover:shadow-ice-halo disabled:opacity-50"
          >
            <MaterialIcon
              name={running || launchPending ? "progress_activity" : "play_circle"}
              className={cn("text-[18px]", (running || launchPending) && "animate-spin")}
            />
            <span>
              {running
                ? "Analysis in progress"
                : launchPending
                  ? "Starting…"
                  : "Run analysis"}
            </span>
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-1 border-b border-steel/40">
        {TABS.map((item) => {
          const count = item.id === "analyses" ? tabCounts.analyses : null;
          const locked = item.id === "recommendations" && tabCounts.analyses === 0;
          return (
            <button
              key={item.id}
              type="button"
              disabled={locked}
              onClick={() => onTab(item.id)}
              className={cn(
                "relative px-4 py-2.5 font-display text-body-md transition-colors",
                tab === item.id ? "text-foam" : "text-mist hover:text-foam",
                locked && "cursor-not-allowed opacity-40",
              )}
            >
              <span className="flex items-center gap-2">
                {item.label}
                {count !== null ? (
                  <span className="rounded-full bg-surface-high px-2 py-0.5 font-mono text-label-sm text-mist">
                    {count}
                  </span>
                ) : null}
                {locked ? (
                  <span className="rounded-full bg-champagne/20 px-2 py-0.5 font-mono text-label-sm text-champagne">
                    Soon
                  </span>
                ) : null}
              </span>
              {tab === item.id ? (
                <motion.span
                  layoutId="project-tab-underline"
                  className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-ice"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
