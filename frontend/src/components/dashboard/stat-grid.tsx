import type { DashboardStatRow } from "@/types/dashboard";
import { MaterialIcon } from "@/shared/material-icon";
import { cn } from "@/utils/class-names";

const STAT_MARK_CLASSES: Record<
  DashboardStatRow["accent"],
  string
> = {
  total: "text-ice-dim",
  development: "bg-glint shadow-tide-dot",
  staging: "bg-champagne-soft shadow-champagne-dot",
  production: "bg-champagne-bright shadow-gold-dot",
};

const STAT_SUFFIX_CLASSES: Record<DashboardStatRow["accent"], string | null> = {
  total: null,
  development: "text-tide",
  staging: "text-champagne-bright",
  production: "text-champagne-bright",
};

function StatMark({ row }: { row: DashboardStatRow }) {
  if (row.icon) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-abyss">
        <MaterialIcon
          name={row.icon}
          className={cn("text-[18px]", STAT_MARK_CLASSES[row.accent])}
        />
      </div>
    );
  }
  return (
    <span className={cn("h-2.5 w-2.5 rounded-full", STAT_MARK_CLASSES[row.accent])} />
  );
}

export function StatGrid({ rows }: { rows: DashboardStatRow[] }) {
  return (
    <div className="grid grid-cols-4 gap-5">
      {rows.map((row) => {
        const suffixClass = STAT_SUFFIX_CLASSES[row.accent];
        return (
          <div
            key={row.id}
            className="flex flex-col justify-between rounded-xl bg-surface-high/90 p-5 shadow-md backdrop-blur-sm"
          >
            <div className="flex items-start justify-between">
              <span className="font-mono text-label-md uppercase text-smoke">
                {row.label}
              </span>
              <StatMark row={row} />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-headline-lg font-bold tracking-tight text-frost">
                {row.value}
              </span>
              {row.suffix === "" || !suffixClass ? null : (
                <span className={cn("font-mono text-label-sm", suffixClass)}>
                  {row.suffix}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
