import { cn } from "@/utils/class-names";
import {
  ENVIRONMENT_FILTER_ROWS,
  PROJECTS_HEADING_ROW,
  VIEW_TOGGLE_ROWS,
} from "@/data/dashboard";
import { MaterialIcon } from "@/shared/material-icon";
import type {
  DashboardFilterId,
  DashboardViewMode,
  EnvironmentFilterRow,
  ViewToggleRow,
} from "@/types/dashboard";

interface DashboardProjectsToolbarProps {
  countLabel: string;
  filter: DashboardFilterId;
  onFilter: (filter: DashboardFilterId) => void;
  viewMode: DashboardViewMode;
  onView: (viewMode: DashboardViewMode) => void;
}

function FilterPill({
  row,
  active,
  onSelect,
}: {
  row: EnvironmentFilterRow;
  active: boolean;
  onSelect: (filter: DashboardFilterId) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(row.id)}
      className={cn(
        "rounded-full px-3.5 py-1 font-mono text-label-md transition-colors",
        active ? "bg-ice-dim font-semibold text-abyss" : "text-smoke hover:text-frost",
      )}
    >
      {row.label}
    </button>
  );
}

function ViewToggleChip({
  row,
  active,
  onSelect,
}: {
  row: ViewToggleRow;
  active: boolean;
  onSelect: (viewMode: DashboardViewMode) => void;
}) {
  return (
    <button
      type="button"
      aria-label={row.label}
      aria-pressed={active}
      onClick={() => onSelect(row.id)}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded",
        active ? "bg-surface-highest text-tide" : "text-smoke hover:text-frost",
      )}
    >
      <MaterialIcon name={row.icon} className="text-[18px]" />
    </button>
  );
}

export function ProjectsToolbar({
  countLabel,
  filter,
  onFilter,
  viewMode,
  onView,
}: DashboardProjectsToolbarProps) {
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-headline-sm font-bold text-frost">
            {PROJECTS_HEADING_ROW.heading}
          </h2>
          <span className="rounded-full bg-surface-highest px-2.5 py-0.5 font-mono text-label-sm text-smoke">
            {countLabel}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="flex items-center rounded-full bg-abyss p-1 shadow-inner"
            role="group"
            aria-label={PROJECTS_HEADING_ROW.heading}
          >
            {ENVIRONMENT_FILTER_ROWS.map((row) => (
              <FilterPill
                key={row.id}
                row={row}
                active={filter === row.id}
                onSelect={onFilter}
              />
            ))}
          </div>
          <div className="flex items-center rounded-lg bg-abyss p-1" role="group" aria-label="Project layout">
            {VIEW_TOGGLE_ROWS.map((row) => (
              <ViewToggleChip
                key={row.id}
                row={row}
                active={viewMode === row.id}
                onSelect={onView}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
