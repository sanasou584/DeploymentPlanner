import { BRAND } from "@/data/brand";
import {
  LANDING_FOOTER_BLURB,
  LANDING_FOOTER_COLUMNS,
  LANDING_FOOTER_COPYRIGHT,
  LANDING_FOOTER_STATUS,
} from "@/data/landing-footer";
import { MaterialIcon } from "@/shared/material-icon";
import { cn } from "@/utils/class-names";
import type { FooterLinkKind, LandingFooterLink } from "@/types/landing";

const FOOTER_LINK_STYLES: Record<FooterLinkKind, string> = {
  anchor: "transition-colors hover:text-ice",
  external: "transition-colors hover:text-ice",
  status: "flex items-center gap-2 transition-colors hover:text-ice",
};

function FooterLinkView({ link }: { link: LandingFooterLink }) {
  if (link.kind === "external") {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className={FOOTER_LINK_STYLES[link.kind]}
      >
        {link.label}
      </a>
    );
  }
  return (
    <a href={link.href} className={FOOTER_LINK_STYLES[link.kind]}>
      {link.label}
      {link.kind === "status" ? <span className="h-2 w-2 rounded-full bg-mint" /> : null}
    </a>
  );
}

export function Footer() {
  return (
    <footer className="w-full border-t border-steel/40 bg-basin py-16">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-12 px-6 lg:px-20">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-5">
          <div className="flex flex-col items-start gap-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ice text-navy">
                <MaterialIcon name="rocket_launch" className="text-[20px]" />
              </div>
              <span className="font-display text-headline-sm font-semibold text-foam">
                {BRAND.wordmarkMain} <span className="text-ice">{BRAND.wordmarkAccent}</span>
              </span>
            </div>
            <p className="max-w-sm font-display text-[14px] leading-relaxed text-mist">
              {LANDING_FOOTER_BLURB}
            </p>
          </div>
          {LANDING_FOOTER_COLUMNS.map((column) => (
            <div key={column.id} className="flex flex-col gap-3 font-display text-[14px]">
              <span className="mb-1 font-mono text-label-sm font-bold uppercase tracking-wider text-foam">
                {column.heading}
              </span>
              {column.links.map((link) => (
                <FooterLinkView key={link.id} link={link} />
              ))}
            </div>
          ))}
        </div>
        <div
          className={cn(
            "flex flex-col items-center justify-between gap-4 border-t border-steel/30 pt-8",
            "font-display text-body-sm text-mist sm:flex-row",
          )}
        >
          <span>{LANDING_FOOTER_COPYRIGHT}</span>
          <span className="font-mono text-[11px] text-teal">{LANDING_FOOTER_STATUS}</span>
        </div>
      </div>
    </footer>
  );
}
