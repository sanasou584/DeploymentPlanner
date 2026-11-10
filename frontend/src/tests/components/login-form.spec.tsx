// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Provider } from "react-redux";
import { LoginForm } from "@/components/auth/login-form";
import { appStore } from "@/store/store";
import { sessionCleared, sessionExpired } from "@/store/auth-session";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

afterEach(cleanup);
afterEach(() => {
  appStore.dispatch(sessionCleared());
  vi.unstubAllGlobals();
});

const EMAIL_INPUT = () => screen.getByPlaceholderText("you@example.com");
const PASSWORD_INPUT = () => screen.getByPlaceholderText("Enter your password");
const SUBMIT = () => screen.getByRole("button", { name: /log in/i });

function fillEmail(value: string) {
  fireEvent.change(EMAIL_INPUT(), { target: { value } });
}

function fillPassword(value: string) {
  fireEvent.change(PASSWORD_INPUT(), { target: { value } });
}

function stubAuthResponse(payload: unknown, ok: boolean) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 403,
    json: () => Promise.resolve(payload),
  }));
}

function renderLoginForm(props: Parameters<typeof LoginForm>[0] = {}) {
  return render(
    <Provider store={appStore}>
      <LoginForm {...props} />
    </Provider>,
  );
}

async function fillValidCredentialsAndSubmit() {
  fillEmail("ada@lovelace.dev");
  fillPassword("hunter2");
  fireEvent.click(SUBMIT());
}

describe("LoginForm", () => {
  it("renders the submit button only once as the primary button", () => {
    renderLoginForm();;
    expect(screen.getByRole("button", { name: /log in/i })).toBeDefined();
  });

  it("shows a field error when a field is missing", () => {
    renderLoginForm();;
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(screen.getByText("Email is required.")).toBeDefined();
    expect(screen.getByText("Password is required.")).toBeDefined();
  });

  it("invokes onSubmit with valid values", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderLoginForm({ onSubmit });;

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "ada@lovelace.dev" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "hunter2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await Promise.resolve();
    expect(onSubmit).toHaveBeenCalledWith({
      email: "ada@lovelace.dev",
      password: "hunter2",
    });
    expect(screen.queryByText("Email is required.")).toBeNull();
  });

  it("does not submit when validation fails", async () => {
    const onSubmit = vi.fn();
    renderLoginForm({ onSubmit });;

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await Promise.resolve();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a valid email address.")).toBeDefined();
  });

  it("toggles password visibility", () => {
    renderLoginForm();;
    const passwordInput = screen.getByPlaceholderText(
      "Enter your password",
    ) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(passwordInput.type).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(passwordInput.type).toBe("password");
  });
});

describe("LoginForm against the backend", () => {
  it("shows the invalid-credentials banner and red-invalid inputs", async () => {
    stubAuthResponse(
      { error: { code: "UNAUTHORIZED", message: "Invalid email or password" } },
      false,
    );
    renderLoginForm();

    fillValidCredentialsAndSubmit();
    await waitFor(() =>
      expect(screen.getByText("Invalid email or password.")).toBeDefined(),
    );
    expect(EMAIL_INPUT().getAttribute("aria-invalid")).toBe("true");
    expect(PASSWORD_INPUT().getAttribute("aria-invalid")).toBe("true");
  });

  it("shows the deactivated-account banner", async () => {
    stubAuthResponse(
      { error: { code: "ACCOUNT_DISABLED", message: "Account is deactivated" } },
      false,
    );
    renderLoginForm();

    fillValidCredentialsAndSubmit();
    await waitFor(() =>
      expect(
        screen.getByText("Your account has been deactivated. Contact an administrator."),
      ).toBeDefined(),
    );
  });

  it("shows the pending-approval banner", async () => {
    stubAuthResponse(
      { error: { code: "FORBIDDEN", message: "Account is not approved or is disabled" } },
      false,
    );
    renderLoginForm();

    fillValidCredentialsAndSubmit();
    await waitFor(() =>
      expect(
        screen.getByText(
          "Your account is awaiting administrator approval, or has been disabled.",
        ),
      ).toBeDefined(),
    );
  });

  it("shows the unexpected banner when the backend breaks", async () => {
    stubAuthResponse({ error: { code: "INTERNAL_ERROR", message: "boom" } }, false);
    renderLoginForm();

    fillValidCredentialsAndSubmit();
    await waitFor(() =>
      expect(screen.getByText("Something went wrong. Please try again.")).toBeDefined(),
    );
  });

  it("starts a redux session and never shows a failed banner on success", async () => {
    stubAuthResponse(
      {
        message: "Login successful",
        data: { id: "u1", name: "Ada Lovelace", email: "ada@example.com", role: "DEVELOPER" },
        accessToken: "token-1",
      },
      true,
    );
    renderLoginForm();

    fillValidCredentialsAndSubmit();
    await waitFor(() =>
      expect(appStore.getState().authSession).toEqual({
        token: "token-1",
        user: { id: "u1", name: "Ada Lovelace", email: "ada@example.com", role: "DEVELOPER" },
        hydrated: false,
        expired: false,
      }),
    );
    expect(screen.queryByText("Something went wrong. Please try again.")).toBeNull();
  });

  it("disables the inputs and the submit button while pending", async () => {
    const pendingFetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal("fetch", pendingFetch);
    renderLoginForm();

    fillValidCredentialsAndSubmit();
    await waitFor(() => {
      expect((SUBMIT() as HTMLButtonElement).disabled).toBe(true);
    });
    expect((EMAIL_INPUT() as HTMLInputElement).disabled).toBe(true);
    expect((PASSWORD_INPUT() as HTMLInputElement).disabled).toBe(true);
  });
});

describe("LoginForm with an expired session", () => {
  it("shows the session-expired banner after a 401 kicked the session out", () => {
    appStore.dispatch(sessionExpired());
    renderLoginForm();
    expect(
      screen.getByText("Your session has expired. Log in again to continue."),
    ).toBeDefined();
  });

  it("hides the expired banner once a fresh sign-in completes", async () => {
    stubAuthResponse(
      {
        message: "Login successful",
        data: { id: "u1", name: "Ada Lovelace", email: "ada@example.com", role: "DEVELOPER" },
        accessToken: "token-2",
      },
      true,
    );
    appStore.dispatch(sessionExpired());
    renderLoginForm();
    expect(
      screen.getByText("Your session has expired. Log in again to continue."),
    ).toBeDefined();
    fillValidCredentialsAndSubmit();
    await waitFor(() => expect(appStore.getState().authSession.token).toBe("token-2"));
    expect(
      screen.queryByText("Your session has expired. Log in again to continue."),
    ).toBeNull();
  });
});

describe("LoginForm with a redirected GitHub callback", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("shows the pending-approval banner for a ?github=FORBIDDEN redirect", () => {
    window.history.replaceState(null, "", "/?github=FORBIDDEN");
    renderLoginForm();

    expect(
      screen.getByText(
        "Your account is awaiting administrator approval, or has been disabled.",
      ),
    ).toBeDefined();
  });

  it("shows the deactivated banner for a ?github=ACCOUNT_DISABLED redirect", () => {
    window.history.replaceState(null, "", "/?github=ACCOUNT_DISABLED");
    renderLoginForm();

    expect(
      screen.getByText(
        "Your account has been deactivated. Contact an administrator.",
      ),
    ).toBeDefined();
  });

  it("shows the github-conflict banner for a ?github=CONFLICT redirect", () => {
    window.history.replaceState(null, "", "/?github=CONFLICT");
    renderLoginForm();

    expect(
      screen.getByText("A different GitHub account is already linked to this email."),
    ).toBeDefined();
  });

  it("shows the unexpected banner for an unknown callback code", () => {
    window.history.replaceState(null, "", "/?github=THE_UNKNOWN");
    renderLoginForm();

    expect(screen.getByText("Something went wrong. Please try again.")).toBeDefined();
  });

  it("renders no banner when the login page was opened directly", () => {
    window.history.replaceState(null, "", "/");
    renderLoginForm();

    expect(
      screen.queryByText("Your account is awaiting administrator approval, or has been disabled."),
    ).toBeNull();
    expect(screen.queryByText("Something went wrong. Please try again.")).toBeNull();
  });
});
