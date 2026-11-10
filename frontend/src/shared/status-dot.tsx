import { cn } from "@/utils/class-names";

interface StatusDotProps {
  className?: string;
}

export function StatusDot({ className }: StatusDotProps) {
  return (
    <span className={cn("relative flex h-2 w-2", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
    </span>
  );
}
