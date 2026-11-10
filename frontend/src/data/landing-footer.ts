import type { LandingFooterColumn } from "@/types/landing";

export const LANDING_FOOTER_BLURB =
  "Autonomous AI-powered Kubernetes planning and GitOps deployment engine. Engineered for security, human oversight, and enterprise cluster velocity.";

export const LANDING_FOOTER_COPYRIGHT =
  "© 2026 DeploymentPlanner AI. All rights reserved.";

export const LANDING_FOOTER_STATUS = "SYSTEM STATUS: ALL OPERATIONAL";

export const LANDING_FOOTER_COLUMNS: LandingFooterColumn[] = [
  {
    id: "product",
    heading: "Product",
    links: [
      { id: "features", label: "Features", href: "#features", kind: "anchor" },
      { id: "how-it-works", label: "How it works", href: "#how-it-works", kind: "anchor" },
      { id: "ai-plan", label: "AI plan", href: "#ai-plan", kind: "anchor" },
      { id: "integrations", label: "Integrations", href: "#integrations", kind: "anchor" },
    ],
  },
  {
    id: "resources",
    heading: "Resources",
    links: [
      { id: "docs", label: "Docs", href: "#docs", kind: "anchor" },
      { id: "github", label: "GitHub", href: "https://github.com", kind: "external" },
      { id: "status", label: "Status", href: "#status", kind: "status" },
      { id: "changelog", label: "Changelog", href: "#changelog", kind: "anchor" },
    ],
  },
  {
    id: "legal",
    heading: "Legal",
    links: [
      { id: "privacy", label: "Privacy", href: "#privacy", kind: "anchor" },
      { id: "terms", label: "Terms", href: "#terms", kind: "anchor" },
      { id: "security", label: "Security", href: "#security", kind: "anchor" },
    ],
  },
];
