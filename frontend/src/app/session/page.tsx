import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AUTH_PAGE_PROMPTS } from "@/data/navigation";
import { GithubHandoff } from "@/components/auth/github-handoff";

export const metadata: Metadata = {
  title: "Session",
};

export default function Session() {
  const prompts = AUTH_PAGE_PROMPTS.login;

  return (
    <>
      <SiteHeader
        prompt={prompts.headerPrompt}
        ctaLabel={prompts.headerCta.label}
        ctaHref={prompts.headerCta.href}
      />
      <main className="relative z-10 mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-12 items-center gap-8 px-6 py-8 sm:px-10 lg:px-16">
        <GithubHandoff />
      </main>
      <SiteFooter />
    </>
  );
}
