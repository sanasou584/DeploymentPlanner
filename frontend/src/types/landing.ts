import type { MaterialIconName } from "@/types/icons";

export type LandingSectionId = "features" | "how-it-works" | "ai-plan" | "docs";

export interface LandingNavLink {
  id: LandingSectionId;
  label: string;
  href: `#${LandingSectionId}`;
}

export interface SatelliteFloat {
  path: [number, number, number];
  duration: number;
}

export interface ReplicasSatelliteRow {
  id: "replicas";
  ariaLabel: string;
  float: SatelliteFloat;
  codeLabel: string;
  codeValue: string;
  tag: string;
}

export interface ArgoSatelliteRow {
  id: "argo";
  ariaLabel: string;
  float: SatelliteFloat;
  icon: MaterialIconName;
  title: string;
  status: string;
}

export type LandingCtaKind = "ice" | "teal-outline" | "gold-outline" | "ghost";

export type LandingRouteId = "login" | "signup";

export type LandingHeaderCtaKind = "ghost" | "gold-outline";

export interface LandingHeaderCta {
  id: LandingRouteId;
  label: string;
  href: `/${LandingRouteId}`;
  kind: LandingHeaderCtaKind;
}

export interface HeroBadge {
  id: "ai-powered" | "human-validation";
  icon: MaterialIconName;
  label: string;
}

export interface HeroHeadline {
  main: string;
  accent: string;
}

export interface HeroCta {
  id: "get-started" | "github-connect";
  label: string;
  href: `/${LandingRouteId}`;
  kind: LandingCtaKind;
  icon?: MaterialIconName;
}

export interface ServiceTab {
  id: "frontend" | "backend" | "database";
  label: string;
}

export interface PlanMetric {
  id: "replicas" | "cpu-limit" | "memory";
  label: string;
  value: string;
}

export interface PlanWindow {
  id: "plan-preview";
  title: string;
  metrics: PlanMetric[];
  hpa: {
    id: "hpa";
    icon: MaterialIconName;
    label: string;
    meta: string;
  };
  aiChip: {
    id: "ai-chip";
    icon: MaterialIconName;
    label: string;
  };
  riskLabel: string;
  approveLabel: string;
  rejectLabel: string;
}

export interface TechTool {
  id: string;
  label: string;
  icon: MaterialIconName;
}

export type FeatureTone = "teal" | "lavender";

export interface FeatureDescriptionSegment {
  text: string;
  kind: "text" | "code";
}

export interface FeatureCard {
  id: string;
  icon: MaterialIconName;
  title: string;
  description: FeatureDescriptionSegment[];
  tone: FeatureTone;
  tag?: string;
}

export type WorkflowStepTone = "ice" | "lavender" | "gold" | "mint";

export interface WorkflowStep {
  id: string;
  index: string;
  icon: MaterialIconName;
  title: string;
  description: string;
  tone: WorkflowStepTone;
  badge?: string;
}

export interface ChecklistItem {
  id: string;
  icon: MaterialIconName;
  label: string;
}

export type SyntaxTone = "key" | "value" | "number" | "string" | "plain";

export interface YamlSegment {
  text: string;
  tone: SyntaxTone;
}

export interface YamlLine {
  id: string;
  indent: number;
  segments: YamlSegment[];
}

export interface AiPlanEditor {
  id: "yaml-editor";
  file: string;
  chip: {
    icon: MaterialIconName;
    label: string;
  };
  lines: YamlLine[];
  statusMeta: string;
  statusOk: string;
}

export type FooterLinkKind = "anchor" | "external" | "status";

export interface LandingFooterLink {
  id: string;
  label: string;
  href: string;
  kind: FooterLinkKind;
}

export interface LandingFooterColumn {
  id: string;
  heading: string;
  links: LandingFooterLink[];
}
