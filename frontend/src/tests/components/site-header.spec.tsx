// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { SiteHeader } from "@/components/layout/site-header";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, className }, children),
}));

afterEach(cleanup);

describe("auth site header", () => {
  it("links the brand mark home to the landing page", () => {
    render(
      <SiteHeader prompt="New here?" ctaLabel="Sign up" ctaHref="/signup" />,
    );
    const brand = screen.getByRole("link", { name: /deploymentplanner/i });
    expect(brand.getAttribute("href")).toBe("/");
  });

  it("keeps the counterpart page a single pill away", () => {
    render(
      <SiteHeader prompt="Already have an account?" ctaLabel="Log in" ctaHref="/login" />,
    );
    const cta = screen.getByRole("link", { name: "Log in" });
    expect(cta.getAttribute("href")).toBe("/login");
    expect(screen.getByText("Already have an account?")).toBeTruthy();
  });
});
