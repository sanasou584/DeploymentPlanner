"use client";

import { motion } from "motion/react";
import { cn } from "@/utils/class-names";
import { MaterialIcon } from "@/shared/material-icon";
import { Button } from "@/shared/button";
import type { Project } from "@/types/project";
import { repositorySummaryOf, repositoryUrlOf } from "@/utils/project-view";

export function RepositoryCard({
  project,
  verifying,
  onReverify,
  onUpdate,
}: {
  project: Project;
  verifying: boolean;
  onReverify: () => void;
  onUpdate: () => void;
}) {
  const repo = project.repository;
  const verified = repo?.isValid ?? false;
  const lastVerified = repo?.lastVerifiedAt
    ? new Date(repo.lastVerifiedAt).toLocaleString()
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className="flex flex-col gap-4 rounded-2xl border border-steel bg-panel p-6 shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-basin border border-steel">
            <MaterialIcon name="fork_right" className="text-[20px] text-ice" />
          </div>
          <div>
            <p className="font-display text-headline-sm font-bold text-foam">Repository</p>
            <p className="font-mono text-label-sm text-mist">
              {repo ? repositorySummaryOf(repo) : "Not connected"}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 font-mono text-label-sm uppercase",
            verified ? "bg-mint/15 text-mint" : "bg-crimson/15 text-crimson",
          )}
        >
          {verified ? "verified" : "not verified"}
        </span>
      </div>

      {repo ? (
        <div className="flex flex-col gap-2 rounded-xl border border-steel/40 bg-basin px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-label-sm uppercase text-cinder">Branch</span>
            <span className="font-mono text-code-md text-foam">{repo.branch}</span>
          </div>
          {repo.defaultBranch ? (
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-label-sm uppercase text-cinder">Default branch</span>
              <span className="font-mono text-code-md text-mist">{repo.defaultBranch}</span>
            </div>
          ) : null}
          {lastVerified ? (
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-label-sm uppercase text-cinder">Last verified</span>
              <span className="font-mono text-code-md text-mist">{lastVerified}</span>
            </div>
          ) : null}
          {repo.lastVerificationError ? (
            <p className="mt-1 font-display text-body-sm text-crimson">{repo.lastVerificationError}</p>
          ) : null}
          <a
            href={repositoryUrlOf(repo)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 font-display text-body-sm text-ice hover:underline"
          >
            <MaterialIcon name="open_in_new" className="text-[14px]" />
            Open on GitHub
          </a>
        </div>
      ) : (
        <p className="font-display text-body-md text-mist">
          No repository connected yet. Link one to enable analysis.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={onReverify}
          disabled={verifying || !repo}
          className="h-9 gap-2 px-4 font-medium"
        >
          <MaterialIcon
            name={verifying ? "progress_activity" : "refresh"}
            className={cn("text-[16px]", verifying && "animate-spin")}
          />
          <span>{verifying ? "Verifying…" : "Re-verify"}</span>
        </Button>
        <Button variant="champagne" onClick={onUpdate} className="h-9 px-4">
          Update repository
        </Button>
      </div>
    </motion.div>
  );
}
