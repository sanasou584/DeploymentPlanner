import { describe, expect, it } from "vitest";
import {
  repositoryBranchErrorOf,
  repositoryFieldErrorsOf,
  repositoryUrlErrorOf,
} from "@/utils/repository";

describe("repository url validation", () => {
  it("requires a url", () => {
    expect(repositoryUrlErrorOf("")).toBe("urlRequired");
    expect(repositoryUrlErrorOf("   ")).toBe("urlRequired");
  });

  it("accepts the https github.com/owner/name grammar", () => {
    expect(repositoryUrlErrorOf("https://github.com/octocat/Hello-World")).toBeUndefined();
    expect(repositoryUrlErrorOf("https://github.com/octocat/Hello-World.git")).toBeUndefined();
    expect(repositoryUrlErrorOf("https://github.com/octocat/Hello-World/")).toBeUndefined();
    expect(repositoryUrlErrorOf("https://www.github.com/octocat/Hello-World")).toBeUndefined();
    expect(repositoryUrlErrorOf("https://github.com/a/b")).toBeUndefined();
  });

  it("rejects lookalike hosts and malformed paths", () => {
    expect(repositoryUrlErrorOf("https://gitlab.com/octocat/Hello-World")).toBe("urlInvalid");
    expect(repositoryUrlErrorOf("https://github.com/octocat")).toBe("urlInvalid");
    expect(repositoryUrlErrorOf("https://github.com/octocat/Hello World")).toBe("urlInvalid");
    expect(repositoryUrlErrorOf("git@github.com:octocat/Hello-World.git")).toBe("urlInvalid");
    expect(repositoryUrlErrorOf("https://github.com/Octo Cat/Hello-World")).toBe("urlInvalid");
    expect(repositoryUrlErrorOf("http://github.com/octocat/Hello-World")).toBe("urlInvalid");
  });
});

describe("repository branch validation", () => {
  it("requires a branch", () => {
    expect(repositoryBranchErrorOf("")).toBe("branchRequired");
    expect(repositoryBranchErrorOf("   ")).toBe("branchRequired");
  });

  it("accepts common branch names", () => {
    expect(repositoryBranchErrorOf("main")).toBeUndefined();
    expect(repositoryBranchErrorOf("master")).toBeUndefined();
    expect(repositoryBranchErrorOf("release/1.0")).toBeUndefined();
    expect(repositoryBranchErrorOf("feat/deploy-v2")).toBeUndefined();
    expect(repositoryBranchErrorOf("v1.2.3")).toBeUndefined();
    expect(repositoryBranchErrorOf("user.name-branch_1")).toBeUndefined();
  });

  it("rejects unsafe branch names", () => {
    expect(repositoryBranchErrorOf("feature..broken")).toBe("branchInvalid");
    expect(repositoryBranchErrorOf("a//b")).toBe("branchInvalid");
    expect(repositoryBranchErrorOf("/lead")).toBe("branchInvalid");
    expect(repositoryBranchErrorOf("trail/")).toBe("branchInvalid");
    expect(repositoryBranchErrorOf(".dot-segment/branch")).toBe("branchInvalid");
    expect(repositoryBranchErrorOf("segment/.hidden")).toBe("branchInvalid");
    expect(repositoryBranchErrorOf("sp ace")).toBe("branchInvalid");
  });
});

describe("repository field errors", () => {
  it("reports both fields at once", () => {
    expect(repositoryFieldErrorsOf("", "")).toEqual({
      url: "urlRequired",
      branch: "branchRequired",
    });
  });

  it("returns an empty object for valid input", () => {
    expect(
      repositoryFieldErrorsOf("https://github.com/octocat/Hello-World", "main"),
    ).toEqual({});
  });
});
