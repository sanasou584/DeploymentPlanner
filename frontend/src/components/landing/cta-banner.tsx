import Link from "next/link";
import { CTA_BANNER, CTA_BANNER_ACTIONS } from "@/data/cta-banner";
import { MaterialIcon } from "@/shared/material-icon";
import { buttonClass } from "@/shared/button";
import type { LandingCtaKind } from "@/types/landing";

const BANNER_CTA_STYLES: Record<LandingCtaKind, string> = {
  ice: buttonClass("primary", "px-8 py-3.5 text-[16px] hover:bg-ice-dim"),
  "gold-outline": buttonClass("champagne", "px-8 py-3.5"),
  "teal-outline": buttonClass("teal", "px-8 py-3.5"),
  ghost: "font-body-md text-mist transition-colors hover:text-foam",
};

export function CtaBanner() {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-6 py-24 lg:px-20">
      <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[28px] border border-ice/25 bg-panel/60 p-10 text-center shadow-2xl backdrop-blur-xl md:p-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[320px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ice/20 blur-[110px]"
        />
        <div className="relative z-10 flex max-w-2xl flex-col items-center gap-4">
          <h2 className="font-display text-headline-lg font-bold tracking-tight text-foam lg:text-[44px]">
            {CTA_BANNER.heading}
          </h2>
          <p className="font-display text-body-lg text-mist">{CTA_BANNER.body}</p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 pt-4">
          {CTA_BANNER_ACTIONS.map((action) => (
            <Link key={action.id} href={action.href} className={BANNER_CTA_STYLES[action.kind]}>
              <span>{action.label}</span>
              {action.icon ? <MaterialIcon name={action.icon} className="text-[20px]" /> : null}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
