import { describe, expect, it } from "vitest";
import { passwordStrengthScore } from "@/utils/password-strength";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateEmail,
  validateFullName,
  validateLoginForm,
  validatePassword,
  validateSignupConfirm,
  validateSignupPassword,
  validateSignupForm,
} from "@/utils/validators";

function repeatedLetter(letter: string, count: number): string {
  return letter.repeat(count);
}

describe("validateEmail", () => {
  it("rejects a missing email", () => {
    expect(validateEmail("")).toBe("Email is required.");
    expect(validateEmail("   ")).toBe("Email is required.");
  });

  it("rejects a malformed email", () => {
    expect(validateEmail("ada")).toBe("Enter a valid email address.");
    expect(validateEmail("ada@lovelace")).toBe("Enter a valid email address.");
  });

  it("accepts a valid email", () => {
    expect(validateEmail("ada@lovelace.dev")).toBeNull();
  });
});

describe("validatePassword", () => {
  it("rejects a missing password", () => {
    expect(validatePassword("")).toBe("Password is required.");
  });

  it("accepts any non-empty password on login", () => {
    expect(validatePassword("hunter2")).toBeNull();
  });
});

describe("validateFullName", () => {
  it("rejects a missing name", () => {
    expect(validateFullName("")).toBe("Full name is required.");
    expect(validateFullName("   ")).toBe("Full name is required.");
  });

  it("rejects names below the minimum length", () => {
    expect(validateFullName("A")).toBe("Full name must be at least 2 characters.");
  });

  it("rejects names above the maximum length", () => {
    expect(validateFullName(repeatedLetter("A", 101))).toBe(
      "Full name must be at most 100 characters.",
    );
  });

  it("accepts a trimmed valid name", () => {
    expect(validateFullName("  Ada Lovelace  ")).toBeNull();
  });
});

describe("validateSignupPassword", () => {
  it("rejects a missing password", () => {
    expect(validateSignupPassword("")).toBe("Password is required.");
  });

  it("rejects short passwords", () => {
    expect(validateSignupPassword(repeatedLetter("a", PASSWORD_MIN_LENGTH - 1))).toBe(
      "Password must be at least 8 characters.",
    );
  });

  it("rejects overly long passwords", () => {
    expect(validateSignupPassword(repeatedLetter("a", PASSWORD_MAX_LENGTH + 1))).toBe(
      "Password must be at most 128 characters.",
    );
  });

  it("accepts a password within bounds", () => {
    expect(validateSignupPassword(repeatedLetter("a", PASSWORD_MIN_LENGTH))).toBeNull();
  });
});

describe("validateSignupConfirm", () => {
  it("rejects a missing confirmation", () => {
    expect(validateSignupConfirm("", "hunter2")).toBe("Confirm password is required.");
  });

  it("rejects a mismatched confirmation", () => {
    expect(validateSignupConfirm("hunter3", "hunter2")).toBe("Passwords do not match.");
  });

  it("accepts a matching confirmation", () => {
    expect(validateSignupConfirm("hunter2", "hunter2")).toBeNull();
  });
});

describe("validateSignupForm", () => {
  it("returns an error entry per invalid field", () => {
    const errors = validateSignupForm({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    expect(Object.keys(errors).sort()).toEqual([
      "confirmPassword",
      "email",
      "fullName",
      "password",
    ]);
  });

  it("clears all errors for a valid submission", () => {
    const errors = validateSignupForm({
      fullName: "Ada Lovelace",
      email: "ada@lovelace.dev",
      password: "hunter22",
      confirmPassword: "hunter22",
    });
    expect(errors.fullName).toBeNull();
    expect(errors.email).toBeNull();
    expect(errors.password).toBeNull();
    expect(errors.confirmPassword).toBeNull();
  });
});

describe("validateLoginForm", () => {
  it("returns an error entry per field", () => {
    const errors = validateLoginForm({ email: "", password: "" });
    expect(Object.keys(errors).sort()).toEqual(["email", "password"]);
    expect(errors.email).toBe("Email is required.");
    expect(errors.password).toBe("Password is required.");
  });

  it("clears all errors for a valid submission", () => {
    const errors = validateLoginForm({ email: "ada@lovelace.dev", password: "hunter2" });
    expect(errors.email).toBeNull();
    expect(errors.password).toBeNull();
  });
});

describe("passwordStrengthScore", () => {
  it("scores 0 for empty or short passwords", () => {
    expect(passwordStrengthScore("")).toBe(0);
    expect(passwordStrengthScore("abc12")).toBe(0);
  });

  it("scores 1 as soon as the minimum length is met", () => {
    expect(passwordStrengthScore("abcdefgh")).toBe(1);
  });

  it("adds one point per extra criterion", () => {
    expect(passwordStrengthScore("abcdefgh12")).toBe(2);
    expect(passwordStrengthScore("abcdefgh1A")).toBe(3);
  });

  it("caps at 4 segments", () => {
    expect(passwordStrengthScore("abcdefg123!PwLonger")).toBe(4);
  });
});
