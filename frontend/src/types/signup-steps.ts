import type { MaterialIconName } from "@/types/icons";

export type StepIconTone = "teal" | "champagne" | "lavender";

export interface StepTextIndicator {
  kind: "text";
  label: string;
}

export interface StepChipIndicator {
  kind: "chip";
  tone: "champagne" | "ai";
  label: string;
}

export type StepIndicator = StepTextIndicator | StepChipIndicator;

export interface SignupStep {
  id: string;
  step: string;
  title: string;
  icon: MaterialIconName;
  iconFill?: boolean;
  iconTone: StepIconTone;
  indicator: StepIndicator;
}
