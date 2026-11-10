"use client";

import { useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useAccountLogout } from "@/hooks/use-auth-request";
import { useSessionClear } from "@/hooks/use-auth-session";
import { LOGOUT_ROUTE } from "@/data/dashboard";
import { initials, titleCase } from "@/utils/identity";
import { MaterialIcon } from "@/shared/material-icon";

export function DashboardProfileCard() {
  const { user, token } = useAuthSession();
  const { pending, logout } = useAccountLogout();
  const clearSession = useSessionClear();
  const router = useRouter();

  async function handleLogout() {
    if (!token) return;
    try {
      await logout(token);
    } finally {
      clearSession();
      router.replace(LOGOUT_ROUTE.href);
    }
  }

  if (!user) {
    return null;
  }
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-mid/50 p-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-tide/40 bg-lagoon font-display text-body-sm font-bold text-tide-pale">
          {initials(user.name)}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-display text-[13px] font-medium text-frost">
            {user.name}
          </span>
          <span className="mt-0.5 w-fit rounded bg-lagoon/40 px-1.5 py-0.5 font-mono text-[10px] text-tide">
            {titleCase(user.role)}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        aria-label={LOGOUT_ROUTE.label}
        title={LOGOUT_ROUTE.label}
        disabled={pending}
        className="shrink-0 rounded p-1.5 text-smoke transition-colors enabled:hover:bg-surface-high enabled:hover:text-rose"
      >
        <MaterialIcon name="logout" className="text-[20px]" />
      </button>
    </div>
  );
}
