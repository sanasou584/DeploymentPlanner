// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import React from "react";
import { ProjectCard } from "@/components/dashboard/project-card";
import type { ProjectRow } from "@/types/dashboard";
import { stubMotionEnvironment } from "@/tests/motion-stubs";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, className }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const SAMPLE_PROJECT_ROW: ProjectRow = {
  id: "fixture-store",
  name: "fixture-store",
  description: "Fixture storefront service used to pin the mockup card anatomy.",
  environment: "staging",
  createdAt: "Created Oct 12, 2026",
  repository: null,
};

const LINKED_ROW: ProjectRow = {
  ...SAMPLE_PROJECT_ROW,
  repository: {
    provider: "github",
    owner: "octocat",
    name: "Hello-World",
    branch: "main",
    isValid: true,
  },
};

beforeAll(() => {
  stubMotionEnvironment();
});

afterEach(cleanup);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("project card", () => {
  it("renders the row content with its environment chip and creation date", () => {
    render(<ProjectCard row={SAMPLE_PROJECT_ROW} onEdit={vi.fn()} onDelete={vi.fn()} onConnect={vi.fn()} />);
    expect(screen.getByText("fixture-store")).toBeTruthy();
    expect(screen.getByText("Staging")).toBeTruthy();
    expect(screen.getByText("Created Oct 12, 2026")).toBeTruthy();
    expect(screen.getByText("Fixture storefront service used to pin the mockup card anatomy.")).toBeTruthy();
  });

  it("marks the actions menu icon with an accessible label", () => {
    render(<ProjectCard row={SAMPLE_PROJECT_ROW} onEdit={vi.fn()} onDelete={vi.fn()} onConnect={vi.fn()} />);
    const kebab = screen.getByRole("button", { name: "Project actions" });
    expect(kebab.getAttribute("aria-expanded")).toBe("false");
    expect(kebab.getAttribute("aria-haspopup")).toBe("menu");
  });

  it("opens the actions menu with edit and delete entries, then closes it", async () => {
    render(<ProjectCard row={SAMPLE_PROJECT_ROW} onEdit={vi.fn()} onDelete={vi.fn()} onConnect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Project actions" }).getAttribute("aria-expanded"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Edit" })).toBeNull(),
    );
  });

  it("reports the edit request without deleting", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ProjectCard row={SAMPLE_PROJECT_ROW} onEdit={onEdit} onDelete={onDelete} onConnect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Edit" })).toBeNull(),
    );
    expect(onEdit).toHaveBeenCalledWith(SAMPLE_PROJECT_ROW);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("reports the delete request through the menu seam", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ProjectCard row={SAMPLE_PROJECT_ROW} onEdit={onEdit} onDelete={onDelete} onConnect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Delete" })).toBeNull(),
    );
    expect(onDelete).toHaveBeenCalledWith(SAMPLE_PROJECT_ROW);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("reports the connect request through the menu seam", async () => {
    const onConnect = vi.fn();
    const onEdit = vi.fn();
    render(<ProjectCard row={SAMPLE_PROJECT_ROW} onEdit={onEdit} onDelete={vi.fn()} onConnect={onConnect} />);
    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Connect repository" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Connect repository" })).toBeNull(),
    );
    expect(onConnect).toHaveBeenCalledWith(SAMPLE_PROJECT_ROW);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("offers to update the repository when one is linked", () => {
    render(<ProjectCard row={LINKED_ROW} onEdit={vi.fn()} onDelete={vi.fn()} onConnect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));
    expect(screen.getByRole("button", { name: "Update repository" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Connect repository" })).toBeNull();
  });

  it("renders the verified repository link when a repository is linked", () => {
    render(<ProjectCard row={LINKED_ROW} onEdit={vi.fn()} onDelete={vi.fn()} onConnect={vi.fn()} />);
    const link = screen
      .getAllByRole("link")
      .find((node) => node.getAttribute("href") === "https://github.com/octocat/Hello-World");
    if (!link) throw new Error("repository link missing");
    expect(link.getAttribute("href")).toBe("https://github.com/octocat/Hello-World");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.textContent).toContain("octocat/Hello-World");
    expect(link.getAttribute("aria-label")).toContain("verified");
  });

  it("renders no repository link when the project is not linked", () => {
    render(<ProjectCard row={SAMPLE_PROJECT_ROW} onEdit={vi.fn()} onDelete={vi.fn()} onConnect={vi.fn()} />);
    expect(screen.queryByRole("link", { name: /octocat/i })).toBeNull();
  });

  it("disables the delete entry while its request is pending", () => {
    render(
      <ProjectCard
        row={SAMPLE_PROJECT_ROW}
        menuPending
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onConnect={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));
    expect(
      (screen.getByRole("button", { name: "Delete" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Edit" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });
});
