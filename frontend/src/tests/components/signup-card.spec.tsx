// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import type { AuthAccount } from "@/types/auth";
import { SignupCard } from "@/components/auth/signup-card";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, className }, children),
}));

afterEach(cleanup);
afterEach(vi.unstubAllGlobals);

const NAME_INPUT = () => screen.getByPlaceholderText("Ada Lovelace");
const EMAIL_INPUT = () => screen.getByPlaceholderText("you@example.com");
const PASSWORD_INPUT = () => screen.getByPlaceholderText("At least 8 characters");
const CONFIRM_INPUT = () => screen.getByPlaceholderText("Repeat your password");
const SUBMIT = () => screen.getByRole("button", { name: /create account/i });
const REGISTERED_USER: AuthAccount = {
  id: "u1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "DEVELOPER",
};

function stubRegister(payload: unknown, ok: boolean) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok,
    status: ok ? 201 : 400,
    json: () => Promise.resolve(payload),
  }));
}

function fillValidAndSubmit() {
  fireEvent.change(NAME_INPUT(), { target: { value: "Ada Lovelace" } });
  fireEvent.change(EMAIL_INPUT(), { target: { value: "ada@example.com" } });
  fireEvent.change(PASSWORD_INPUT(), { target: { value: "hunter222" } });
  fireEvent.change(CONFIRM_INPUT(), { target: { value: "hunter222" } });
  fireEvent.click(SUBMIT());
}

describe("SignupCard swap", () => {
  it("renders the request card before registration", () => {
    render(<SignupCard />);

    expect(screen.getByText("Create your account")).toBeDefined();
    expect(SUBMIT()).toBeDefined();
  });

  it("replaces the form card with the pending-approval confirmation", async () => {
    stubRegister(
      {
        message: "Registration submitted. Awaiting administrator approval.",
        data: REGISTERED_USER,
      },
      true,
    );
    render(<SignupCard />);

    fillValidAndSubmit();
    await waitFor(() =>
      expect(screen.getByText("Registration submitted")).toBeDefined(),
    );
    expect(screen.queryByText(/create account/i)).toBeNull();
    expect(screen.getByText("Ada Lovelace")).toBeDefined();
    expect(screen.getByText("ada@example.com")).toBeDefined();
    expect(screen.getByText("Pending approval")).toBeDefined();
    expect(screen.getByText("Your account is awaiting administrator approval.")).toBeDefined();
    expect(screen.getByText("You will be able to log in once an administrator approves your account.")).toBeDefined();
    expect(screen.getByText("Need help? Contact your administrator.")).toBeDefined();
    expect(screen.getByText("Back to login").getAttribute("href")).toBe("/login");
  });
});
