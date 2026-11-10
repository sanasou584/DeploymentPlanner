// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import React, { useState } from "react";
import { NewProjectModal } from "@/components/dashboard/new-project-modal";
import { PROJECT_MODAL_ROW } from "@/data/dashboard-form";
import type { ProjectModalValues } from "@/types/dashboard";
import type { ConnectRepositoryBody } from "@/types/project";
import { stubMotionEnvironment } from "@/tests/motion-stubs";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, className }, children),
}));

interface ModalHarness {
  submissions: ProjectModalValues[];
  repositories: (ConnectRepositoryBody | null)[];
  submits: (
    values: ProjectModalValues,
    repository: ConnectRepositoryBody | null,
  ) => Promise<ProjectModalHarnessResult>;
}

type ProjectModalHarnessResult =
  | { kind: "success"; code?: undefined; projectId?: string }
  | { kind: "conflict"; code: "DUPLICATE_PROJECT_NAME" }
  | { kind: "invalid"; code: "VALIDATION_ERROR"; fieldErrors?: Record<string, string[]> }
  | { kind: "failed"; code: "INTERNAL_ERROR" }
  | { kind: "unverifiable"; message?: string }
  | { kind: "partial"; message?: string };

beforeAll(() => {
  stubMotionEnvironment();
});

afterEach(cleanup);

beforeEach(() => {
  availabilityMock.checking = false;
  availabilityMock.exists = false;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function createHarness(result: Partial<ProjectModalHarnessResult> = {}): ModalHarness {
  const submissions: ProjectModalValues[] = [];
  const repositories: (ConnectRepositoryBody | null)[] = [];
  return {
    submissions,
    repositories,
    submits: async (values, repository) => {
      submissions.push(values);
      repositories.push(repository ?? null);
      return { kind: "success", ...result } as ProjectModalHarnessResult;
    },
  };
}

const availabilityMock = vi.hoisted(() => ({ checking: false, exists: false }));

vi.mock("@/hooks/use-name-availability", () => ({
  useNameAvailability: () => availabilityMock,
}));

const BASE_PROPS: Parameters<typeof NewProjectModal>[0] = {
  mode: "create",
  existingNames: [],
  catalogComplete: true,
  pending: false,
  onClose: () => {},
  onSubmit: async () => ({ kind: "success" }),
};

function ModalHarnessWindow(props: {
  overrides: Partial<typeof BASE_PROPS>;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(true);
  return open ? (
    <NewProjectModal
      {...BASE_PROPS}
      {...props.overrides}
      onClose={() => {
        setOpen(false);
        props.onClose();
      }}
    />
  ) : null;
}

function renderModal(
  overrides: Partial<typeof BASE_PROPS> = {},
  harness?: ModalHarness,
) {
  const onClose = vi.fn();
  render(
    <ModalHarnessWindow
      overrides={harness ? { ...overrides, onSubmit: harness.submits } : overrides}
      onClose={onClose}
    />,
  );
  return { onClose };
}

function submitForm() {
  const form = screen.getByRole("dialog").querySelector("form");
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("modal form is missing");
  }
  fireEvent.submit(form);
}

function fillName(name: string) {
  fireEvent.change(screen.getByLabelText(/Project name/), {
    target: { value: name },
  });
}

function goToRepositoryStep(name = "waveform-api") {
  fillName(name);
  fireEvent.click(screen.getByRole("button", { name: "Link to repo" }));
}

function fillRepository(url = "https://github.com/octocat/Hello-World", branch = "main") {
  fireEvent.change(screen.getByLabelText(/Repository URL/), {
    target: { value: url },
  });
  fireEvent.change(screen.getByLabelText(/Branch/), {
    target: { value: branch },
  });
}

describe("new project modal", () => {
  it("presents step one with name, description, and environment", () => {
    renderModal();
    expect(screen.getByRole("dialog", { name: "New project" })).toBeTruthy();
    expect(screen.getByText("New project")).toBeTruthy();
    expect(screen.getByText("Slug compatible")).toBeTruthy();
    expect(screen.getByLabelText(/Project name/)).toBeTruthy();
    expect(screen.getByLabelText(/Description/)).toBeTruthy();
    expect(screen.getByText(PROJECT_MODAL_ROW.environmentLabel)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Link to repo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save & link later" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Connect repository" })).toBeNull();
  });

  it("presents the edit form with prefilled values and no wizard", () => {
    renderModal({
      mode: "edit",
      initialValues: {
        name: "waveform-api",
        description: "Existing service.",
        environment: "staging",
      },
    });
    expect(screen.getByRole("dialog", { name: "Edit project" })).toBeTruthy();
    const nameInput = screen.getByLabelText(/Project name/) as HTMLInputElement;
    expect(nameInput.value).toBe("waveform-api");
    const descriptionArea = screen.getByLabelText(/Description/) as HTMLTextAreaElement;
    expect(descriptionArea.value).toBe("Existing service.");
    expect(screen.queryByText(PROJECT_MODAL_ROW.environmentLabel)).toBeNull();
    expect(screen.queryByRole("button", { name: "Save & link later" })).toBeNull();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeTruthy();
  });

  it("defaults the branch to main on the repository step", () => {
    renderModal();
    goToRepositoryStep();
    expect(screen.getByRole("dialog", { name: "Connect repository" })).toBeTruthy();
    const branchInput = screen.getByLabelText(/Branch/) as HTMLInputElement;
    expect(branchInput.value).toBe("main");
  });

  it("returns from the repository step to the details step keeping values", () => {
    renderModal();
    goToRepositoryStep("kept-name");
    fillRepository("https://github.com/octocat/Hello-World", "release/1.0");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("dialog", { name: "New project" })).toBeTruthy();
    const nameInput = screen.getByLabelText(/Project name/) as HTMLInputElement;
    expect(nameInput.value).toBe("kept-name");
    fireEvent.click(screen.getByRole("button", { name: "Link to repo" }));
    const branchInput = screen.getByLabelText(/Branch/) as HTMLInputElement;
    expect(branchInput.value).toBe("release/1.0");
  });

  it("advances creation with an unconfigured repository through the draft seam", async () => {
    const harness = createHarness();
    const { onClose } = renderModal({}, harness);
    fillName("draft-project");
    fireEvent.click(screen.getByRole("button", { name: "Save & link later" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(harness.submissions).toEqual([
      { name: "draft-project", description: "", environment: "development" },
    ]);
    expect(harness.repositories).toEqual([null]);
  });

  it("blocks creation when the details fail validation", async () => {
    const harness = createHarness();
    renderModal({}, harness);
    submitForm();
    expect(screen.getByText("Project name is required.")).toBeTruthy();
    expect(harness.submissions).toHaveLength(0);
    expect(screen.queryByRole("dialog", { name: "Connect repository" })).toBeNull();
  });

  it("blocks the final create until the repository step is filled", async () => {
    const harness = createHarness();
    renderModal({}, harness);
    goToRepositoryStep();
    submitForm();
    expect(screen.getByText("Repository URL is required.")).toBeTruthy();
    expect(harness.submissions).toHaveLength(0);
  });

  it("rejects a URL that is not a github.com/owner/name URL", async () => {
    const harness = createHarness();
    renderModal({}, harness);
    goToRepositoryStep();
    fillRepository("https://gitlab.com/octocat/Hello-World", "main");
    submitForm();
    expect(
      screen.getByText("Enter a URL like https://github.com/owner/name."),
    ).toBeTruthy();
    expect(harness.submissions).toHaveLength(0);
  });

  it("creates and links the repository in one seam", async () => {
    const harness = createHarness();
    const { onClose } = renderModal({}, harness);
    goToRepositoryStep("linked-project");
    fillRepository("https://github.com/octocat/Hello-World", "main");
    submitForm();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(harness.submissions).toEqual([
      { name: "linked-project", description: "", environment: "development" },
    ]);
    expect(harness.repositories).toEqual([
      { url: "https://github.com/octocat/Hello-World", branch: "main" },
    ]);
  });

  it("leaves the draft seam off the repository step", () => {
    renderModal();
    goToRepositoryStep("late-draft");
    expect(screen.queryByRole("button", { name: "Save & link later" })).toBeNull();
  });

  it("tells the user when the project was created but verification failed", async () => {
    const harness = createHarness({
      kind: "unverifiable",
      message: 'Branch "main" not found',
    });
    const { onClose } = renderModal({}, harness);
    goToRepositoryStep("unverifiable-project");
    fillRepository();
    submitForm();
    expect(
      await screen.findByText(PROJECT_MODAL_ROW.createdUnverifiedHeading),
    ).toBeTruthy();
    expect(screen.getByText('Branch "main" not found')).toBeTruthy();
    expect(screen.queryByLabelText(/Repository URL/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("tells the user when the project was created but the link failed", async () => {
    const harness = createHarness({
      kind: "partial",
      message: "GitHub rate limit reached, try again later",
    });
    renderModal({}, harness);
    goToRepositoryStep("partial-project");
    fillRepository();
    submitForm();
    expect(
      await screen.findByText(PROJECT_MODAL_ROW.createdFailedHeading),
    ).toBeTruthy();
    expect(screen.getByText("GitHub rate limit reached, try again later")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Done" })).toBeTruthy();
  });

  it("flags the input with a red danger box for a supplied duplicate name", () => {
    renderModal({ existingNames: ["blog-engine", "shopflow-store"] });
    expect(screen.queryByText(PROJECT_MODAL_ROW.conflictMessage)).toBeNull();
    fireEvent.change(screen.getByLabelText(/Project name/), {
      target: { value: "blog-engine" },
    });
    expect(screen.getByText(PROJECT_MODAL_ROW.conflictMessage)).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByText("HTTP 409")).toBeNull();
    const nameInput = screen.getByLabelText(/Project name/);
    expect(nameInput.getAttribute("aria-invalid")).toBe("true");
    expect(nameInput.getAttribute("aria-describedby")).toBe("project-name-conflict");
    fireEvent.change(screen.getByLabelText(/Project name/), {
      target: { value: "waveform-api" },
    });
    expect(screen.queryByText(PROJECT_MODAL_ROW.conflictMessage)).toBeNull();
  });

  it("spins through the environment tiers and fires the create seam", async () => {
    const harness = createHarness();
    const { onClose } = renderModal({}, harness);
    fillName("waveform-api");
    const toggle = screen.getByRole("button", { name: "Development Environment" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(PROJECT_MODAL_ROW.environmentMenuHeading)).toBeTruthy();
    expect(screen.getAllByText("PRE-PROD").length).toBeGreaterThan(0);
    expect(screen.getAllByText("LIVE").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /^Production/ }));
    fireEvent.click(screen.getByRole("button", { name: "Link to repo" }));
    fillRepository();
    submitForm();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(harness.submissions).toEqual([
      { name: "waveform-api", description: "", environment: "production" },
    ]);
  });

  it("keeps the submit seam silent while a conflict blocks continuation", async () => {
    const harness = createHarness();
    renderModal({ existingNames: ["shopflow-store"] }, harness);
    fireEvent.change(screen.getByLabelText(/Project name/), {
      target: { value: "shopflow-store" },
    });
    expect(screen.getByText(PROJECT_MODAL_ROW.conflictMessage)).toBeTruthy();
    submitForm();
    await waitFor(() => expect(harness.submissions).toHaveLength(0));
    expect(screen.queryByRole("dialog", { name: "Connect repository" })).toBeNull();
  });

  it("rejects an empty name with the required-field message", () => {
    const harness = createHarness();
    renderModal({}, harness);
    submitForm();
    expect(screen.getByText("Project name is required.")).toBeTruthy();
    expect(harness.submissions).toHaveLength(0);
  });

  it("rejects a name beyond the 120 character backend limit", () => {
    const harness = createHarness();
    renderModal({}, harness);
    fireEvent.change(screen.getByLabelText(/Project name/), {
      target: { value: "x".repeat(121) },
    });
    submitForm();
    expect(screen.getByText("Project name must be 120 characters or fewer.")).toBeTruthy();
    expect(harness.submissions).toHaveLength(0);
  });

  it("rejects a description beyond the 1000 character backend limit", () => {
    const harness = createHarness();
    renderModal({}, harness);
    fireEvent.change(screen.getByLabelText(/Project name/), {
      target: { value: "offbeat-name" },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "d".repeat(1001) },
    });
    submitForm();
    expect(
      screen.getByText("Description must be 1000 characters or fewer."),
    ).toBeTruthy();
    expect(harness.submissions).toHaveLength(0);
  });

  it("mirrors the backend 409 conflict when the server rejects the name", async () => {
    const harness = createHarness({ kind: "conflict", code: "DUPLICATE_PROJECT_NAME" });
    renderModal({}, harness);
    goToRepositoryStep("brand-new-name");
    fillRepository();
    submitForm();
    await waitFor(() =>
      expect(screen.getByText(PROJECT_MODAL_ROW.conflictMessage)).toBeTruthy(),
    );
    expect(harness.submissions).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "New project" })).toBeTruthy();
  });

  it("renders server-side field validation errors inline", async () => {
    const harness = createHarness();
    harness.submits = async (values, repository) => {
      harness.submissions.push(values);
      harness.repositories.push(repository ?? null);
      return {
        kind: "invalid",
        code: "VALIDATION_ERROR",
        fieldErrors: { name: ["Name claimed by a soft-deleted project."] },
      };
    };
    renderModal({}, harness);
    goToRepositoryStep("offbeat-name");
    fillRepository();
    submitForm();
    await waitFor(() =>
      expect(screen.getByText("Name claimed by a soft-deleted project.")).toBeTruthy(),
    );
    const nameInput = screen.getByLabelText(/Project name/);
    expect(nameInput.getAttribute("aria-invalid")).toBe("true");
    expect(nameInput.getAttribute("aria-describedby")).toBe("project-name-error");
    expect(screen.getByRole("dialog", { name: "New project" })).toBeTruthy();
  });

  it("keeps the dialog open with a failure banner when the core is unreachable", async () => {
    const harness = createHarness({ kind: "failed", code: "INTERNAL_ERROR" });
    renderModal({}, harness);
    goToRepositoryStep("offbeat-name");
    fillRepository();
    submitForm();
    await waitFor(() =>
      expect(screen.getByText(/We could not reach the planner core/)).toBeTruthy(),
    );
    expect(screen.getByRole("dialog", { name: "Connect repository" })).toBeTruthy();
  });

  it("disables the form and flips the submit label while a request is pending", () => {
    const harness = createHarness();
    renderModal({ mode: "edit", pending: true }, harness);
    expect(screen.getByRole("button", { name: /Working/ })).toBeTruthy();
    const nameInput = screen.getByLabelText(/Project name/) as HTMLInputElement;
    expect(nameInput.disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("closes on submit success through its own close seam", async () => {
    const harness = createHarness();
    const { onClose } = renderModal({}, harness);
    fillName("offbeat-name");
    fireEvent.click(screen.getByRole("button", { name: "Save & link later" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(harness.submissions).toHaveLength(1);
  });

  it("blocks the flow with the 409 preview when the backend says the name exists", () => {
    availabilityMock.exists = true;
    const harness = createHarness();
    renderModal({ existingNames: [], catalogComplete: false }, harness);
    fillName("remote-taken-name");
    expect(screen.getByText(PROJECT_MODAL_ROW.conflictMessage)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Link to repo" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Save & link later" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(harness.submissions).toHaveLength(0);
  });

  it("shows the availability hint while the backend check is in flight", () => {
    availabilityMock.checking = true;
    renderModal({ existingNames: [], catalogComplete: false });
    fillName("probing-name");
    expect(screen.getByRole("status").textContent).toContain(
      PROJECT_MODAL_ROW.availabilityChecking,
    );
    expect(
      (screen.getByRole("button", { name: "Link to repo" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("keeps local checking instant and skips the hint on a complete catalog", () => {
    renderModal({ existingNames: ["blog-engine"], catalogComplete: true });
    fillName("blog-engine");
    expect(screen.getByText(PROJECT_MODAL_ROW.conflictMessage)).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
