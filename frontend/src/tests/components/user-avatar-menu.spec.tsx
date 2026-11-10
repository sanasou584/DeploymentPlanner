// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { Provider } from "react-redux";
import { UserAvatarMenu } from "@/components/dashboard/user-avatar-menu";
import { appStore } from "@/store/store";
import { sessionCleared, sessionStarted } from "@/store/auth-session";
import { stubMotionEnvironment } from "@/tests/motion-stubs";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("next/link", () => ({
  default: ({ href, className, children, ...rest }: React.ComponentProps<"a"> & { href: string }) =>
    React.createElement("a", { href, className, ...rest }, children),
}));

const ADMIN_USER = {
  id: "u1",
  name: "Sarah Hamza",
  email: "sarah@example.com",
  role: "ADMIN",
};

const DEVELOPER_USER = {
  id: "u2",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "DEVELOPER",
};

beforeAll(() => {
  stubMotionEnvironment();
});

beforeEach(() => {
  appStore.dispatch(sessionCleared());
  replace.mockClear();
});

afterEach(cleanup);

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderMenu() {
  return render(
    <Provider store={appStore}>
      <UserAvatarMenu />
    </Provider>,
  );
}

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "SH" }));
}

describe("user avatar menu", () => {
  it("renders the initials trigger with the mockup glow ring", () => {
    appStore.dispatch(sessionStarted({ accessToken: "token-1", user: ADMIN_USER }));
    renderMenu();
    const trigger = screen.getByRole("button", { name: "SH" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-controls")).toBe("user-avatar-menu");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens the administrator menu with role sections and counters", () => {
    appStore.dispatch(sessionStarted({ accessToken: "token-1", user: ADMIN_USER }));
    renderMenu();
    openMenu();
    expect(screen.getByRole("menu", { name: "SH" })).toBeTruthy();
    expect(screen.getByText("Sarah Hamza")).toBeTruthy();
    expect(screen.getByText("sarah@example.com")).toBeTruthy();
    expect(screen.getByText("Administrator")).toBeTruthy();
    expect(screen.getByText("Administration")).toBeTruthy();
    expect(screen.getByText("Pending approvals")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("Users")).toBeTruthy();
    expect(screen.getByText("Account")).toBeTruthy();
    const projectsLink = screen.getByRole("menuitem", { name: "My projects" });
    expect(projectsLink.getAttribute("href")).toBe("/projects");
    expect(screen.getByRole("menuitem", { name: "Profile" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Documentation" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "SH" }).getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("seals the administration block away for developer sessions", () => {
    appStore.dispatch(sessionStarted({ accessToken: "token-2", user: DEVELOPER_USER }));
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "AL" }));
    expect(screen.getByText("Developer")).toBeTruthy();
    expect(screen.queryByText("Administration")).toBeNull();
    expect(screen.queryByText("Pending approvals")).toBeNull();
    expect(screen.queryByText("Users")).toBeNull();
    expect(screen.getByRole("menuitem", { name: "My projects" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeTruthy();
  });

  it("closes on outside clicks and escape, returning focus to the trigger", async () => {
    appStore.dispatch(sessionStarted({ accessToken: "token-1", user: ADMIN_USER }));
    renderMenu();
    openMenu();
    expect(screen.getByRole("menu", { name: "SH" })).toBeTruthy();
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    openMenu();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(document.activeElement?.id).toBe("user-avatar-trigger");
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Profile" }));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("revokes the session and routes to the login route on log out", async () => {
    appStore.dispatch(sessionStarted({ accessToken: "token-3", user: ADMIN_USER }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: "Logged out" }),
      }),
    );
    renderMenu();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Log out" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    await waitFor(() => expect(appStore.getState().authSession.token).toBeNull());
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });
});
