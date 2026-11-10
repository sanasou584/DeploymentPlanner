import Link from "next/link";
import { LANDING_HEADER_CTAS, LANDING_NAV_LINKS } from "@/data/landing-nav";
import { BRAND } from "@/data/brand";
import { HOME_ROUTE } from "@/data/navigation";
import { MaterialIcon } from "@/shared/material-icon";
import { buttonClass } from "@/shared/button";
import type { LandingHeaderCta } from "@/types/landing";


const HEADER_CTA_STYLES: Record<LandingHeaderCta["kind"], string> = {
  ghost: "font-body-md text-mist transition-colors hover:text-foam",
  "gold-outline": buttonClass("champagne", "px-5 py-2 tracking-wide"),
};

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 flex h-[72px] w-full items-center justify-between border-b border-ice/15 bg-navy/80 px-6 backdrop-blur-md lg:px-20">
      <Link href={HOME_ROUTE.href} className="group flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ice text-navy shadow-md transition-transform group-hover:scale-105">
          <MaterialIcon name="rocket_launch" className="text-[24px]" />
        </div>
        <span className="font-display text-headline-sm tracking-tight text-foam">
          {BRAND.wordmarkMain} <span className="text-ice">{BRAND.wordmarkAccent}</span>
        </span>
      </Link>
      <nav className="hidden items-center gap-8 font-body-md text-mist md:flex">
        {LANDING_NAV_LINKS.map((link) => (
          <a key={link.id} href={link.href} className="transition-colors hover:text-foam">
            {link.label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-6">
        {LANDING_HEADER_CTAS.map((cta) => (
          <Link key={cta.id} href={cta.href} className={HEADER_CTA_STYLES[cta.kind]}>
            {cta.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
