// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { WorkflowSection } from "@/components/landing/workflow-section";
import { stubMotionEnvironment } from "@/tests/motion-stubs";

beforeAll(() => {
  stubMotionEnvironment();
});

afterEach(cleanup);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("landing workflow sequencer", () => {
  it("reveals five ordered steps", () => {
    render(<WorkflowSection />);
    expect(screen.getByText("Workflow Sequence")).toBeTruthy();
    const indices = screen
      .getAllByText(/^0[1-5]$/)
      .map((node) => node.textContent)
      .sort();
    expect(indices).toEqual(["01", "02", "03", "04", "05"]);
    expect(screen.getByText("Connect repository")).toBeTruthy();
    expect(screen.getByText("Deploy GitOps")).toBeTruthy();
  });

  it("hands the fourth step to the user", () => {
    render(<WorkflowSection />);
    expect(screen.getByText("You decide")).toBeTruthy();
  });
});
