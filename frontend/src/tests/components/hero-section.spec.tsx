// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import React from "react";
import { HeroSection } from "@/components/landing/hero-section";
import { stubMotionEnvironment } from "@/tests/motion-stubs";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, className }, children),
}));

beforeAll(() => {
  stubMotionEnvironment();
});

afterEach(cleanup);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("landing hero", () => {
  it("opens with the headline, ctas, and reassurance", () => {
    render(<HeroSection />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Ship to Kubernetes");
    expect(screen.getByRole("link", { name: "Get started free" }).getAttribute("href")).toBe("/signup");
    expect(
      screen.getByRole("link", { name: /Continue with GitHub/ }).getAttribute("href"),
    ).toBe("/login");
    expect(screen.getByText("Human validation before every deployment")).toBeTruthy();
  });

  it("declares the three service tabs and activates one", () => {
    render(<HeroSection />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(
      tabs.map((tab) => (tab.getAttribute("aria-selected") === "true" ? tab.textContent : null)),
    ).toContain("Backend");
  });

  it("slides selection when a tab is clicked", () => {
    render(<HeroSection />);
    fireEvent.click(screen.getByRole("tab", { name: "Frontend" }));
    expect(screen.getByRole("tab", { name: "Frontend" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Backend" }).getAttribute("aria-selected")).toBe("false");
  });

  it("toggles hpa auto-scaling with an accessible switch", () => {
    render(<HeroSection />);
    const toggle = screen.getByRole("switch", { name: "Auto-scaling (HPA)" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("floats both satellites around the plan window", () => {
    render(<HeroSection />);
    expect(screen.getByText("$ replicas:")).toBeTruthy();
    expect(screen.getByText("Argo CD")).toBeTruthy();
    expect(screen.getByText("Synced · Healthy")).toBeTruthy();
    expect(screen.getByText("Approve plan")).toBeTruthy();
    expect(screen.getByText("Reject")).toBeTruthy();
  });
});
