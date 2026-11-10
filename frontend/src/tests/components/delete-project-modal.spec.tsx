// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import React from "react";
import { DeleteProjectModal } from "@/components/dashboard/delete-project-modal";
import { DELETE_PROJECT_MODAL_ROW, PROJECT_FORM_FEEDBACK } from "@/data/dashboard-form";
import { stubMotionEnvironment } from "@/tests/motion-stubs";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, className }, children),
}));

const ROW = { id: "p1", name: "waveform-api" };

beforeAll(() => {
  stubMotionEnvironment();
});

afterEach(cleanup);

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderModal(overrides: Partial<Parameters<typeof DeleteProjectModal>[0]> = {}) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  const view = render(
    <DeleteProjectModal
      row={ROW}
      pending={false}
      onClose={onClose}
      onConfirm={onConfirm}
      {...overrides}
    />,
  );
  return { onClose, onConfirm, ...view };
}

describe("delete project modal", () => {
  it("presents the destructive dialog with the target name", () => {
    renderModal();
    expect(
      screen.getByRole("dialog", { name: DELETE_PROJECT_MODAL_ROW.title }),
    ).toBeTruthy();
    expect(screen.getByText("waveform-api")).toBeTruthy();
    expect(screen.getByText(DELETE_PROJECT_MODAL_ROW.copy)).toBeTruthy();
    expect(screen.getByRole("button", { name: DELETE_PROJECT_MODAL_ROW.submitLabel })).toBeTruthy();
    expect(screen.getByRole("button", { name: DELETE_PROJECT_MODAL_ROW.cancelLabel })).toBeTruthy();
    expect(screen.getByRole("button", { name: DELETE_PROJECT_MODAL_ROW.closeLabel })).toBeTruthy();
  });

  it("confirms the deletion through its onConfirm seam without closing itself", () => {
    const { onConfirm, onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: DELETE_PROJECT_MODAL_ROW.submitLabel }));
    expect(onConfirm).toHaveBeenCalledWith(ROW);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cancels through onClose without confirming", () => {
    const { onConfirm, onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: DELETE_PROJECT_MODAL_ROW.cancelLabel }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("closes when the backdrop is clicked but not when the panel is", () => {
    const { onClose, container } = renderModal();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    const backdrop = container.firstChild;
    if (!(backdrop instanceof HTMLElement)) throw new Error("modal backdrop missing");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("disables every action while the delete request is pending", () => {
    renderModal({ pending: true });
    const submit = screen.getByRole("button", {
      name: new RegExp(PROJECT_FORM_FEEDBACK.pendingLabel),
    }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: DELETE_PROJECT_MODAL_ROW.cancelLabel }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: DELETE_PROJECT_MODAL_ROW.closeLabel }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
