// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { AUTH_SESSION_STORAGE_KEY, ReduxProvider } from "@/store/redux-provider";
import { appStore } from "@/store/store";
import { apiSlice } from "@/store/api";
import { sessionCleared, sessionStarted } from "@/store/auth-session";
import { stubMotionEnvironment } from "@/tests/motion-stubs";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, className }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

beforeAll(() => {
  stubMotionEnvironment();
});

beforeEach(() => {
  window.localStorage.clear();
  appStore.dispatch(sessionCleared());
  appStore.dispatch(apiSlice.util.resetApiState());
});

afterEach(cleanup);

afterEach(() => {
  vi.unstubAllGlobals();
});

const SESSION_USER = {
  id: "u1",
  name: "Grace Hopper",
  email: "grace@example.com",
  role: "ADMIN",
};

interface MockedCall {
  url: string;
  method: string;
  body: unknown | null;
  authorization: string | null;
}

const calls: MockedCall[] = [];

type QueueEntry = unknown[] | { status: number; body: unknown } | null;

function stubFetchQueue() {
  calls.length = 0;
  const queue: QueueEntry[] = [];
  const enqueue = (entry: QueueEntry) => {
    queue.push(entry);
  };
  const enqueueAll = (entries: QueueEntry[]) => {
    queue.push(...entries);
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      let inboundBody: unknown = null;
      if (init?.body) {
        inboundBody = JSON.parse(String(init.body));
      } else if (input instanceof Request && input.method !== "GET" && input.body) {
        inboundBody = JSON.parse(await input.text());
      }
      const record: MockedCall = {
        url: input instanceof Request ? input.url : String(input),
        method: (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase(),
        body: inboundBody,
        authorization: new Headers(
          init?.headers ?? (input instanceof Request ? input.headers : undefined),
        ).get("Authorization"),
      };
      calls.push(record);
      const nextEntry = queue.shift();
      if (nextEntry === undefined) {
        return new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "unstubbed" } }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (nextEntry === null) {
        return new Promise<Response>(() => {});
      }
      if (Array.isArray(nextEntry)) {
        return new Response(JSON.stringify({ message: "Projects returned", data: nextEntry, pagination: {
          page: 1,
          limit: 100,
          total: nextEntry.length,
          pageCount: Math.max(1, Math.ceil(nextEntry.length / 100)),
        } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const { status, body } = nextEntry as { status: number; body: unknown };
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return { enqueue, enqueueAll };
}

function projectFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    owner: "u1",
    name: "waveform-api",
    description: "Signal service for the fixture workspace.",
    environment: "DEVELOPMENT",
    repository: null,
    createdAt: "2026-10-12T10:00:00.000Z",
    updatedAt: "2026-10-12T10:00:00.000Z",
    ...overrides,
  };
}

function signInGrace() {
  appStore.dispatch(
    sessionStarted({
      accessToken: "token-1",
      user: SESSION_USER,
    }),
  );
  window.localStorage.setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify({ token: "token-1", user: SESSION_USER }),
  );
}

function renderView() {
  return render(
    <ReduxProvider>
      <DashboardView />
    </ReduxProvider>,
  );
}

describe("dashboard view", () => {
  it("greets the signed-in developer by first name", async () => {
    signInGrace();
    const { enqueue } = stubFetchQueue();
    enqueue([]);
    renderView();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Welcome back, Grace");
    await waitFor(() => {
      expect(calls.some((call) => call.method === "GET" && call.url.includes("/projects?"))).toBe(true);
    });
    const read = calls.find((call) => call.method === "GET");
    if (!read) throw new Error("the catalog read is missing");
    expect(read.url).toContain("limit=100");
    expect(read.authorization).toBe("Bearer token-1");
  });

  it("renders the empty workspace telemetry while the planner core returns nothing", async () => {
    signInGrace();
    const { enqueue } = stubFetchQueue();
    enqueue([]);
    renderView();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Create your first project" })).toBeTruthy(),
    );
    expect(screen.getByText("Total projects")).toBeTruthy();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("allocated")).toBeTruthy();
    expect(screen.getByText("instances")).toBeTruthy();
    expect(screen.getByText("replicas")).toBeTruthy();
    expect(screen.getByText("active")).toBeTruthy();
    expect(screen.getByText("DP-SYS // IDLE")).toBeTruthy();
    expect(screen.getByText("WORKSPACE: UNALLOCATED")).toBeTruthy();
    expect(screen.getByText(/Register an application to start planning/)).toBeTruthy();
    expect(screen.getByText("Zero-trust Blueprint Analysis")).toBeTruthy();
    expect(screen.getByText("Autonomous Topology Inference")).toBeTruthy();
    expect(screen.getByText("Multi-cluster Readiness")).toBeTruthy();
  });

  it("shims the loading sheet while the first catalog read is in flight", () => {
    signInGrace();
    const { enqueue } = stubFetchQueue();
    enqueue(null);
    renderView();
    expect(screen.getByText("Reading your workspace")).toBeTruthy();
    expect(screen.getByText("Pulling the latest projects from the planner core.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Create your first project" })).toBeNull();
  });

  it("maps the planner core payload into cards, stats, count pill, and pagination", async () => {
    signInGrace();
    const { enqueue } = stubFetchQueue();
    enqueue([
      projectFixture({ id: "p1", name: "waveform-api", environment: "DEVELOPMENT" }),
      projectFixture({ id: "p2", name: "shopflow-store", environment: "PRODUCTION", description: "Storefront." }),
    ]);
    renderView();
    await waitFor(() => expect(screen.getByText("waveform-api")).toBeTruthy());
    expect(screen.getByText("shopflow-store")).toBeTruthy();
    expect(screen.getByText("Signal service for the fixture workspace.")).toBeTruthy();
    expect(screen.getByText("Storefront.")).toBeTruthy();
    expect(screen.getAllByText("Development").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Production").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Created Oct 12, 2026")).toHaveLength(2);
    expect(screen.getAllByText("Total projects").length).toBeGreaterThan(0);
    expect(screen.getByText("2 projects")).toBeTruthy();
    expect(screen.getByText("Page 1 of 1")).toBeTruthy();
    const values = screen
      .getAllByText(/^[0-9]+$/)
      .map((node) => node.textContent)
      .filter((value) => value !== null && value !== "");
    expect(values).toContain("2");
  });

  it("shows the failure sheet with a retry that re-reads the catalog", async () => {
    signInGrace();
    const { enqueue } = stubFetchQueue();
    enqueue({ status: 500, body: { error: { code: "INTERNAL_ERROR", message: "database unavailable" } } });
    renderView();
    await waitFor(() =>
      expect(screen.getByText("Planner core unreachable")).toBeTruthy(),
    );
    expect(screen.getByText("database unavailable")).toBeTruthy();
    const readBefore = calls.filter((call) => call.method === "GET").length;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => {
      expect(calls.filter((call) => call.method === "GET").length).toBeGreaterThan(readBefore);
    });
  });

  it("opens the new project modal from the header and empty-place CTAs", async () => {
    signInGrace();
    const { enqueue } = stubFetchQueue();
    enqueue([]);
    renderView();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Create your first project" })).toBeTruthy(),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    const ctaButtons = screen.getAllByRole("button", { name: "New project" });
    expect(ctaButtons).toHaveLength(2);
    fireEvent.click(ctaButtons[0]);
    expect(screen.getByRole("dialog", { name: "New project" })).toBeTruthy();
    expect(screen.getByLabelText(/Project name/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getAllByRole("button", { name: "New project" })[1]);
    expect(screen.getByRole("dialog", { name: "New project" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("creates a project and links its repository through the combined seam", async () => {
    const linkedFixture = projectFixture({
      id: "p9",
      name: "waveform-api",
      repository: {
        provider: "github",
        owner: "octocat",
        name: "Hello-World",
        branch: "main",
        defaultBranch: "main",
        isValid: true,
        lastVerifiedAt: "2026-11-01T10:00:00.000Z",
        lastVerificationError: null,
      },
    });
    const handoffFixture = projectFixture({
      id: "p1",
      name: "shopflow-store",
      environment: "STAGING",
    });
    signInGrace();
    const { enqueueAll } = stubFetchQueue();
    enqueueAll([
      [],
      { status: 201, body: { message: "Project created successfully", data: projectFixture({ id: "p9", name: "waveform-api" }) } },
      [handoffFixture],
      { status: 200, body: { message: "Repository connected successfully", data: linkedFixture } },
      [handoffFixture, { ...linkedFixture, id: "p2", name: "waveform-api", environment: "PRODUCTION" }],
    ]);
    renderView();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Create your first project" })).toBeTruthy(),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "New project" })[0]);
    fireEvent.change(screen.getByLabelText(/Project name/), {
      target: { value: "waveform-api" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Link to repo" }));
    expect(screen.getByRole("dialog", { name: "Connect repository" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Repository URL/), {
      target: { value: "https://github.com/octocat/Hello-World" },
    });
    fireEvent.change(screen.getByLabelText(/Branch/), {
      target: { value: "main" },
    });
    const form = screen.getByRole("dialog").querySelector("form");
    if (!(form instanceof HTMLFormElement)) throw new Error("modal form is missing");
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByText("waveform-api")).toBeTruthy());
    const create = calls.find((call) => call.method === "POST" && call.url.endsWith("/projects"));
    if (!create) throw new Error("project create is missing");
    expect(create.body).toEqual({
      name: "waveform-api",
      environment: "DEVELOPMENT",
    });
    expect(create.authorization).toBe("Bearer token-1");
    const link = calls.find(
      (call) => call.method === "PUT" && call.url.includes("/projects/p9/repository"),
    );
    if (!link) throw new Error("repository link is missing");
    expect(link.body).toEqual({
      url: "https://github.com/octocat/Hello-World",
      branch: "main",
    });
    expect(link.authorization).toBe("Bearer token-1");
    expect(screen.getByText("shopflow-store")).toBeTruthy();
    expect(screen.getByText("Page 1 of 1")).toBeTruthy();
  });

  it("edits a project name through the PATCH seam", async () => {
    signInGrace();
    const { enqueueAll } = stubFetchQueue();
    enqueueAll([
      [projectFixture({ id: "p1", name: "waveform-api" })],
      { status: 200, body: { message: "Project updated successfully", data: projectFixture({ id: "p1", name: "waveform-api-pro" }) } },
      [projectFixture({ id: "p1", name: "waveform-api-pro" })],
    ]);
    renderView();
    await waitFor(() => expect(screen.getByText("waveform-api")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("dialog", { name: "Edit project" })).toBeTruthy();
    const nameInput = screen.getByLabelText(/Project name/) as HTMLInputElement;
    expect(nameInput.value).toBe("waveform-api");
    fireEvent.change(nameInput, { target: { value: "waveform-api-pro" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByText("waveform-api-pro")).toBeTruthy());
    const patch = calls.find((call) => call.method === "PATCH");
    if (!patch) throw new Error("project update is missing");
    expect(patch.url).toContain("/projects/p1");
    expect(patch.body).toEqual({ name: "waveform-api-pro" });
  });

  it("connects a GitHub repository through the PUT seam", async () => {
    const linkedFixture = projectFixture({
      id: "p1",
      name: "waveform-api",
      repository: {
        provider: "github",
        owner: "octocat",
        name: "Hello-World",
        branch: "main",
        defaultBranch: "main",
        isValid: true,
        lastVerifiedAt: "2026-11-01T10:00:00.000Z",
        lastVerificationError: null,
      },
    });
    signInGrace();
    const { enqueueAll } = stubFetchQueue();
    enqueueAll([
      [projectFixture({ id: "p1", name: "waveform-api" })],
      { status: 200, body: { message: "Repository connected successfully", data: linkedFixture } },
      [linkedFixture],
    ]);
    renderView();
    await waitFor(() => expect(screen.getByText("waveform-api")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Connect repository" }));
    expect(screen.getByRole("dialog", { name: /Connect repository/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Repository URL/), {
      target: { value: "https://github.com/octocat/Hello-World" },
    });
    fireEvent.change(screen.getByLabelText(/Branch/), {
      target: { value: "main" },
    });
    const form = screen.getByRole("dialog").querySelector("form");
    if (!(form instanceof HTMLFormElement)) throw new Error("repository form is missing");
    fireEvent.submit(form);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const connection = calls.find(
      (call) => call.method === "PUT" && call.url.includes("/projects/p1/repository"),
    );
    if (!connection) throw new Error("repository connect is missing");
    expect(connection.body).toEqual({
      url: "https://github.com/octocat/Hello-World",
      branch: "main",
    });
    expect(connection.authorization).toBe("Bearer token-1");
    expect(
      screen.getAllByRole("link").some((node) => node.getAttribute("href") === "https://github.com/octocat/Hello-World"),
    ).toBe(true);
  });

  it("re-verifies an invalid repository from the linked panel", async () => {
    const unverifiedRepository = {
      provider: "github",
      owner: "octocat",
      name: "Hello-World",
      branch: "main",
      defaultBranch: null,
      isValid: false,
      lastVerifiedAt: null,
      lastVerificationError: 'Branch "main" not found',
    };
    const verifiedRepository = {
      ...unverifiedRepository,
      defaultBranch: "main",
      isValid: true,
      lastVerifiedAt: "2026-11-01T10:05:00.000Z",
      lastVerificationError: null,
    };
    const unverifiedFixture = projectFixture({
      id: "p1",
      name: "waveform-api",
      repository: unverifiedRepository,
    });
    const verifiedFixture = projectFixture({
      id: "p1",
      name: "waveform-api",
      repository: verifiedRepository,
    });
    signInGrace();
    const { enqueueAll } = stubFetchQueue();
    enqueueAll([
      [unverifiedFixture],
      { status: 200, body: { message: "Repository verified", data: verifiedFixture } },
      [verifiedFixture],
    ]);
    renderView();
    await waitFor(() => expect(screen.getByText("waveform-api")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Update repository" }));
    expect(screen.getByText("not verified")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    const dialog = screen.getByRole("dialog");
    await waitFor(() => expect(within(dialog).getByText("verified")).toBeTruthy());
    const recheck = calls.find(
      (call) => call.method === "POST" && call.url.includes("/projects/p1/repository/verify"),
    );
    if (!recheck) throw new Error("repository verify is missing");
    expect(recheck.authorization).toBe("Bearer token-1");
  });

  it("deletes a project through the DELETE seam after the confirm dialog", async () => {
    signInGrace();
    const { enqueueAll } = stubFetchQueue();
    enqueueAll([
      [projectFixture({ id: "p1", name: "waveform-api" })],
      { status: 200, body: { message: "Project deleted successfully" } },
      [],
    ]);
    renderView();
    await waitFor(() => expect(screen.getByText("waveform-api")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("dialog", { name: "Delete project" })).toBeTruthy();
    expect(screen.getAllByText("waveform-api").length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Create your first project" })).toBeTruthy(),
    );
    const remove = calls.find(
      (call) => call.method === "DELETE" && call.url.includes("/projects/p1"),
    );
    if (!remove) throw new Error("project delete is missing");
    expect(remove.authorization).toBe("Bearer token-1");
  });
});
