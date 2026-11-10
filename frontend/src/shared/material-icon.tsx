import type { MaterialIconName } from "@/types/icons";
import { cn } from "@/utils/class-names";

interface MaterialIconProps {
  name: MaterialIconName;
  fill?: boolean;
  className?: string;
}

export function MaterialIcon({ name, fill = false, className }: MaterialIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-outlined select-none", className)}
      style={fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}
