// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import type { AuthAccount } from "@/types/auth";
import { SignupConfirmation } from "@/components/auth/signup-confirmation";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, className }, children),
}));

afterEach(cleanup);

const ADA: AuthAccount = {
  id: "u1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "DEVELOPER",
};

describe("SignupConfirmation", () => {
  it("renders the pending-approval summary for the registered account", () => {
    render(<SignupConfirmation account={ADA} />);

    expect(screen.getByText("Registration submitted")).toBeDefined();
    expect(screen.getByText("Your account is awaiting administrator approval.")).toBeDefined();
    expect(screen.getByText("You will be able to log in once an administrator approves your account.")).toBeDefined();
    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("Ada Lovelace")).toBeDefined();
    expect(screen.getByText("Email")).toBeDefined();
    expect(screen.getByText("ada@example.com")).toBeDefined();
    expect(screen.getByText("Pending approval")).toBeDefined();
    expect(screen.getByText("Back to login").getAttribute("href")).toBe("/login");
    expect(screen.getByText("Need help? Contact your administrator.")).toBeDefined();
  });
});
