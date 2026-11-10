import { describe, expect, it } from "vitest";
import type { ApiErrorBody } from "@/types/api";
import {
  githubCallbackAlert,
  loginAlertKind,
  parseApiError,
  parseAuthSuccess,
  parseGithubHandoff,
  signupFieldErrorsFromApiError,
} from "@/utils/auth-responses";

describe("loginAlertKind", () => {
  it("maps backend auth error codes to banner kinds", () => {
    expect(loginAlertKind("UNAUTHORIZED")).toBe("invalid-credentials");
    expect(loginAlertKind("ACCOUNT_DISABLED")).toBe("account-deactivated");
    expect(loginAlertKind("FORBIDDEN")).toBe("pending-approval");
  });

  it("falls back to the unexpected banner for unknown codes", () => {
    expect(loginAlertKind("INTERNAL_ERROR")).toBe("unexpected");
    expect(loginAlertKind("")).toBe("unexpected");
  });
});

describe("parseApiError", () => {
  it("unwraps the backend error envelope", () => {
    expect(parseApiError({ error: { code: "UNAUTHORIZED", message: "Invalid email or password" } })).toEqual({
      code: "UNAUTHORIZED",
      message: "Invalid email or password",
    });
  });

  it("keeps details when present", () => {
    const details = { fieldErrors: { email: ["Invalid email"] } };
    expect(parseApiError({ error: { code: "VALIDATION_ERROR", message: "Invalid registration data", details } })).toEqual({
      code: "VALIDATION_ERROR",
      message: "Invalid registration data",
      details,
    });
  });

  it("returns null for non-error payloads", () => {
    expect(parseApiError(null)).toBeNull();
    expect(parseApiError({ message: "no envelope" })).toBeNull();
    expect(parseApiError({ error: "flat string" })).toBeNull();
    expect(parseApiError({ error: { message: "missing code" } })).toBeNull();
  });
});

describe("parseAuthSuccess", () => {
  it("reads the register response user", () => {
    expect(
      parseAuthSuccess({
        message: "Registration submitted.",
        data: { id: "u1", name: "Ada", email: "ada@example.com", role: "DEVELOPER" },
      }),
    ).toEqual({
      user: { id: "u1", name: "Ada", email: "ada@example.com", role: "DEVELOPER" },
      accessToken: null,
    });
  });

  it("reads the login response user and token", () => {
    expect(
      parseAuthSuccess({
        message: "Login successful",
        data: { id: "u1", name: "Ada", email: "ada@example.com", role: "DEVELOPER" },
        accessToken: "token-1",
        tokenType: "Bearer",
        expiresIn: 3600,
      }),
    ).toEqual({
      user: { id: "u1", name: "Ada", email: "ada@example.com", role: "DEVELOPER" },
      accessToken: "token-1",
    });
  });

  it("rejects malformed users and payloads", () => {
    expect(parseAuthSuccess(null)).toEqual({ user: null, accessToken: null });
    expect(parseAuthSuccess({ data: { id: "u1" } }).user).toBeNull();
  });
});

describe("githubCallbackAlert", () => {
  it("maps backend callback redirect codes to banner kinds", () => {
    expect(githubCallbackAlert("FORBIDDEN")).toBe("pending-approval");
    expect(githubCallbackAlert("ACCOUNT_DISABLED")).toBe("account-deactivated");
    expect(githubCallbackAlert("CONFLICT")).toBe("github-conflict");
  });

  it("shows the unexpected banner for unknown callback codes", () => {
    expect(githubCallbackAlert("INVALID_STATE")).toBe("unexpected");
    expect(githubCallbackAlert("")).toBe("unexpected");
  });

  it("returns null when the page was not reached by a callback redirect", () => {
    expect(githubCallbackAlert(null)).toBeNull();
  });
});

describe("parseGithubHandoff", () => {
  it("reads the callback fragment handoff into a session payload", () => {
    expect(
      parseGithubHandoff(
        "#access_token=TOKEN&user_id=u1&user_name=Ada&user_email=ada%40example.com&user_role=DEVELOPER",
      ),
    ).toEqual({
      user: { id: "u1", name: "Ada", email: "ada@example.com", role: "DEVELOPER" },
      accessToken: "TOKEN",
    });
  });

  it("returns null without the fragment or with a missing field", () => {
    expect(parseGithubHandoff("")).toBeNull();
    expect(parseGithubHandoff("no-hash")).toBeNull();
    expect(parseGithubHandoff("#user_id=u1")).toBeNull();
    expect(
      parseGithubHandoff(
        "#access_token=TOKEN&user_id=u1&user_name=Ada&user_email=ada@example.com&user_role=",
      ),
    ).toBeNull();
  });
});

describe("signupFieldErrorsFromApiError", () => {
  const emailTaken: ApiErrorBody = { code: "CONFLICT", message: "Email already registered" };

  it("surfaces the email conflict under the email field", () => {
    expect(signupFieldErrorsFromApiError(emailTaken)).toEqual({
      email: "Email already registered",
    });
  });

  it("maps validation details onto form fields", () => {
    expect(
      signupFieldErrorsFromApiError({
        code: "VALIDATION_ERROR",
        message: "Invalid registration data",
        details: { fieldErrors: { name: ["Name too short"], email: ["Bad email"] } },
      }),
    ).toEqual({ fullName: "Name too short", email: "Bad email" });
  });

  it("ignores codes without field errors", () => {
    expect(signupFieldErrorsFromApiError({ code: "INTERNAL_ERROR", message: "Boom" })).toEqual({});
    expect(signupFieldErrorsFromApiError({ code: "VALIDATION_ERROR", message: "Invalid" })).toEqual({});
  });
});
