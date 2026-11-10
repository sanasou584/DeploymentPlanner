"use client";

import { cn } from "@/utils/class-names";
import { MaterialIcon } from "@/shared/material-icon";
import type { Recommendation } from "@/types/analysis";

const TYPES: Recommendation["type"][] = [
  "REPLICAS",
  "CPU",
  "MEMORY",
  "HPA",
  "INGRESS",
  "DOCKER",
  "SECURITY",
  "GENERAL",
];

export function RecommendationFilters({
  recommendations,
  typeFilter,
  onTypeFilter,
  severityFilter,
  onSeverityFilter,
}: {
  recommendations: Recommendation[];
  typeFilter: Recommendation["type"] | "ALL";
  onTypeFilter: (value: Recommendation["type"] | "ALL") => void;
  severityFilter: Recommendation["severity"] | "ALL";
  onSeverityFilter: (value: Recommendation["severity"] | "ALL") => void;
}) {
  const counts = {
    total: recommendations.length,
    critical: recommendations.filter((r) => r.severity === "CRITICAL").length,
    decided: recommendations.filter((r) => r.status !== "PENDING").length,
  };
  const aiCount = recommendations.filter((r) => r.generatedBy.provider !== "internal").length;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-steel bg-panel p-5 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-body-md font-semibold text-foam">
            {counts.total} recommendations
          </span>
          {counts.critical > 0 ? (
            <span className="rounded-full bg-crimson/15 px-2.5 py-0.5 font-mono text-label-sm text-crimson">
              {counts.critical} critical
            </span>
          ) : null}
          <span className="font-mono text-label-sm text-mist">
            {counts.decided} of {counts.total} decided
          </span>
          {aiCount > 0 ? (
            <span className="rounded-full bg-ice/10 px-2.5 py-0.5 font-mono text-label-sm text-ice">
              AI · {aiCount}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={severityFilter}
            onChange={(e) => onSeverityFilter(e.target.value as Recommendation["severity"] | "ALL")}
            className="rounded-lg border border-steel bg-basin px-3 py-1.5 font-display text-body-sm text-foam"
            aria-label="Filter by severity"
          >
            <option value="ALL">All severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onTypeFilter("ALL")}
          className={cn(
            "rounded-full px-3 py-1 font-mono text-label-sm transition-colors",
            typeFilter === "ALL"
              ? "bg-ice text-navy"
              : "bg-surface-high text-mist hover:text-foam",
          )}
        >
          All
        </button>
        {TYPES.map((type) => {
          const count = recommendations.filter((r) => r.type === type).length;
          if (count === 0) return null;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onTypeFilter(type)}
              className={cn(
                "rounded-full px-3 py-1 font-mono text-label-sm transition-colors",
                typeFilter === type
                  ? "bg-ice text-navy"
                  : "bg-surface-high text-mist hover:text-foam",
              )}
            >
              {type} · {count}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1 text-mist">
        <MaterialIcon name="filter_list" className="text-[16px]" />
        <span className="font-mono text-label-sm">client-side filters</span>
      </div>
    </div>
  );
}
