import type { LandingHeaderCta, LandingNavLink } from "@/types/landing";

export const LANDING_NAV_LINKS: LandingNavLink[] = [
  { id: "features", label: "Features", href: "#features" },
  { id: "how-it-works", label: "How it works", href: "#how-it-works" },
  { id: "ai-plan", label: "AI plan", href: "#ai-plan" },
  { id: "docs", label: "Docs", href: "#docs" },
];

export const LANDING_HEADER_CTAS: LandingHeaderCta[] = [
  { id: "login", label: "Log in", href: "/login", kind: "ghost" },
  { id: "signup", label: "Sign up", href: "/signup", kind: "gold-outline" },
];
