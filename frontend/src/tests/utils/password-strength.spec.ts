import { describe, expect, it } from "vitest";
import { passwordStrengthScore } from "@/utils/password-strength";

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
    expect(passwordStrengthScore("abcdefgh12AB")).toBe(4);
    expect(passwordStrengthScore("abcdefg123!PwLonger")).toBe(4);
  });
});
