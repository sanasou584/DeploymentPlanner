// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { Provider } from "react-redux";
import { DashboardProfileCard } from "@/components/dashboard/session-profile";
import { appStore } from "@/store/store";
import { sessionCleared, sessionStarted } from "@/store/auth-session";

vi.mock("next/link", () => ({
  default: ({ href, className, children, ...rest }: React.ComponentProps<"a"> & { href: string }) =>
    React.createElement("a", { href, className, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplace }),
}));

const routerReplace = vi.fn();

beforeEach(() => {
  appStore.dispatch(sessionCleared());
  routerReplace.mockClear();
  vi.unstubAllGlobals();
});

afterEach(cleanup);

function renderCard() {
  return render(
    <Provider store={appStore}>
      <DashboardProfileCard />
    </Provider>,
  );
}

describe("dashboard profile card", () => {
  it("renders nothing while no session user exists", () => {
    const { container } = renderCard();
    expect(container.textContent).toBe("");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("presents the session user with initials and a title-cased role", () => {
    appStore.dispatch(
      sessionStarted({
        accessToken: "token-1",
        user: { id: "u1", name: "Grace Hopper", email: "grace@example.com", role: "ADMIN" },
      }),
    );
    renderCard();
    expect(screen.getByText("Grace Hopper")).toBeTruthy();
    expect(screen.getByText("GH")).toBeTruthy();
    expect(screen.getByText("Admin")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
  });

  it("initializes a single-word name from its first letter", () => {
    appStore.dispatch(
      sessionStarted({
        accessToken: "token-2",
        user: { id: "u2", name: "Ada", email: "ada@example.com", role: "DEVELOPER" },
      }),
    );
    renderCard();
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("Developer")).toBeTruthy();
  });

  it("revokes the access token through POST /auth/logout and bounces to the login screen", async () => {
    appStore.dispatch(
      sessionStarted({
        accessToken: "token-3",
        user: { id: "u3", name: "Grace Hopper", email: "grace@example.com", role: "ADMIN" },
      }),
    );
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ message: "Logged out" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith("/login"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/auth/logout");
    expect((init as RequestInit).method).toBe("POST");
    expect(new Headers((init as RequestInit).headers).get("Authorization")).toBe(
      "Bearer token-3",
    );
    expect(appStore.getState().authSession.token).toBeNull();
    expect(appStore.getState().authSession.user).toBeNull();
  });

  it("clears the local session even when the logout request fails", async () => {
    appStore.dispatch(
      sessionStarted({
        accessToken: "token-4",
        user: { id: "u4", name: "Grace Hopper", email: "grace@example.com", role: "ADMIN" },
      }),
    );
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchMock);
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith("/login"));
    expect(appStore.getState().authSession.token).toBeNull();
  });
});
