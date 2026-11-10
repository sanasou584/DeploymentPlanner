import { describe, expect, it } from "vitest";
import { firstName, initials, titleCase } from "@/utils/identity";

describe("identity display helpers", () => {
  it("uses the first word of a full name", () => {
    expect(firstName("Grace Brewster Murray Hopper")).toBe("Grace");
    expect(firstName("single")).toBe("single");
    expect(firstName("   spaced out   ")).toBe("spaced");
    expect(firstName("")).toBe("");
  });

  it("builds two-letter initials from the first and last words", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("Ada")).toBe("A");
    expect(initials("Grace Brewster Hopper")).toBe("GH");
    expect(initials("")).toBe("");
  });

  it("title-cases backend roles for display", () => {
    expect(titleCase("DEVELOPER")).toBe("Developer");
    expect(titleCase("admin")).toBe("Admin");
    expect(titleCase("  PENDING_USER  ")).toBe("Pending_user");
    expect(titleCase("")).toBe("");
  });
});
