// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { ProjectsGuard } from "@/components/dashboard/projects-guard";
import { ReduxProvider, AUTH_SESSION_STORAGE_KEY } from "@/store/redux-provider";
import { appStore } from "@/store/store";
import { sessionCleared } from "@/store/auth-session";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/components/dashboard/projects-page", () => ({
  ProjectsPage: () => <p>guarded content</p>,
}));

function renderGuard() {
  return render(
    <ReduxProvider>
      <ProjectsGuard />
    </ReduxProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  appStore.dispatch(sessionCleared());
  replace.mockClear();
});

afterEach(cleanup);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("projects guard", () => {
  it("redirects an anonymous visitor to the login route and holds the content", async () => {
    renderGuard();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("guarded content")).toBeNull();
  });

  it("renders the guarded content once a stored session is restored", async () => {
    window.localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        token: "token-1",
        user: { id: "u1", name: "Ada Lovelace", email: "ada@example.com", role: "DEVELOPER" },
      }),
    );
    renderGuard();
    await screen.findByText("guarded content");
    expect(replace).not.toHaveBeenCalled();
  });
});
