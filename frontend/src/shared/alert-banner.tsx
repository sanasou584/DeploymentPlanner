import type { ReactNode } from "react";
import type { AuthAlertTone } from "@/types/auth";
import { cn } from "@/utils/class-names";

const ALERT_TONES: Record<AuthAlertTone, string> = {
  crimson: "border-crimson bg-crimson/12 text-crimson",
  orange: "border-orange bg-orange/12 text-orange",
  champagne: "border-champagne bg-champagne/12 text-champagne",
};

interface AlertBannerProps {
  tone: AuthAlertTone;
  icon: ReactNode;
  className?: string;
  children: ReactNode;
}

export function AlertBanner({ tone, icon, className, children }: AlertBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm font-medium",
        ALERT_TONES[tone],
        className,
      )}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}
