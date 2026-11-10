import { describe, expect, it } from "vitest";
import { AI_PLAN_BADGE, AI_PLAN_BODY, AI_PLAN_CHECKLIST, AI_PLAN_EDITOR } from "@/data/ai-plan";
import { CTA_BANNER, CTA_BANNER_ACTIONS } from "@/data/cta-banner";
import {
  ARGO_SATELLITE,
  HERO_BADGE,
  HERO_CTAS,
  HERO_HEADLINE,
  HERO_REASSURANCE,
  PLAN_WINDOW,
  REPLICA_SATELLITE,
  SERVICE_TABS,
} from "@/data/hero";
import { FEATURE_CARDS } from "@/data/features";
import { LANDING_HEADER_CTAS, LANDING_NAV_LINKS } from "@/data/landing-nav";
import {
  LANDING_FOOTER_BLURB,
  LANDING_FOOTER_COLUMNS,
  LANDING_FOOTER_COPYRIGHT,
  LANDING_FOOTER_STATUS,
} from "@/data/landing-footer";
import { TECH_STRIP_LABEL, TECH_TOOLS } from "@/data/tech-strip";
import {
  WORKFLOW_HEADING,
  WORKFLOW_LABEL,
  WORKFLOW_STEPS,
  WORKFLOW_SUBHEADING,
} from "@/data/workflow";

function assertUniqueIds(rows: readonly { id: string }[]): void {
  const ids = rows.map((row) => row.id);
  expect(new Set(ids).size).toBe(ids.length);
}

describe("landing nav data", () => {
  it("anchors every nav row to an in-page section", () => {
    assertUniqueIds(LANDING_NAV_LINKS);
    expect(LANDING_NAV_LINKS.map((link) => link.href)).toEqual([
      "#features",
      "#how-it-works",
      "#ai-plan",
      "#docs",
    ]);
  });

  it("routes header ctas to the auth pages", () => {
    expect(LANDING_HEADER_CTAS.map((cta) => `${cta.id}:${cta.href}:${cta.kind}`)).toEqual([
      "login:/login:ghost",
      "signup:/signup:gold-outline",
    ]);
  });
});

describe("hero data", () => {
  it("carries the mockup headline split", () => {
    expect(HERO_HEADLINE).toEqual({
      main: "Ship to Kubernetes",
      accent: "without the headache",
    });
  });

  it("spells the copy banner rows", () => {
    expect(HERO_BADGE.label).toBe("AI-powered deployment planning");
    expect(HERO_REASSURANCE.label).toBe("Human validation before every deployment");
  });

  it("routes hero ctas to the auth pages", () => {
    expect(HERO_CTAS.map((cta) => `${cta.id}:${cta.href}:${cta.kind}`)).toEqual([
      "get-started:/signup:ice",
      "github-connect:/login:teal-outline",
    ]);
  });

  it("declares the three-service tab switcher", () => {
    expect(SERVICE_TABS.map((tab) => tab.id)).toEqual(["frontend", "backend", "database"]);
  });

  it("aerates the satellites with the requested float loops", () => {
    expect(REPLICA_SATELLITE.float).toEqual({ path: [-5, 5, -5], duration: 5 });
    expect(ARGO_SATELLITE.float).toEqual({ path: [4, -6, 4], duration: 6 });
    expect(REPLICA_SATELLITE.tag).toBe("Valid");
    expect(ARGO_SATELLITE.status).toBe("Synced · Healthy");
  });

  it("fills the plan preview window", () => {
    assertUniqueIds(PLAN_WINDOW.metrics);
    expect(PLAN_WINDOW.metrics.map((metric) => metric.value)).toEqual(["3", "250m", "512Mi"]);
    expect(PLAN_WINDOW.hpa.meta).toBe("Target CPU: 70% · Min 2 · Max 8");
    expect(PLAN_WINDOW.aiChip.label).toContain("Ingress with TLS");
    expect(PLAN_WINDOW.riskLabel).toBe("Risk: Low");
  });
});

describe("tech strip data", () => {
  it("lists seven supported tools", () => {
    assertUniqueIds(TECH_TOOLS);
    expect(TECH_TOOLS).toHaveLength(7);
    expect(TECH_STRIP_LABEL.toLowerCase()).toContain("tools");
  });
});

describe("feature cards data", () => {
  it("renders six puzzle pieces with unique ids", () => {
    assertUniqueIds(FEATURE_CARDS);
    expect(FEATURE_CARDS).toHaveLength(6);
  });

  it("keeps the ai card the only lavender accent with a model tag", () => {
    const lavenders = FEATURE_CARDS.filter((card) => card.tone === "lavender");
    expect(lavenders).toHaveLength(1);
    expect(lavenders[0].tag).toBe("Model v4");
  });

  it("descriptions are non-empty segments", () => {
    for (const card of FEATURE_CARDS) {
      expect(card.description.length).toBeGreaterThan(0);
      for (const segment of card.description) {
        expect(["text", "code"]).toContain(segment.kind);
        expect(segment.text.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("workflow data", () => {
  it("orders five sequential steps from repo to cluster", () => {
    assertUniqueIds(WORKFLOW_STEPS);
    expect(WORKFLOW_STEPS.map((step) => step.index)).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
    ]);
    expect(WORKFLOW_LABEL.toLowerCase()).toContain("workflow");
    expect(WORKFLOW_HEADING.length).toBeGreaterThan(0);
    expect(WORKFLOW_SUBHEADING.length).toBeGreaterThan(0);
  });

  it("hands step four to the user with the you-decide badge", () => {
    const goldSteps = WORKFLOW_STEPS.filter((step) => step.tone === "gold");
    expect(goldSteps).toHaveLength(1);
    expect(goldSteps[0].id).toBe("approve-plan");
    expect(goldSteps[0].badge).toBe("You decide");
    const badged = WORKFLOW_STEPS.filter((step) => step.badge);
    expect(badged).toEqual(goldSteps);
  });
});

describe("ai plan data", () => {
  it("names the guardrails pill and the checklist", () => {
    expect(AI_PLAN_BADGE.label).toBe("Zero Black-Box Executions");
    expect(AI_PLAN_CHECKLIST).toHaveLength(3);
    expect(AI_PLAN_BODY).toContain("trigger remains exclusively in your hands");
  });

  it("prints a syntax-highlighted deployment manifest", () => {
    assertUniqueIds(AI_PLAN_EDITOR.lines);
    expect(AI_PLAN_EDITOR.file).toBe("deployment.yaml");
    expect(AI_PLAN_EDITOR.lines[0].segments[0]).toEqual({ text: "apiVersion", tone: "key" });
    expect(AI_PLAN_EDITOR.lines.at(-1)?.segments.at(-1)?.text).toBe('"128Mi"');
    expect(AI_PLAN_EDITOR.statusOk).toBe("Syntax Validated");
    for (const line of AI_PLAN_EDITOR.lines) {
      expect(line.segments.every((segment) => segment.text.length > 0)).toBe(true);
    }
  });
});

describe("cta banner data", () => {
  it("pushes the visitor to the auth pages", () => {
    expect(CTA_BANNER_ACTIONS.map((action) => action.href)).toEqual(["/signup", "/login"]);
    expect(CTA_BANNER.heading).toContain("deployment");
  });
});

describe("landing footer data", () => {
  it("own three link columns", () => {
    assertUniqueIds(LANDING_FOOTER_COLUMNS);
    expect(LANDING_FOOTER_COLUMNS.map((column) => column.heading)).toEqual([
      "Product",
      "Resources",
      "Legal",
    ]);
    for (const column of LANDING_FOOTER_COLUMNS) {
      assertUniqueIds(column.links);
    }
  });

  it("delegates outward to github only", () => {
    const externals = LANDING_FOOTER_COLUMNS
      .flatMap((column) => column.links)
      .filter((link) => link.kind === "external");
    expect(externals).toHaveLength(1);
    expect(externals[0].href).toBe("https://github.com");
  });

  it("signs the system status line", () => {
    expect(LANDING_FOOTER_COPYRIGHT).toMatch(/^© 2\d{3}/);
    expect(LANDING_FOOTER_STATUS).toMatch(/ALL OPERATIONAL/);
    expect(LANDING_FOOTER_BLURB).toContain("human oversight");
  });
});
