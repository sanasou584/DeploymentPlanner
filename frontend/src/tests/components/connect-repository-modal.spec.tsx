// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import React, { useState } from "react";
import { ConnectRepositoryModal } from "@/components/dashboard/connect-repository-modal";
import { CONNECT_REPOSITORY_MODAL_ROW } from "@/data/dashboard-form";
import type { RepositorySubmitResult } from "@/types/dashboard";
import type { RepositoryRef } from "@/types/project";
import { stubMotionEnvironment } from "@/tests/motion-stubs";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, className }, children),
}));

const LINKED_REPOSITORY: RepositoryRef = {
  provider: "github",
  owner: "octocat",
  name: "Hello-World",
  branch: "main",
  isValid: true,
};

const UNVERIFIED_REPOSITORY: RepositoryRef = {
  ...LINKED_REPOSITORY,
  isValid: false,
  lastVerificationError: 'Branch "main" not found',
};

interface Harness {
  submissions: { url: string; branch: string }[];
  submits: (values: { url: string; branch: string }) => Promise<RepositorySubmitResult>;
  verifies: number;
  verify: () => Promise<boolean>;
}

beforeAll(() => {
  stubMotionEnvironment();
});

afterEach(cleanup);

afterEach(() => {
  vi.unstubAllGlobals();
});

function createHarness(result: RepositorySubmitResult = { kind: "success" }): Harness {
  const harness: Harness = {
    submissions: [],
    verifies: 0,
    submits: async (values) => {
      harness.submissions.push(values);
      return result;
    },
    verify: async () => {
      harness.verifies += 1;
      return true;
    },
  };
  return harness;
}

const BASE_PROPS: Parameters<typeof ConnectRepositoryModal>[0] = {
  projectName: "fixture-store",
  repository: null,
  pending: false,
  verifying: false,
  onClose: () => {},
  onSubmit: async () => ({ kind: "success" }),
  onVerify: () => true,
};

function ModalHarnessWindow(props: {
  overrides: Partial<typeof BASE_PROPS>;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(true);
  return open ? (
    <ConnectRepositoryModal
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
  harness?: Harness,
) {
  const onClose = vi.fn();
  const props: Partial<typeof BASE_PROPS> = {
    ...overrides,
    ...(harness
      ? { onSubmit: harness.submits, onVerify: harness.verify }
      : undefined),
  };
  render(<ModalHarnessWindow overrides={props} onClose={onClose} />);
  return { onClose };
}

function submitModal() {
  const form = screen.getByRole("dialog").querySelector("form");
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("Repository form is missing");
  }
  fireEvent.submit(form);
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/Repository URL/), {
    target: { value: "https://github.com/octocat/Hello-World" },
  });
  fireEvent.change(screen.getByLabelText(/Branch/), {
    target: { value: "main" },
  });
}

describe("connect repository modal", () => {
  it("presents the plain connect form for a project without a repository", () => {
    renderModal();
    expect(
      screen.getByRole("dialog", { name: "Connect repository — fixture-store" }),
    ).toBeTruthy();
    expect(screen.getByLabelText(/Repository URL/)).toBeTruthy();
    expect(screen.getByLabelText(/Branch/)).toBeTruthy();
    expect((screen.getByLabelText(/Branch/) as HTMLInputElement).value).toBe("main");
    expect(screen.getByRole("button", { name: "Connect repository" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Verify" })).toBeNull();
    expect(screen.queryByText(CONNECT_REPOSITORY_MODAL_ROW.currentHeading)).toBeNull();
  });

  it("prefills the form and shows the linked repository for a verified project", () => {
    renderModal({ repository: LINKED_REPOSITORY });
    expect(screen.getByRole("dialog", { name: "Update repository — fixture-store" })).toBeTruthy();
    expect(screen.getByText(CONNECT_REPOSITORY_MODAL_ROW.currentHeading)).toBeTruthy();
    const urlInput = screen.getByLabelText(/Repository URL/) as HTMLInputElement;
    expect(urlInput.value).toBe("https://github.com/octocat/Hello-World");
    const branchInput = screen.getByLabelText(/Branch/) as HTMLInputElement;
    expect(branchInput.value).toBe("main");
    expect(screen.getByRole("button", { name: "Update repository" })).toBeTruthy();
    expect(screen.getByText("verified")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Verify" })).toBeTruthy();
  });

  it("reports the unverified state of a linked repository", () => {
    renderModal({ repository: UNVERIFIED_REPOSITORY });
    expect(screen.getByText("not verified")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Verify" })).toBeTruthy();
  });

  it("requires the URL before submitting", () => {
    const harness = createHarness();
    renderModal({}, harness);
    submitModal();
    expect(screen.getByText(CONNECT_REPOSITORY_MODAL_ROW.urlRequiredMessage)).toBeTruthy();
    expect(harness.submissions).toHaveLength(0);
  });

  it("rejects a URL that is not a github.com/owner/name URL", () => {
    const harness = createHarness();
    renderModal({}, harness);
    fireEvent.change(screen.getByLabelText(/Repository URL/), {
      target: { value: "https://gitlab.com/octocat/Hello-World" },
    });
    fireEvent.change(screen.getByLabelText(/Branch/), {
      target: { value: "main" },
    });
    submitModal();
    expect(screen.getByText(CONNECT_REPOSITORY_MODAL_ROW.urlInvalidMessage)).toBeTruthy();
    expect(harness.submissions).toHaveLength(0);
  });

  it("submits the repository and closes itself on a verified success", async () => {
    const harness = createHarness({ kind: "success" });
    const { onClose } = renderModal({}, harness);
    fillValidForm();
    submitModal();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(harness.submissions).toEqual([
      { url: "https://github.com/octocat/Hello-World", branch: "main" },
    ]);
  });

  it("surfaces server-side field errors next to their inputs", async () => {
    const harness = createHarness({
      kind: "invalid",
      code: "VALIDATION_ERROR",
      fieldErrors: { branch: ['Branch "nope" not found'] },
    });
    renderModal({}, harness);
    fillValidForm();
    submitModal();
    expect(await screen.findByText('Branch "nope" not found')).toBeTruthy();
  });

  it("keeps the dialog open and shows the backend reason when verification fails", async () => {
    const harness = createHarness({
      kind: "unverifiable",
      message: 'Branch "main" not found',
    });
    const { onClose } = renderModal({}, harness);
    fillValidForm();
    submitModal();
    expect(await screen.findByText(CONNECT_REPOSITORY_MODAL_ROW.unverifiableHeading)).toBeTruthy();
    expect(screen.getByText('Branch "main" not found')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("falls back to the generic copy when the backend gives no reason", async () => {
    const harness = createHarness({
      kind: "unverifiable",
      message: undefined,
    });
    renderModal({}, harness);
    fillValidForm();
    submitModal();
    expect(await screen.findByText(CONNECT_REPOSITORY_MODAL_ROW.unverifiableFallback)).toBeTruthy();
  });

  it("shows a failed banner when the request itself fails", async () => {
    const harness = createHarness({
      kind: "failed",
      code: "INTERNAL_ERROR",
      message: "GitHub rate limit reached, try again later",
    });
    renderModal({}, harness);
    fillValidForm();
    submitModal();
    expect(
      await screen.findByText("GitHub rate limit reached, try again later"),
    ).toBeTruthy();
  });

  it("runs the verify action from the linked panel", async () => {
    const harness = createHarness();
    renderModal({ repository: LINKED_REPOSITORY }, harness);
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => expect(harness.verifies).toBe(1));
  });

  it("reports a failed verify run inline", async () => {
    const harness = createHarness();
    harness.verify = async () => {
      harness.verifies += 1;
      return false;
    };
    renderModal({ repository: LINKED_REPOSITORY }, harness);
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
