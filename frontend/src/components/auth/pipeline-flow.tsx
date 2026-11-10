import { HIGHLIGHTED_STEP_IDS, PIPELINE_NODE_ICONS, PIPELINE_STEPS } from "@/data/pipeline";
import { GitHubIcon } from "@/shared/icons/github-icon";
import { MaterialIcon } from "@/shared/material-icon";
import { PipelineNode } from "@/shared/pipeline-node";
import type { PipelineNodeIcon } from "@/types/pipeline";

function renderNodeIcon(icon: PipelineNodeIcon, highlighted: boolean) {
  if (icon === "github-logo") {
    return <GitHubIcon className="h-5 w-5 fill-current text-teal" />;
  }
  return (
    <MaterialIcon
      name={icon}
      fill={highlighted}
      className={highlighted ? "text-[20px] text-lavender" : "text-[20px] text-teal"}
    />
  );
}

export function PipelineFlow() {
  return (
    <div className="relative my-3 w-full max-w-[530px] select-none">
      <div className="absolute -top-7 right-[98px] z-20 flex items-center gap-2 rounded-lg border border-ice/30 bg-basin/90 px-3 py-1.5 shadow-xl backdrop-blur-md">
        <span className="font-mono text-xs text-foam">replicas: 3</span>
        <span className="rounded border border-mint/30 bg-mint/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-mint">
          Valid
        </span>
      </div>
      <div className="absolute -bottom-8 left-[110px] z-20 flex items-center gap-2.5 rounded-lg border border-ice/30 bg-basin/90 px-3 py-1.5 shadow-xl backdrop-blur-md">
        <span className="text-xs font-medium text-mist">HPA 70% CPU</span>
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-panel">
          <div className="h-full w-[70%] rounded-full bg-linear-to-r from-teal to-mint" />
        </div>
      </div>
      <div className="relative flex items-center justify-between">
        <div className="pointer-events-none absolute left-6 right-6 top-1/2 z-0 h-[2px] -translate-y-1/2 border-t-2 border-dashed border-teal/50" />
        {PIPELINE_STEPS.map((step) => {
          const highlighted = HIGHLIGHTED_STEP_IDS.includes(step.id);
          return (
            <PipelineNode
              key={step.id}
              label={step.label}
              meta={step.meta}
              highlighted={highlighted}
              icon={renderNodeIcon(PIPELINE_NODE_ICONS[step.id], highlighted)}
            />
          );
        })}
      </div>
    </div>
  );
}
