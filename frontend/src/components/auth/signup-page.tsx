import { BrandPanel } from "@/components/auth/brand-panel";
import { SignupCard } from "@/components/auth/signup-card";
import { SignupSteps } from "@/components/auth/signup-steps";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { REQUEST_ACCESS_PILL } from "@/data/capabilities";
import { AUTH_PAGE_PROMPTS } from "@/data/navigation";

export function SignupPage() {
  const prompts = AUTH_PAGE_PROMPTS.signup;

  return (
    <>
      <SiteHeader
        prompt={prompts.headerPrompt}
        ctaLabel={prompts.headerCta.label}
        ctaHref={prompts.headerCta.href}
      />
      <main className="relative z-10 mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-12 items-center gap-8 px-6 py-8 sm:px-10 lg:px-16">
        <div className="col-span-12 lg:col-span-7">
          <BrandPanel
            badge={REQUEST_ACCESS_PILL}
            headline={
              <>
                Start planning your deployments
                <br />
                <span className="text-ice">in minutes</span>
              </>
            }
            subtitle="Create your account and an administrator will review it. Then connect a repository and let AI build your deployment plan."
            pillsClassName="mt-6"
          >
            <SignupSteps />
          </BrandPanel>
        </div>
        <div className="col-span-12 lg:col-span-5">
          <SignupCard />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
