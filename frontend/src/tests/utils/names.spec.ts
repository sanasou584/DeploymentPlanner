import { describe, expect, it } from "vitest";
import { isTakenName, nameKeyOf, takenNameKeysOf } from "@/utils/names";

describe("nameKeyOf", () => {
  it("trims and lowercases", () => {
    expect(nameKeyOf("  Blog-Engine ")).toBe("blog-engine");
    expect(nameKeyOf("SHOPFLOW-STORE")).toBe("shopflow-store");
  });
});

describe("takenNameKeysOf", () => {
  it("builds a case-insensitive lookup set", () => {
    const taken = takenNameKeysOf(["Blog-Engine", "shopflow-store"]);
    expect(taken.has("blog-engine")).toBe(true);
    expect(taken.has("SHOPFLOW-STORE".toLowerCase())).toBe(true);
    expect(taken.has("unknown")).toBe(false);
  });
});

describe("isTakenName", () => {
  const taken = takenNameKeysOf(["Blog-Engine", "waveform-api"]);

  it("matches regardless of the candidate's casing", () => {
    expect(isTakenName(taken, "blog-engine")).toBe(true);
    expect(isTakenName(taken, "BLOG-ENGINE")).toBe(true);
    expect(isTakenName(taken, " blog-engine")).toBe(true);
  });

  it("passes names it has not seen", () => {
    expect(isTakenName(taken, "waveform-api-2")).toBe(false);
  });
});
