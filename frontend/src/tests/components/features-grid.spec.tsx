// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { stubMotionEnvironment } from "@/tests/motion-stubs";

beforeAll(() => {
  stubMotionEnvironment();
});

afterEach(cleanup);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("landing features grid", () => {
  it("heads the bento wall and lists six cards", () => {
    render(<FeaturesGrid />);
    expect(
      screen.getByText("Everything between your repo and your cluster"),
    ).toBeTruthy();
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual([
      "Repository analysis",
      "Docker review",
      "AI recommendations",
      "Deployment plan",
      "Kubernetes & CI files",
      "GitOps deploy",
    ]);
  });

  it("chips dependency manifests as code inside descriptions", () => {
    render(<FeaturesGrid />);
    expect(screen.getByText("package.json")).toBeTruthy();
    expect(screen.getByText("requirements.txt")).toBeTruthy();
  });

  it("tags the ai recommendation card with its model", () => {
    render(<FeaturesGrid />);
    expect(screen.getByText("Model v4")).toBeTruthy();
  });
});
