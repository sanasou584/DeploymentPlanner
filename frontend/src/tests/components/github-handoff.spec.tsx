// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { GithubHandoff } from "@/components/auth/github-handoff";
import { ReduxProvider } from "@/store/redux-provider";
import { appStore } from "@/store/store";
import { sessionCleared } from "@/store/auth-session";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

function setHash(hash: string) {
  window.history.replaceState(null, "", `/${hash}`);
}

beforeEach(() => {
  window.localStorage.clear();
  appStore.dispatch(sessionCleared());
  replace.mockClear();
  setHash("");
});

afterEach(cleanup);

describe("github oauth handoff", () => {
  it("starts the session and routes to the projects dashboard", async () => {
    setHash(
      "#access_token=token-gh&user_id=u1&user_name=Ada Lovelace&user_email=ada%40example.com&user_role=DEVELOPER",
    );
    render(
      <ReduxProvider>
        <GithubHandoff />
      </ReduxProvider>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/projects"));
    expect(appStore.getState().authSession.token).toBe("token-gh");
    expect(appStore.getState().authSession.user?.name).toBe("Ada Lovelace");
  });

  it("routes back to login without a handoff fragment", async () => {
    render(
      <ReduxProvider>
        <GithubHandoff />
      </ReduxProvider>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(appStore.getState().authSession.token).toBeNull();
  });
});
