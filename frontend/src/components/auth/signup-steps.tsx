import { SIGNUP_STEPS } from "@/data/signup-steps";
import { MaterialIcon } from "@/shared/material-icon";
import { cn } from "@/utils/class-names";
import type { SignupStep, StepIndicator } from "@/types/signup-steps";

const STEP_ICON_TONES: Record<SignupStep["iconTone"], string> = {
  teal: "text-teal",
  champagne: "text-champagne",
  lavender: "text-lavender",
};

const STEP_CHIP_TONES: Record<Extract<StepIndicator, { kind: "chip" }>["tone"], string> = {
  champagne:
    "border border-champagne bg-champagne/10 text-champagne px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
  ai: "border border-lavender/70 bg-lavender/15 text-lavender px-2 py-0.5 rounded font-mono text-[10px] font-semibold uppercase tracking-wider",
};

function StepIndicatorView({ indicator }: { indicator: StepIndicator }) {
  if (indicator.kind === "text") {
    return <span className="text-xs text-mist">{indicator.label}</span>;
  }
  return <span className={STEP_CHIP_TONES[indicator.tone]}>{indicator.label}</span>;
}

function StepRow({ step }: { step: SignupStep }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-ice/25 bg-panel/60 p-3 shadow-lg backdrop-blur-md transition-all hover:border-ice/50">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-steel bg-basin",
          STEP_ICON_TONES[step.iconTone],
        )}
      >
        <MaterialIcon name={step.icon} fill={step.iconFill} className="text-[20px]" />
      </div>
      <div className="flex flex-1 items-center justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-mist">{step.step}</div>
          <div className="text-sm font-bold text-foam">{step.title}</div>
        </div>
        <StepIndicatorView indicator={step.indicator} />
      </div>
    </div>
  );
}

export function SignupSteps() {
  return (
    <div className="relative my-2 w-full max-w-[530px] select-none">
      <div className="pointer-events-none absolute bottom-6 left-7 top-6 z-0 border-l-2 border-dashed border-teal/50" />
      <div className="relative z-10 space-y-3">
        {SIGNUP_STEPS.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </div>
    </div>
  );
}
