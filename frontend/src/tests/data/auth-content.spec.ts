import { describe, expect, it } from "vitest";
import { AUTH_ALERTS } from "@/data/auth-alerts";
import { GITHUB_BUTTON, GITHUB_REDIRECT_PARAM } from "@/data/auth-github";
import {
  SIGNUP_CONFIRMATION,
  SIGNUP_CONFIRMATION_CTA,
  SIGNUP_CONFIRMATION_FIELDS,
} from "@/data/signup-confirmation";

describe("auth alert banners", () => {
  it("declares an alert row for every login failure kind", () => {
    expect(Object.keys(AUTH_ALERTS).sort()).toEqual([
      "account-deactivated",
      "github-conflict",
      "invalid-credentials",
      "pending-approval",
      "session-expired",
      "unexpected",
    ].sort());
  });

  it("carries the mockup copy and tones verbatim", () => {
    expect(AUTH_ALERTS["invalid-credentials"]).toEqual({
      id: "invalid-credentials",
      tone: "crimson",
      icon: "error",
      message: "Invalid email or password.",
    });
    expect(AUTH_ALERTS["account-deactivated"]).toEqual({
      id: "account-deactivated",
      tone: "orange",
      icon: "person_off",
      message: "Your account has been deactivated. Contact an administrator.",
    });
    expect(AUTH_ALERTS["pending-approval"]).toEqual({
      id: "pending-approval",
      tone: "champagne",
      icon: "schedule",
      message: "Your account is awaiting administrator approval, or has been disabled.",
    });
    expect(AUTH_ALERTS["github-conflict"]).toEqual({
      id: "github-conflict",
      tone: "crimson",
      icon: "error",
      message: "A different GitHub account is already linked to this email.",
    });
    expect(AUTH_ALERTS.unexpected).toEqual({
      id: "unexpected",
      tone: "crimson",
      icon: "error",
      message: "Something went wrong. Please try again.",
    });
  });
});

describe("github account choice", () => {
  it("declares the OAuth start path and the callback redirect query param", () => {
    expect(GITHUB_BUTTON).toEqual({
      id: "github",
      label: "Continue with GitHub",
      path: "/auth/github",
    });
    expect(GITHUB_REDIRECT_PARAM).toBe("github");
  });
});

describe("signup confirmation copy", () => {
  it("declares the mockup summary fields and badge", () => {
    expect(SIGNUP_CONFIRMATION_FIELDS).toEqual([
      { id: "name", label: "Name" },
      { id: "email", label: "Email" },
    ]);
    expect(SIGNUP_CONFIRMATION.heading).toBe("Registration submitted");
    expect(SIGNUP_CONFIRMATION.message).toBe(
      "Your account is awaiting administrator approval.",
    );
    expect(SIGNUP_CONFIRMATION.badge).toBe("Pending approval");
    expect(SIGNUP_CONFIRMATION_CTA.label).toBe("Back to login");
    expect(SIGNUP_CONFIRMATION_CTA.href).toBe("/login");
  });
});
