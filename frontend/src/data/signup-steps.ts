import type { SignupStep } from "@/types/signup-steps";

export const SIGNUP_STEPS: SignupStep[] = [
  {
    id: "create-account",
    step: "Step 01",
    title: "Create your account",
    icon: "person_add",
    iconTone: "teal",
    indicator: { kind: "text", label: "Instant" },
  },
  {
    id: "admin-approval",
    step: "Step 02",
    title: "Administrator approval",
    icon: "verified_user",
    iconTone: "champagne",
    indicator: { kind: "chip", tone: "champagne", label: "Pending" },
  },
  {
    id: "analyze-and-deploy",
    step: "Step 03",
    title: "Analyze and deploy",
    icon: "rocket_launch",
    iconFill: true,
    iconTone: "lavender",
    indicator: { kind: "chip", tone: "ai", label: "AI" },
  },
];
