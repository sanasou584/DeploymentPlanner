export interface NavLink {
  id: string;
  label: string;
  href: string;
}

export type AuthPageId = "login" | "signup";

export interface AuthPagePromptSet {
  id: AuthPageId;
  headerPrompt: string;
  headerCta: NavLink;
  cardPrompt: string;
  cardCta: NavLink;
}
