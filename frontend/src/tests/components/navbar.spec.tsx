// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { Navbar } from "@/components/landing/navbar";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, className }, children),
}));

afterEach(cleanup);

describe("landing navbar", () => {
  it("keeps the brand linked to the landing route", () => {
    render(<Navbar />);
    const brand = screen.getByRole("link", { name: /deploymentplanner/i });
    expect(brand.getAttribute("href")).toBe("/");
  });

  it("anchors the four nav links and two auth ctas", () => {
    render(<Navbar />);
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining(["#features", "#how-it-works", "#ai-plan", "#docs", "/login", "/signup"]),
    );
    expect(screen.getByText("Log in")).toBeTruthy();
    expect(screen.getByText("Sign up")).toBeTruthy();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
