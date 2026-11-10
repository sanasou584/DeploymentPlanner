import Link from "next/link";
import {
  DASHBOARD_BRAND_ROW,
  DASHBOARD_NAV_ROWS,
  DASHBOARD_SOON_LABEL,
} from "@/data/dashboard";
import { MaterialIcon } from "@/shared/material-icon";
import { cn } from "@/utils/class-names";
import type { DashboardNavRow, NavItemKind } from "@/types/dashboard";
import { DashboardProfileCard } from "@/components/dashboard/session-profile";

const NAV_ROW_CLASSES: Record<NavItemKind, string> = {
  active:
    "border-l-2 border-frost-mid bg-surface-mid font-medium text-frost-mid shadow-sm",
  soon:
    "text-smoke hover:bg-surface-high transition-colors hover:text-haze",
};

function NavRowContent({ row }: { row: DashboardNavRow }) {
  return (
    <div className="flex items-center gap-2">
      <MaterialIcon
        name={row.icon}
        className={cn(
          "text-[20px]",
          row.kind === "active" ? "text-ice-dim" : "text-cinder",
        )}
      />
      <span className="font-display text-body-md">{row.label}</span>
    </div>
  );
}

function NavRowSoonChip() {
  return (
    <span className="rounded border border-champagne-bright/30 bg-champagne-soft/20 px-1.5 py-0.5 font-mono text-label-sm text-champagne-bright">
      {DASHBOARD_SOON_LABEL}
    </span>
  );
}

export function DashboardSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[260px] select-none flex-col justify-between border-r border-surface-highest bg-abyss">
      <div className="flex flex-col">
        <div className="flex h-[72px] items-center gap-2 border-b border-surface-highest/60 px-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ice shadow-sm">
            <MaterialIcon name="rocket_launch" className="text-[22px] text-abyss" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-[16px] font-bold tracking-tight text-frost">
              {DASHBOARD_BRAND_ROW.name}
            </span>
            <span className="mt-0.5 font-mono text-[10px] uppercase text-tide">
              {DASHBOARD_BRAND_ROW.tagline}
            </span>
          </div>
        </div>
        <div className="px-4 py-6">
          <div className="mb-1 px-2 font-mono text-label-sm uppercase text-cinder">
            {DASHBOARD_BRAND_ROW.sectionLabel}
          </div>
          <nav className="flex flex-col gap-1" aria-label={DASHBOARD_BRAND_ROW.sectionLabel}>
            {DASHBOARD_NAV_ROWS.map((row) =>
              row.kind === "active" && row.href ? (
                <Link
                  key={row.id}
                  href={row.href}
                  aria-current="page"
                  className={cn(
                    "flex items-center justify-between rounded-lg px-4 py-2 transition-colors",
                    NAV_ROW_CLASSES[row.kind],
                  )}
                >
                  <NavRowContent row={row} />
                </Link>
              ) : (
                <button
                  key={row.id}
                  type="button"
                  disabled
                  className={cn(
                    "flex cursor-default items-center justify-between rounded-lg px-4 py-2",
                    NAV_ROW_CLASSES[row.kind],
                  )}
                >
                  <NavRowContent row={row} />
                  <NavRowSoonChip />
                </button>
              ),
            )}
          </nav>
        </div>
      </div>
      <div className="border-t border-surface-highest/60 p-4">
        <DashboardProfileCard />
      </div>
    </aside>
  );
}
