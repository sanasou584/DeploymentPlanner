import Link from "next/link";
import type { ReactNode } from "react";
import { GithubButton } from "@/components/auth/github-button";
import { cn } from "@/utils/class-names";
import type { AuthPageId } from "@/types/navigation";

const AUTH_CARD_VARIANTS: Record<
  AuthPageId,
  { heading: string; subtitle: string; divider: string; note: string }
> = {
  login: { heading: "mb-1.5", subtitle: "mb-8", divider: "my-6", note: "mt-7" },
  signup: { heading: "mb-1", subtitle: "mb-5", divider: "my-4", note: "mt-5" },
};

interface AuthCardProps {
  variant: AuthPageId;
  title: string;
  subtitle: string;
  form: ReactNode;
  footerMessage: string;
  footerCtaLabel: string;
  footerCtaHref: string;
}

export function AuthCard({
  variant,
  title,
  subtitle,
  form,
  footerMessage,
  footerCtaLabel,
  footerCtaHref,
}: AuthCardProps) {
  const tone = AUTH_CARD_VARIANTS[variant];
  return (
    <section className="flex items-center justify-center">
      <div className="w-full max-w-[440px] rounded-[24px] border border-ice/25 bg-panel/60 p-6 shadow-2xl shadow-basin/90 backdrop-blur-xl transition-all sm:p-10">
        <h2 className={cn("text-[32px] font-bold leading-tight text-foam", tone.heading)}>
          {title}
        </h2>
        <p className={cn("text-sm font-normal text-mist", tone.subtitle)}>{subtitle}</p>
        {form}
        <div className={cn("flex items-center gap-4", tone.divider)}>
          <div className="h-px flex-1 bg-steel/70" />
          <span className="text-xs font-medium uppercase text-mist">or</span>
          <div className="h-px flex-1 bg-steel/70" />
        </div>
        <GithubButton />
        <div className={cn("text-center text-xs text-mist", tone.note)}>
          <span>{footerMessage} </span>
          <Link
            className="ml-1 cursor-pointer font-semibold text-teal transition-colors hover:underline"
            href={footerCtaHref}
          >
            {footerCtaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
