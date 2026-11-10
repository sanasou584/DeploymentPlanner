// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "@/components/auth/signup-form";
import type { AuthAccount } from "@/types/auth";

afterEach(cleanup);
afterEach(vi.unstubAllGlobals);

const NAME_INPUT = () => screen.getByPlaceholderText("Ada Lovelace");
const EMAIL_INPUT = () => screen.getByPlaceholderText("you@example.com");
const PASSWORD_INPUT = () => screen.getByPlaceholderText("At least 8 characters");
const CONFIRM_INPUT = () => screen.getByPlaceholderText("Repeat your password");
const SUBMIT = () => screen.getByRole("button", { name: /create account/i });

function fillEmail(value: string) {
  fireEvent.change(EMAIL_INPUT(), { target: { value } });
}

function fillPassword(value: string) {
  fireEvent.change(PASSWORD_INPUT(), { target: { value } });
}

describe("SignupForm", () => {
  it("shows one error per missing field", () => {
    render(<SignupForm />);
    fireEvent.click(SUBMIT());
    expect(screen.getByText("Full name is required.")).toBeDefined();
    expect(screen.getByText("Email is required.")).toBeDefined();
    expect(screen.getByText("Password is required.")).toBeDefined();
    expect(screen.getByText("Confirm password is required.")).toBeDefined();
  });

  it("rejects too-short names", () => {
    render(<SignupForm />);
    fireEvent.change(NAME_INPUT(), { target: { value: "A" } });
    fireEvent.click(SUBMIT());
    expect(screen.getByText("Full name must be at least 2 characters.")).toBeDefined();
  });

  it("rejects mismatched passwords", () => {
    render(<SignupForm />);
    fireEvent.change(NAME_INPUT(), { target: { value: "Ada Lovelace" } });
    fillEmail("ada@lovelace.dev");
    fillPassword("hunter222");
    fireEvent.change(CONFIRM_INPUT(), { target: { value: "hunter333" } });
    fireEvent.click(SUBMIT());
    expect(screen.getByText("Passwords do not match.")).toBeDefined();
  });

  it("submits trimmed values when all fields are valid", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SignupForm onSubmit={onSubmit} />);

    fireEvent.change(NAME_INPUT(), { target: { value: "  Ada Lovelace  " } });
    fillEmail("ada@lovelace.dev");
    fillPassword("hunter222");
    fireEvent.change(CONFIRM_INPUT(), { target: { value: "hunter222" } });
    fireEvent.click(SUBMIT());

    await Promise.resolve();
    expect(onSubmit).toHaveBeenCalledWith({
      fullName: "Ada Lovelace",
      email: "ada@lovelace.dev",
      password: "hunter222",
      confirmPassword: "hunter222",
    });
    expect(screen.queryByText("Full name is required.")).toBeNull();
  });

  it("does not submit when validation fails", async () => {
    const onSubmit = vi.fn();
    render(<SignupForm onSubmit={onSubmit} />);
    fillEmail("not-an-email");
    fireEvent.click(SUBMIT());

    await Promise.resolve();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("reflects password strength on the meter", () => {
    render(<SignupForm />);
    const meter = screen.getByRole("progressbar");
    expect(meter.getAttribute("aria-valuenow")).toBe("0");

    fireEvent.change(PASSWORD_INPUT(), { target: { value: "hunter222" } });
    expect(meter.getAttribute("aria-valuenow")).toBe("2");
  });

  it("toggles both password fields independently", () => {
    render(<SignupForm />);

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect((PASSWORD_INPUT() as HTMLInputElement).type).toBe("text");
    expect((CONFIRM_INPUT() as HTMLInputElement).type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Show confirm password" }));
    expect((CONFIRM_INPUT() as HTMLInputElement).type).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect((PASSWORD_INPUT() as HTMLInputElement).type).toBe("password");
  });
});

const REGISTERED_USER: AuthAccount = {
  id: "u1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "DEVELOPER",
};

function stubRegisterResponse(payload: unknown, ok: boolean) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok,
    status: ok ? 201 : 400,
    json: () => Promise.resolve(payload),
  }));
}

async function fillValidAndSubmit(options?: { passwordIsMismatch: boolean }) {
  fireEvent.change(NAME_INPUT(), { target: { value: "Ada Lovelace" } });
  fillEmail("ada@example.com");
  fillPassword("hunter222");
  fireEvent.change(CONFIRM_INPUT(), {
    target: { value: options?.passwordIsMismatch ? "hunter333" : "hunter222" },
  });
  fireEvent.click(SUBMIT());
}

describe("SignupForm against the backend", () => {
  it("disables every field and shows the Creating account spinner while pending", async () => {
    const neverResolves = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal("fetch", neverResolves);
    render(<SignupForm />);

    fillValidAndSubmit();
    const pendingSubmit = async () =>
      await waitFor(() =>
        expect(
          (screen.getByRole("button", { name: /creating account/i }) as HTMLButtonElement)
            .disabled,
        ).toBe(true),
      );
    await pendingSubmit();

    expect(screen.getByText("Creating account...")).toBeDefined();
    expect((NAME_INPUT() as HTMLInputElement).disabled).toBe(true);
    expect((EMAIL_INPUT() as HTMLInputElement).disabled).toBe(true);
    expect((PASSWORD_INPUT() as HTMLInputElement).disabled).toBe(true);
    expect((CONFIRM_INPUT() as HTMLInputElement).disabled).toBe(true);
  });

  it("shows the unexpected banner when the request cannot be parsed", async () => {
    stubRegisterResponse({ error: { code: "INTERNAL_ERROR", message: "boom" } }, false);
    const onCreated = vi.fn();
    render(<SignupForm onCreated={onCreated} />);

    fillValidAndSubmit();
    await waitFor(() =>
      expect(screen.getByText("Something went wrong. Please try again.")).toBeDefined(),
    );
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("maps the backend email conflict under the email field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({ error: { code: "CONFLICT", message: "Email already registered" } }),
    }));
    render(<SignupForm />);

    fillValidAndSubmit();
    await waitFor(() =>
      expect(screen.getByText("Email already registered")).toBeDefined(),
    );
    expect(EMAIL_INPUT().getAttribute("aria-invalid")).toBe("true");
  });

  it("notifies onCreated with the registered account", async () => {
    stubRegisterResponse(
      {
        message: "Registration submitted. Awaiting administrator approval.",
        data: REGISTERED_USER,
      },
      true,
    );
    const onCreated = vi.fn();
    render(<SignupForm onCreated={onCreated} />);

    fillValidAndSubmit();
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(REGISTERED_USER));
  });

  it("does not map network outcomes to fake success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const onCreated = vi.fn();
    render(<SignupForm onCreated={onCreated} />);

    fillValidAndSubmit();
    await waitFor(() =>
      expect(screen.getByText("Something went wrong. Please try again.")).toBeDefined(),
    );
    expect(onCreated).not.toHaveBeenCalled();
  });
});
