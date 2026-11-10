// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { CtaBanner } from "@/components/landing/cta-banner";
import { Footer } from "@/components/landing/footer";
import { TechStrip } from "@/components/landing/tech-strip";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, className }, children),
}));

afterEach(cleanup);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("landing cta banner", () => {
  it("routes both closing actions to the auth pages", () => {
    render(<CtaBanner />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/signup", "/login"]);
    expect(screen.getByText("Create your account")).toBeTruthy();
  });
});

describe("landing footer", () => {
  it("own three link columns with an external github reference", () => {
    render(<Footer />);
    const externals: HTMLAnchorElement[] = screen.getAllByRole("link", {
      name: "GitHub",
    }) as HTMLAnchorElement[];
    expect(externals.some((link) => link.getAttribute("target") === "_blank")).toBe(true);
    expect(screen.getByText("Product")).toBeTruthy();
    expect(screen.getByText("Resources")).toBeTruthy();
    expect(screen.getByText("Legal")).toBeTruthy();
  });

  it("signs the copyright and status lines", () => {
    render(<Footer />);
    expect(screen.getByText(/© 2\d{3}/)).toBeTruthy();
    expect(screen.getByText("SYSTEM STATUS: ALL OPERATIONAL")).toBeTruthy();
  });
});

describe("landing tech strip", () => {
  it("lists the integrated tools", () => {
    render(<TechStrip />);
    for (const tool of ["GitHub", "Docker", "Kubernetes", "GitHub Actions", "Argo CD", "Minikube", "n8n"]) {
      expect(screen.getByText(tool)).toBeTruthy();
    }
  });
});
