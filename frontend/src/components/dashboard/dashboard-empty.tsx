import { Fragment } from "react";
import { cn } from "@/utils/class-names";
import {
  EMPTY_STATE_ROW,
  EMPTY_STAT_ROWS,
  EMPTY_TELEMETRY_ROWS,
} from "@/data/dashboard";
import { MaterialIcon } from "@/shared/material-icon";
import type { DashboardStatRow, StatAccent, TelemetryRow } from "@/types/dashboard";

const EMPTY_BLUR_CLASSES: Record<StatAccent, string> = {
  total: "bg-tide/5",
  development: "bg-ice-dim/5",
  staging: "bg-champagne-soft/5",
  production: "bg-champagne-bright/5",
};

const EMPTY_MARK_CLASSES: Record<StatAccent, string> = {
  total: "",
  development: "bg-ice-dim",
  staging: "bg-lagoon",
  production: "bg-champagne-bright shadow-gold-dot",
};

const EMPTY_ICON_CLASSES: Record<StatAccent, string> = {
  total: "text-tide",
  development: "",
  staging: "",
  production: "",
};

const TELEMETRY_ICON_CLASSES: Record<TelemetryRow["iconAccent"], string> = {
  frostMid: "text-ice-dim",
  tide: "text-tide",
  champagneBright: "text-champagne-bright",
};

function EmptyStatCard({ row }: { row: DashboardStatRow }) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-mid p-5 shadow-sm">
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-6 top-6 h-24 w-24 rounded-full blur-xl",
          EMPTY_BLUR_CLASSES[row.accent],
        )}
      />
      <div className="flex items-center justify-between">
        <span className="font-mono text-label-md uppercase text-smoke">
          {row.label}
        </span>
        {row.icon ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-high">
            <MaterialIcon
              name={row.icon}
              className={cn("text-[18px]", EMPTY_ICON_CLASSES[row.accent])}
            />
          </div>
        ) : (
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              EMPTY_MARK_CLASSES[row.accent],
            )}
          />
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-headline-lg font-bold text-frost">
          {row.value}
        </span>
        <span className="font-mono text-label-sm text-cinder">{row.suffix}</span>
      </div>
    </div>
  );
}

export function DashboardEmptyContent({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="relative mt-4 w-full">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1/2 left-1/2 h-96 w-96 -translate-y-1/2 translate-x-[-50%] rounded-full bg-ice/5 blur-3xl"
      />
      <div className="relative flex w-full flex-col items-center justify-center rounded-xl bg-surface-mid p-12 text-center shadow-xl lg:p-16">
        <div className="absolute left-4 top-4 flex items-center gap-1.5 opacity-60">
          <span className="h-1.5 w-1.5 rounded-full bg-tide" />
          <span className="font-mono text-label-sm uppercase text-smoke">
            {EMPTY_STATE_ROW.ringLabelLeft}
          </span>
        </div>
        <div className="absolute right-4 top-4 flex items-center gap-2 opacity-60">
          <span className="font-mono text-label-sm text-cinder">
            {EMPTY_STATE_ROW.ringLabelRight}
          </span>
        </div>
        <div className="relative mt-2 flex items-center justify-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute h-28 w-28 animate-ping rounded-full bg-tide/10 opacity-40"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute h-36 w-36 rounded-full bg-ice/5 blur-md"
          />
          <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-surface-high shadow-lg">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-highest">
              <MaterialIcon name="create_new_folder" className="text-[32px] text-tide" />
            </div>
          </div>
        </div>
        <h2 className="mt-8 mb-2 font-display text-headline-lg font-bold tracking-tight text-frost">
          {EMPTY_STATE_ROW.heading}
        </h2>
        <p className="mx-auto mb-8 max-w-md font-display text-body-md text-smoke">
          {EMPTY_STATE_ROW.copy}
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="group inline-flex items-center gap-2 rounded-full bg-ice px-8 py-3.5 font-display text-body-md font-bold shadow-lg shadow-tide/15 transition-all duration-200 hover:shadow-ice-halo active:scale-95"
        >
          <MaterialIcon
            name="add"
            className="text-[20px] text-abyss transition-transform duration-200 group-hover:rotate-90"
          />
          <span className="text-abyss">{EMPTY_STATE_ROW.actionLabel}</span>
        </button>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 pt-6 font-mono text-label-sm text-smoke">
          {EMPTY_TELEMETRY_ROWS.map((row, index) => (
            <Fragment key={row.id}>
              {index > 0 ? (
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-ash" />
              ) : null}
              <div className="flex items-center gap-2">
                <MaterialIcon
                  name={row.icon}
                  className={cn("text-[16px]", TELEMETRY_ICON_CLASSES[row.iconAccent])}
                />
                <span>{row.label}</span>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardEmptyStats() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {EMPTY_STAT_ROWS.map((row) => (
        <EmptyStatCard key={row.id} row={row} />
      ))}
    </div>
  );
}
