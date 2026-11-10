import { CAPABILITY_PILLS } from "@/data/capabilities";
import { MaterialIcon } from "@/shared/material-icon";
import { Pill } from "@/shared/pill";
import { cn } from "@/utils/class-names";

interface CapabilityPillsProps {
  className?: string;
}

export function CapabilityPills({ className }: CapabilityPillsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {CAPABILITY_PILLS.map((pill) => (
        <Pill
          key={pill.id}
          tone="quiet"
          icon={
            <MaterialIcon
              name={pill.icon}
              fill={pill.iconFill}
              className={pill.iconTone === "lavender" ? "text-lavender" : "text-teal"}
            />
          }
        >
          {pill.label}
        </Pill>
      ))}
    </div>
  );
}
