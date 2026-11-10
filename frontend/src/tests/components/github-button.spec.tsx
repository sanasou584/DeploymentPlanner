// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GithubButton } from "@/components/auth/github-button";

afterEach(cleanup);

describe("GithubButton", () => {
  it("starts the OAuth flow as a browser navigation to the backend", () => {
    render(<GithubButton />);

    const link = screen.getByRole("link", { name: /Continue with GitHub/i });
    expect(link.getAttribute("href")).toBe(
      "http://localhost:4000/api/v1/auth/github",
    );
  });
});
