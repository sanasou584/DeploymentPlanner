"use client";

import { motion } from "motion/react";
import { MaterialIcon } from "@/shared/material-icon";
import { cn } from "@/utils/class-names";
import type { Analysis } from "@/types/analysis";

function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function AnalysesTable({
  analyses,
  selectedId,
  onSelect,
}: {
  analyses: Analysis[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (analyses.length === 0) {
    return (
      <div className="rounded-2xl border border-steel bg-panel p-6 shadow-md">
        <p className="font-display text-body-md text-mist">No analyses yet.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-steel bg-panel shadow-md">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-steel/40 bg-basin/60 text-left">
            <th className="px-4 py-3 font-mono text-label-sm uppercase text-cinder">#</th>
            <th className="px-4 py-3 font-mono text-label-sm uppercase text-cinder">Status</th>
            <th className="px-4 py-3 font-mono text-label-sm uppercase text-cinder">Branch</th>
            <th className="px-4 py-3 font-mono text-label-sm uppercase text-cinder">Technologies</th>
            <th className="px-4 py-3 font-mono text-label-sm uppercase text-cinder">Docker</th>
            <th className="px-4 py-3 font-mono text-label-sm uppercase text-cinder">Duration</th>
            <th className="px-4 py-3 font-mono text-label-sm uppercase text-cinder">Started</th>
            <th className="px-4 py-3 font-mono text-label-sm uppercase text-cinder">View</th>
          </tr>
        </thead>
        <tbody>
          {analyses.map((analysis, index) => {
            const active = analysis.id === selectedId;
            const techCount = analysis.technologies.length;
            const shown = analysis.technologies.slice(0, 3);
            const extra = techCount - shown.length;
            return (
              <motion.tr
                key={analysis.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  "border-b border-steel/20 transition-colors",
                  active ? "bg-ice/5" : "hover:bg-basin/40",
                )}
              >
                <td className="px-4 py-3 font-mono text-code-md text-foam">#{analysis.number}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 font-mono text-label-sm uppercase",
                      analysis.status === "COMPLETED"
                        ? "bg-mint/15 text-mint"
                        : analysis.status === "FAILED"
                          ? "bg-crimson/15 text-crimson"
                          : analysis.status === "RUNNING"
                            ? "bg-ice/15 text-ice"
                            : "bg-mist/15 text-mist",
                    )}
                  >
                    {analysis.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-code-md text-mist">{analysis.branch}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {shown.map((t) => (
                      <span key={t.name} className="rounded bg-surface-high px-2 py-0.5 font-mono text-label-sm text-foam">
                        {t.name}
                      </span>
                    ))}
                    {extra > 0 ? (
                      <span className="font-mono text-label-sm text-mist">+{extra}</span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-code-md text-mist">
                  {analysis.docker.hasDockerfile ? "Dockerfile" : "—"}
                  {analysis.docker.findings.some((f) => f.severity === "ERROR") ? " · blocking" : ""}
                </td>
                <td className="px-4 py-3 font-mono text-code-md text-mist">
                  {formatDuration(analysis.durationMs)}
                </td>
                <td className="px-4 py-3 font-mono text-label-sm text-mist">
                  {new Date(analysis.startedAt ?? analysis.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onSelect(analysis.id)}
                    className="flex items-center gap-1 font-display text-body-sm text-ice hover:underline"
                  >
                    <MaterialIcon name="visibility" className="text-[14px]" />
                    View
                  </button>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
