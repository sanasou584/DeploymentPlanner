import {
  DASHBOARD_CRUMB_ROW,
  DASHBOARD_SEARCH_ROW,
} from "@/data/dashboard";
import { cn } from "@/utils/class-names";
import { MaterialIcon } from "@/shared/material-icon";
import { UserAvatarMenu } from "@/components/dashboard/user-avatar-menu";

const ICON_BUTTON_BASE =
  "flex h-10 w-10 items-center justify-center rounded-full text-teal transition-colors hover:bg-panel/60 hover:text-ice disabled:cursor-default";

export function DashboardTopNav() {
  return (
    <header className="fixed left-[260px] right-0 top-0 z-40 flex h-[72px] items-center justify-between gap-4 border-b border-ice/15 bg-navy px-6">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-mist/60">
          {DASHBOARD_CRUMB_ROW.brandContext}
        </span>
        <span className="text-xs text-steel">/</span>
        <span className="text-xs font-medium text-mist">{DASHBOARD_CRUMB_ROW.label}</span>
      </div>
      <div className="relative flex items-center gap-4">
        <button
          type="button"
          disabled
          aria-label={DASHBOARD_SEARCH_ROW.label}
          className={ICON_BUTTON_BASE}
        >
          <MaterialIcon name="search" className="text-[20px]" />
        </button>
        <button
          type="button"
          disabled
          aria-label={DASHBOARD_SEARCH_ROW.notificationsLabel}
          className={cn(ICON_BUTTON_BASE, "relative")}
        >
          <MaterialIcon name="notifications" className="text-[20px]" />
          <span
            aria-hidden="true"
            className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-champagne ring-2 ring-navy"
          />
        </button>
        <UserAvatarMenu />
      </div>
    </header>
  );
}
