import type { NavLink } from "@/types/navigation";

export interface SignupConfirmationField {
  id: "name" | "email";
  label: string;
}

export const SIGNUP_CONFIRMATION_FIELDS: SignupConfirmationField[] = [
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
];

export const SIGNUP_CONFIRMATION = {
  id: "signup-confirmation",
  icon: "verified_user",
  heading: "Registration submitted",
  message: "Your account is awaiting administrator approval.",
  mutedNote: "You will be able to log in once an administrator approves your account.",
  badge: "Pending approval",
  helpNote: "Need help? Contact your administrator.",
} as const;

export const SIGNUP_CONFIRMATION_CTA: NavLink = {
  id: "signup-confirmation-cta",
  label: "Back to login",
  href: "/login",
};
