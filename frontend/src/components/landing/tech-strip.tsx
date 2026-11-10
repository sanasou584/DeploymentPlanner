import { TECH_STRIP_LABEL, TECH_TOOLS } from "@/data/tech-strip";
import { MaterialIcon } from "@/shared/material-icon";

export function TechStrip() {
  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-6 px-6 py-12 lg:px-20">
      <span className="font-mono text-label-sm uppercase tracking-widest text-mist opacity-80">
        {TECH_STRIP_LABEL}
      </span>
      <div className="flex w-full flex-wrap items-center justify-center gap-6 text-mist opacity-75 md:gap-12">
        {TECH_TOOLS.map((tool) => (
          <div
            key={tool.id}
            className="flex items-center gap-2 px-3 py-2 transition-colors hover:text-ice"
          >
            <MaterialIcon name={tool.icon} className="text-[20px]" />
            <span className="font-display text-[15px] font-medium">{tool.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
