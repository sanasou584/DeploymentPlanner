import { AuthCard } from "@/components/auth/auth-card";
import { BrandPanel } from "@/components/auth/brand-panel";
import { PipelineFlow } from "@/components/auth/pipeline-flow";
import { LoginForm } from "@/components/auth/login-form";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AI_BADGE_PILL } from "@/data/capabilities";
import { AUTH_PAGE_PROMPTS } from "@/data/navigation";

export function LoginPage() {
  const prompts = AUTH_PAGE_PROMPTS.login;

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
            badge={AI_BADGE_PILL}
            headline={
              <>
                Ship to Kubernetes
                <br />
                <span className="text-ice">without the headache</span>
              </>
            }
            subtitle="Analyze your repository, get an AI deployment plan, and deploy with GitOps, all in one place."
          >
            <PipelineFlow />
          </BrandPanel>
        </div>
        <div className="col-span-12 lg:col-span-5">
          <AuthCard
            variant="login"
            title="Welcome back"
            subtitle="Log in to continue to your projects."
            form={<LoginForm />}
            footerMessage={prompts.cardPrompt}
            footerCtaLabel={prompts.cardCta.label}
            footerCtaHref={prompts.cardCta.href}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
