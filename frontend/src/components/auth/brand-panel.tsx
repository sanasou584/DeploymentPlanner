import type { ReactNode } from "react";
import { MaterialIcon } from "@/shared/material-icon";
import { Pill } from "@/shared/pill";
import type { FeaturePill } from "@/types/pill";
import { CapabilityPills } from "@/components/auth/capability-pills";

interface BrandPanelProps {
  badge: FeaturePill;
  headline: ReactNode;
  subtitle: string;
  children: ReactNode;
  pillsClassName?: string;
}

export function BrandPanel({ badge, headline, subtitle, children, pillsClassName = "mt-10" }: BrandPanelProps) {
  return (
    <section className="flex flex-col justify-center">
      <div className="mb-6 w-fit">
        <Pill
          tone="feature"
          icon={
            <MaterialIcon
              name={badge.icon}
              fill={badge.iconFill}
              className={badge.iconTone === "lavender" ? "text-[15px] text-lavender" : "text-[15px] text-teal"}
            />
          }
        >
          {badge.label}
        </Pill>
      </div>
      <h1 className="mb-4 text-[40px] font-extrabold leading-[1.12] tracking-tight text-foam sm:text-[52px]">
        {headline}
      </h1>
      <p className="mb-10 max-w-xl text-[18px] font-normal leading-relaxed text-mist">{subtitle}</p>
      {children}
      <CapabilityPills className={pillsClassName} />
    </section>
  );
}
