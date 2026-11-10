import type { ApiErrorBody } from "@/types/api";
import type {
  AuthAccount,
  LoginAlertKind,
  SignupFieldErrors,
  SignupFieldKey,
} from "@/types/auth";

const LOGIN_ALERTS_BY_CODE: Record<string, LoginAlertKind> = {
  UNAUTHORIZED: "invalid-credentials",
  ACCOUNT_DISABLED: "account-deactivated",
  FORBIDDEN: "pending-approval",
};

export function loginAlertKind(code: string): LoginAlertKind {
  return LOGIN_ALERTS_BY_CODE[code] ?? "unexpected";
}

const GITHUB_CALLBACK_ALERTS_BY_CODE: Record<string, LoginAlertKind> = {
  FORBIDDEN: "pending-approval",
  ACCOUNT_DISABLED: "account-deactivated",
  CONFLICT: "github-conflict",
};

export function githubCallbackAlert(code: string | null): LoginAlertKind | null {
  if (code === null) return null;
  return GITHUB_CALLBACK_ALERTS_BY_CODE[code] ?? "unexpected";
}

const GITHUB_HANDOFF_PARAMS = [
  "access_token",
  "user_id",
  "user_name",
  "user_email",
  "user_role",
] as const;

/**
 * Parses the URL fragment the backend OAuth callback redirects through
 * (`/session#access_token=...&user_id=...`). Returns null when the fragment
 * is absent or incomplete — the session page then routes back to login.
 */
export function parseGithubHandoff(
  rawFragment: string,
): { user: AuthAccount; accessToken: string } | null {
  const fragment = rawFragment.replace(/^#/, "");
  if (!fragment) return null;
  const params = new URLSearchParams(fragment);
  const fields = GITHUB_HANDOFF_PARAMS.map((name) => params.get(name));
  if (fields.some((field) => !field)) return null;
  const { user, accessToken } = parseAuthSuccess({
    data: {
      id: fields[1],
      name: fields[2],
      email: fields[3],
      role: fields[4],
    },
    accessToken: fields[0],
  });
  if (!user || !accessToken) return null;
  return { user, accessToken };
}

export function parseApiError(payload: unknown): ApiErrorBody | null {
  if (typeof payload !== "object" || payload === null) return null;
  const envelope = payload as { error?: unknown };
  if (typeof envelope.error !== "object" || envelope.error === null) return null;
  const error = envelope.error as Partial<ApiErrorBody>;
  if (typeof error.code !== "string" || typeof error.message !== "string") return null;
  return { code: error.code, message: error.message, details: error.details };
}

export interface AuthSuccessPayload {
  user: AuthAccount | null;
  accessToken: string | null;
}

export function parseAuthSuccess(payload: unknown): AuthSuccessPayload {
  if (typeof payload !== "object" || payload === null) return { user: null, accessToken: null };
  const body = payload as { data?: unknown; accessToken?: unknown };
  return {
    user: parseAuthAccount(body.data),
    accessToken: typeof body.accessToken === "string" ? body.accessToken : null,
  };
}

function parseAuthAccount(value: unknown): AuthAccount | null {
  if (typeof value !== "object" || value === null) return null;
  const account = value as Partial<AuthAccount>;
  if (
    typeof account.id !== "string" ||
    typeof account.name !== "string" ||
    typeof account.email !== "string" ||
    typeof account.role !== "string"
  ) {
    return null;
  }
  return { id: account.id, name: account.name, email: account.email, role: account.role };
}

const SIGNUP_FIELDS_BY_API_FIELD: Record<string, SignupFieldKey> = {
  name: "fullName",
  email: "email",
  password: "password",
};

export function signupFieldErrorsFromApiError(error: ApiErrorBody): SignupFieldErrors {
  if (error.code === "CONFLICT") {
    return { email: error.message };
  }
  if (error.code !== "VALIDATION_ERROR") {
    return {};
  }
  const details = error.details as { fieldErrors?: Record<string, string[]> } | undefined;
  const fieldErrors = details?.fieldErrors;
  if (!fieldErrors) return {};
  const mapped: SignupFieldErrors = {};
  for (const [apiField, messages] of Object.entries(fieldErrors)) {
    const field = SIGNUP_FIELDS_BY_API_FIELD[apiField];
    const first = messages?.[0];
    if (field && first) mapped[field] = first;
  }
  return mapped;
}
