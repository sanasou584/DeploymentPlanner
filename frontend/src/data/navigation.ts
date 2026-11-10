import type { AuthPageId, AuthPagePromptSet, NavLink } from "@/types/navigation";

export const HOME_ROUTE: NavLink = {
  id: "landing",
  label: "DeploymentPlanner AI",
  href: "/",
};

export const AUTH_LOGIN_ROUTE: NavLink = {
  id: "auth-login",
  label: "Log in",
  href: "/login",
};

export const AUTH_PAGE_PROMPTS: Record<AuthPageId, AuthPagePromptSet> = {
  login: {
    id: "login",
    headerPrompt: "New here?",
    headerCta: { id: "signup", label: "Sign up", href: "/signup" },
    cardPrompt: "Don't have an account?",
    cardCta: { id: "signup", label: "Sign up", href: "/signup" },
  },
  signup: {
    id: "signup",
    headerPrompt: "Already have an account?",
    headerCta: { id: "login", label: "Log in", href: "/login" },
    cardPrompt: "Already have an account?",
    cardCta: { id: "login", label: "Log in", href: "/login" },
  },
};
