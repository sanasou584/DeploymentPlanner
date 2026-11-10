import type { ReactNode } from "react";
import { cn } from "@/utils/class-names";

const PIPELINE_NODE_BASE =
  "relative z-10 flex h-[88px] w-[90px] flex-col items-center justify-center rounded-xl border p-2.5 text-center backdrop-blur-md transition-all";

const PIPELINE_NODE_VARIANTS = {
  standard:
    "border-ice/25 bg-panel/60 shadow-lg hover:border-ice/50",
  ai: "border-lavender/70 bg-panel/75 shadow-ai-glow",
} as const;

interface PipelineNodeProps {
  label: string;
  meta?: string;
  highlighted?: boolean;
  icon: ReactNode;
}

export function PipelineNode({ label, meta, highlighted = false, icon }: PipelineNodeProps) {
  return (
    <div
      className={cn(
        PIPELINE_NODE_BASE,
        highlighted ? PIPELINE_NODE_VARIANTS.ai : PIPELINE_NODE_VARIANTS.standard,
      )}
    >
      {icon}
      <span className={cn("mt-1.5 leading-tight text-xs", highlighted ? "font-semibold" : "font-medium")}>
        {label}
      </span>
      {meta ? (
        <span className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-lavender">
          {meta}
        </span>
      ) : null}
    </div>
  );
}
