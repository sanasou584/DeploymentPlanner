"use client";

import { motion } from "motion/react";
import { MaterialIcon } from "@/shared/material-icon";
import { cn } from "@/utils/class-names";
import type { Analysis } from "@/types/analysis";

export function RecentAnalyses({
  analyses,
  selectedId,
  onSelect,
}: {
  analyses: Analysis[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-steel bg-panel p-6 shadow-md">
      <div className="flex items-center justify-between">
        <p className="font-display text-headline-sm font-bold text-foam">Recent analyses</p>
        <span className="font-mono text-label-sm text-mist">{analyses.length} shown</span>
      </div>
      {analyses.length === 0 ? (
        <p className="font-display text-body-md text-mist">No analyses yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {analyses.map((analysis, index) => {
            const active = analysis.id === selectedId;
            return (
              <motion.li
                key={analysis.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <button
                  type="button"
                  onClick={() => onSelect(analysis.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                    active
                      ? "border-ice/40 bg-ice/5"
                      : "border-steel/40 bg-basin hover:border-steel",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <StatusDot status={analysis.status} />
                    <div className="min-w-0">
                      <p className="font-display text-body-md font-semibold text-foam">
                        Analysis #{analysis.number}
                      </p>
                      <p className="font-mono text-label-sm text-mist">
                        {analysis.branch} · {new Date(analysis.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <MaterialIcon name="chevron_right" className="shrink-0 text-[18px] text-mist" />
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: Analysis["status"] }) {
  const color =
    status === "COMPLETED"
      ? "bg-mint"
      : status === "FAILED"
        ? "bg-crimson"
        : status === "RUNNING"
          ? "bg-ice animate-pulse"
          : "bg-mist";
  return <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", color)} />;
}
