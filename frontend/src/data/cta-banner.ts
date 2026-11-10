import type { LandingCtaKind, LandingRouteId } from "@/types/landing";

export interface CtaAction {
  id: "create-account" | "login";
  label: string;
  href: `/${LandingRouteId}`;
  kind: LandingCtaKind;
  icon?: "arrow_forward";
}

export const CTA_BANNER_ACTIONS: CtaAction[] = [
  {
    id: "create-account",
    label: "Create your account",
    href: "/signup",
    kind: "ice",
    icon: "arrow_forward",
  },
  { id: "login", label: "Log in", href: "/login", kind: "gold-outline" },
];

export const CTA_BANNER = {
  id: "cta-banner",
  heading: "Ready to plan your first deployment?",
  body: "Connect your repo in seconds. No credit card required. Free tier includes up to 5 clusters.",
} as const;
