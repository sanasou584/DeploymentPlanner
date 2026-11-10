import { FOOTER_COPYRIGHT, FOOTER_LINKS } from "@/data/footer";
import { StatusDot } from "@/shared/status-dot";

export function SiteFooter() {
  return (
    <footer className="relative z-20 flex h-[56px] w-full shrink-0 items-center justify-between border-t border-ice/15 px-6 text-xs text-mist sm:px-12">
      <div>
        <span>{FOOTER_COPYRIGHT}</span>
      </div>
      <div className="flex items-center space-x-6">
        {FOOTER_LINKS.map((link) => (
          <a key={link.id} className="transition-colors hover:text-foam" href={link.href}>
            {link.label}
          </a>
        ))}
        <div className="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-foam">
          <StatusDot />
          <span>Status</span>
        </div>
      </div>
    </footer>
  );
}
