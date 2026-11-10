import type { MaterialIconName } from "@/types/icons";

export type PillTone = "feature" | "quiet" | "champagne";

export type PillIconTone = "teal" | "lavender";

export interface FeaturePill {
  id: string;
  label: string;
  icon: MaterialIconName;
  iconTone?: PillIconTone;
  iconFill?: boolean;
}
