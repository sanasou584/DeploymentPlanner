// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { Provider } from "react-redux";
import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { appStore } from "@/store/store";
import { sessionCleared, sessionStarted } from "@/store/auth-session";
import { stubMotionEnvironment } from "@/tests/motion-stubs";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, className }, children),
}));

beforeAll(() => {
  stubMotionEnvironment();
});

beforeEach(() => {
  appStore.dispatch(sessionCleared());
});

afterEach(cleanup);

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderNav() {
  return render(
    <Provider store={appStore}>
      <DashboardTopNav />
    </Provider>,
  );
}

describe("dashboard top navigation", () => {
  it("renders the mockup breadcrumb with the brand context", () => {
    appStore.dispatch(
      sessionStarted({
        accessToken: "token-1",
        user: { id: "u1", name: "Sarah Hamza", email: "sarah@example.com", role: "ADMIN" },
      }),
    );
    renderNav();
    expect(screen.getByText("DeploymentPlanner AI")).toBeTruthy();
    expect(screen.getByText("/")).toBeTruthy();
    expect(screen.getByText("Projects")).toBeTruthy();
  });

  it("keeps search and notifications honest until their systems exist", () => {
    appStore.dispatch(
      sessionStarted({
        accessToken: "token-2",
        user: { id: "u1", name: "Sarah Hamza", email: "sarah@example.com", role: "ADMIN" },
      }),
    );
    renderNav();
    expect((screen.getByRole("button", { name: "Search projects" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Notifications" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps the avatar anonymous before the session is restored", () => {
    renderNav();
    expect(screen.getByText("DeploymentPlanner AI")).toBeTruthy();
    const trigger = document.querySelector("#user-avatar-trigger");
    expect(trigger?.textContent).toBe("");
    expect(trigger?.getAttribute("aria-haspopup")).toBe("menu");
  });

  it("presents the session user initials on the trigger", () => {
    appStore.dispatch(
      sessionStarted({
        accessToken: "token-3",
        user: { id: "u1", name: "Sarah Hamza", email: "sarah@example.com", role: "ADMIN" },
      }),
    );
    const { container } = renderNav();
    expect(container.querySelector("#user-avatar-trigger")?.textContent).toBe("SH");
    expect(screen.getByRole("button", { name: "SH" })).toBeTruthy();
  });
});
