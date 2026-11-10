import { describe, expect, it } from "vitest";
import { cn } from "@/utils/class-names";

describe("cn", () => {
  it("joins class values in order", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("skips falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("keeps the last conflicting utility", () => {
    expect(cn("px-4", "px-8")).toBe("px-8");
  });

  it("returns an empty string without values", () => {
    expect(cn()).toBe("");
  });
});
