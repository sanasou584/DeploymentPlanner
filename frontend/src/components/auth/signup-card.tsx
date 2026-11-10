"use client";

import { useState } from "react";
import type { AuthAccount } from "@/types/auth";
import { AUTH_PAGE_PROMPTS } from "@/data/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupConfirmation } from "@/components/auth/signup-confirmation";
import { SignupForm } from "@/components/auth/signup-form";

export function SignupCard() {
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const prompts = AUTH_PAGE_PROMPTS.signup;

  if (account) {
    return (
      <section className="flex w-full items-center justify-center">
        <SignupConfirmation account={account} />
      </section>
    );
  }

  return (
    <AuthCard
      variant="signup"
      title="Create your account"
      subtitle="Request access to DeploymentPlanner AI."
      form={<SignupForm onCreated={setAccount} />}
      footerMessage={prompts.cardPrompt}
      footerCtaLabel={prompts.cardCta.label}
      footerCtaHref={prompts.cardCta.href}
    />
  );
}
