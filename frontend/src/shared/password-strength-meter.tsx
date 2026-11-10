import { cn } from "@/utils/class-names";

const SEGMENT_COUNT = 4;

const SEGMENT_BASE = "h-1 flex-1 rounded-full";

interface PasswordStrengthMeterProps {
  score: number;
  className?: string;
}

export function PasswordStrengthMeter({ score, className }: PasswordStrengthMeterProps) {
  return (
    <div
      aria-label={`Password strength: ${score} of ${SEGMENT_COUNT}`}
      aria-valuemax={SEGMENT_COUNT}
      aria-valuemin={0}
      aria-valuenow={score}
      role="progressbar"
      className={cn("mt-1.5 flex items-center gap-1.5 px-1", className)}
    >
      {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className={cn(SEGMENT_BASE, index < score ? "bg-mint" : "border border-steel/60 bg-basin")}
        />
      ))}
    </div>
  );
}
