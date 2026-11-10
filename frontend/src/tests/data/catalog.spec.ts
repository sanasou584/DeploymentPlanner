import { describe, expect, it } from "vitest";
import { AI_BADGE_PILL, CAPABILITY_PILLS, REQUEST_ACCESS_PILL } from "@/data/capabilities";
import { FOOTER_COPYRIGHT, FOOTER_LINKS } from "@/data/footer";
import { HOME_ROUTE } from "@/data/navigation";
import { HIGHLIGHTED_STEP_IDS, PIPELINE_NODE_ICONS, PIPELINE_STEPS } from "@/data/pipeline";
import { SIGNUP_STEPS } from "@/data/signup-steps";
import { AUTH_PAGE_PROMPTS } from "@/data/navigation";

function assertUniqueIds(rows: readonly { id: string }[]): void {
  const ids = rows.map((row) => row.id);
  expect(new Set(ids).size).toBe(ids.length);
}

describe("navigation data", () => {
  it("declares a home route so brand marks lead back to the landing", () => {
    expect(HOME_ROUTE.href).toBe("/");
    expect(HOME_ROUTE.label.length).toBeGreaterThan(0);
  });
});

describe("footer data", () => {
  it("declares unique link ids with labels and hrefs", () => {
    assertUniqueIds(FOOTER_LINKS);
    for (const link of FOOTER_LINKS) {
      expect(link.label.length).toBeGreaterThan(0);
      expect(link.href.length).toBeGreaterThan(0);
    }
  });

  it("states a copyright line", () => {
    expect(FOOTER_COPYRIGHT).toMatch(/^© 2\d{3}/);
  });
});

describe("pipeline data", () => {
  it("declares unique step ids", () => {
    assertUniqueIds(PIPELINE_STEPS);
  });

  it("maps every step to an icon", () => {
    for (const step of PIPELINE_STEPS) {
      expect(PIPELINE_NODE_ICONS[step.id]).toBeDefined();
    }
  });

  it("registers exactly one highlighted step", () => {
    expect(HIGHLIGHTED_STEP_IDS).toHaveLength(1);
    const stepIds = PIPELINE_STEPS.map((step) => step.id);
    for (const id of HIGHLIGHTED_STEP_IDS) {
      expect(stepIds).toContain(id);
    }
  });

  it("declares a meta label only on the highlighted step", () => {
    for (const step of PIPELINE_STEPS) {
      if (step.meta) {
        expect(HIGHLIGHTED_STEP_IDS).toContain(step.id);
      }
    }
  });
});

describe("pills data", () => {
  it("declares unique pill ids with labels", () => {
    assertUniqueIds([AI_BADGE_PILL, ...CAPABILITY_PILLS]);
    for (const pill of [AI_BADGE_PILL, ...CAPABILITY_PILLS]) {
      expect(pill.label.length).toBeGreaterThan(0);
    }
  });

  it("limits lavender accents to AI content", () => {
    for (const pill of CAPABILITY_PILLS) {
      if (pill.iconTone === "lavender") {
        expect(pill.id).toContain("ai");
      }
    }
  });
});

describe("signup steps data", () => {
  it("declares three numbered steps with unique ids", () => {
    assertUniqueIds(SIGNUP_STEPS);
    expect(SIGNUP_STEPS).toHaveLength(3);
    SIGNUP_STEPS.forEach((step, index) => {
      expect(step.step).toBe(`Step 0${index + 1}`);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.indicator.label.length).toBeGreaterThan(0);
    });
  });

  it("chips carry a tone and text indicators stay plain", () => {
    const chips = SIGNUP_STEPS.filter((step) => step.indicator.kind === "chip");
    expect(chips).toHaveLength(2);
    for (const chip of chips) {
      if (chip.indicator.kind === "chip") {
        expect(["champagne", "ai"]).toContain(chip.indicator.tone);
      }
    }
  });
});

describe("auth page prompts", () => {
  it("cross-links every auth page to its counterpart", () => {
    const login = AUTH_PAGE_PROMPTS.login;
    const signup = AUTH_PAGE_PROMPTS.signup;

    expect(login.headerPrompt).toBe("New here?");
    expect(login.headerCta.label).toBe("Sign up");
    expect(login.headerCta.href).toBe("/signup");
    expect(login.cardCta.label).toBe("Sign up");
    expect(login.cardCta.href).toBe("/signup");

    expect(signup.headerPrompt).toBe("Already have an account?");
    expect(signup.headerCta.label).toBe("Log in");
    expect(signup.headerCta.href).toBe("/login");
    expect(signup.cardCta.label).toBe("Log in");
    expect(signup.cardCta.href).toBe("/login");
  });
});

describe("request access pill", () => {
  it("exists as its own ai-accented badge", () => {
    expect(REQUEST_ACCESS_PILL.iconTone).toBe("lavender");
    expect(REQUEST_ACCESS_PILL.label).toBe("Request access");
  });
});
