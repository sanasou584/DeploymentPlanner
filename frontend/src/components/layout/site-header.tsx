import Link from "next/link";
import { BRAND } from "@/data/brand";
import { HOME_ROUTE } from "@/data/navigation";
import { buttonClass } from "@/shared/button";
import { MaterialIcon } from "@/shared/material-icon";

interface SiteHeaderProps {
  prompt: string;
  ctaLabel: string;
  ctaHref: string;
}

export function SiteHeader({ prompt, ctaLabel, ctaHref }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex h-[72px] w-full items-center justify-between border-b border-ice/15 bg-navy/80 px-6 backdrop-blur-md sm:px-12 lg:px-20">
      <Link href={HOME_ROUTE.href} className="group flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ice text-navy shadow-md transition-transform group-hover:scale-105">
          <MaterialIcon name="rocket_launch" className="text-[24px]" />
        </div>
        <span className="font-display text-headline-sm tracking-tight text-foam">
          {BRAND.wordmarkMain} <span className="text-ice">{BRAND.wordmarkAccent}</span>
        </span>
      </Link>
      <div className="flex items-center gap-6">
        <span className="font-body-md text-mist">{prompt}</span>
        <Link href={ctaHref} className={buttonClass("champagne", "px-5 py-2 tracking-wide")}>
          {ctaLabel}
        </Link>
      </div>
    </header>
  );
}
