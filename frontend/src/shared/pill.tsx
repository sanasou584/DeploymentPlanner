import type { ReactNode } from "react";
import type { PillTone } from "@/types/pill";
import { cn } from "@/utils/class-names";

const PILL_TONES: Record<PillTone, string> = {
  feature: "border border-steel bg-panel/80 px-3 py-1.5 text-foam shadow-sm backdrop-blur-sm",
  quiet: "border border-steel/60 bg-basin/60 px-3.5 py-1.5 text-mist backdrop-blur-sm",
  champagne: "border border-champagne bg-champagne/12 px-3 py-1 text-champagne",
};

interface PillProps {
  tone?: PillTone;
  icon: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Pill({ tone = "quiet", icon, className, children }: PillProps) {
  return (
    <div
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full text-xs font-medium",
        PILL_TONES[tone],
        className,
      )}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}
