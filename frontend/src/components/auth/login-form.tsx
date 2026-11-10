"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { AuthAlertBanner, LoginFormValues } from "@/types/auth";
import { AUTH_ALERTS } from "@/data/auth-alerts";
import { GITHUB_REDIRECT_PARAM } from "@/data/auth-github";
import { PROJECTS_ROUTE } from "@/data/dashboard";
import { useAccountLogin } from "@/hooks/use-auth-request";
import { useAuthSession, useStartSession } from "@/hooks/use-auth-session";
import { usePasswordVisibility } from "@/hooks/use-password-visibility";
import { AlertBanner } from "@/shared/alert-banner";
import { Button } from "@/shared/button";
import { MaterialIcon } from "@/shared/material-icon";
import { TextField } from "@/shared/text-field";
import {
  githubCallbackAlert,
  loginAlertKind,
  parseApiError,
  parseAuthSuccess,
} from "@/utils/auth-responses";
import { validateLoginForm } from "@/utils/validators";

interface LoginFormProps {
  onSubmit?: (values: LoginFormValues) => void | Promise<void>;
}

const INVALID_LOGIN = AUTH_ALERTS["invalid-credentials"];
const UNEXPECTED_LOGIN = AUTH_ALERTS.unexpected;

const subscribeToNothing = () => () => {};

/**
 * The backend callback redirects back with `?github=<code>`; derived during
 * render (not in an effect state) so it survives refreshes without extra
 * navigation.
 */
function useGithubCallbackCode(): string | null {
  return useSyncExternalStore(
    subscribeToNothing,
    () => new URLSearchParams(window.location.search).get(GITHUB_REDIRECT_PARAM),
    () => null,
  );
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<"email" | "password", string | null>>>({});
  const [alert, setAlert] = useState<AuthAlertBanner | null>(null);
  const { pending, login } = useAccountLogin();
  const startSession = useStartSession();
  const router = useRouter();
  const { visible, toggle } = usePasswordVisibility();

  const { expired } = useAuthSession();

  // A redirected callback failure replaces (not stacks with) a submit alert;
  // the expired-session banner shows only when nothing else is raised.
  const githubKind = githubCallbackAlert(useGithubCallbackCode());
  const banner = githubKind
    ? AUTH_ALERTS[githubKind]
    : (alert ?? (expired ? AUTH_ALERTS["session-expired"] : null));

  function handleChange(field: "email" | "password") {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  async function submitCredentials(credentials: LoginFormValues): Promise<void> {
    const result = await login(credentials);
    if (result.kind === "network") {
      setAlert(UNEXPECTED_LOGIN);
      return;
    }
    if (!result.httpOk) {
      const error = parseApiError(result.payload);
      setAlert(
        error ? AUTH_ALERTS[loginAlertKind(error.code)] : UNEXPECTED_LOGIN,
      );
      return;
    }
    const success = parseAuthSuccess(result.payload);
    if (!success.user || !success.accessToken) {
      setAlert(UNEXPECTED_LOGIN);
      return;
    }
    setAlert(null);
    startSession({ accessToken: success.accessToken, user: success.user });
    router.replace(PROJECTS_ROUTE.href);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldErrors = validateLoginForm(values);
    setErrors(fieldErrors);
    if (fieldErrors.email || fieldErrors.password) {
      return;
    }
    setAlert(null);
    const credentials = { email: values.email.trim(), password: values.password };
    if (onSubmit) {
      void onSubmit(credentials);
      return;
    }
    void submitCredentials(credentials);
  }

  return (
    <div>
      {banner ? (
        <AlertBanner
          tone={banner.tone}
          icon={<MaterialIcon name={banner.icon} className="shrink-0 text-[18px]" />}
          className="mb-5"
        >
          {banner.message}
        </AlertBanner>
      ) : null}
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          value={values.email}
          onChange={handleChange("email")}
          disabled={pending}
          invalid={banner?.id === INVALID_LOGIN.id}
          error={errors.email ?? null}
          icon={<MaterialIcon name="mail" className="shrink-0 text-[20px] text-teal" />}
        />
        <TextField
          id="password"
          label="Password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          value={values.password}
          onChange={handleChange("password")}
          disabled={pending}
          invalid={banner?.id === INVALID_LOGIN.id}
          error={errors.password ?? null}
          icon={<MaterialIcon name="lock" className="shrink-0 text-[20px] text-teal" />}
          trailing={
            <button
              type="button"
              aria-label={visible ? "Hide password" : "Show password"}
              onClick={toggle}
              className="flex shrink-0 cursor-pointer items-center justify-center p-1 text-teal transition-colors hover:text-foam focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice/40"
            >
              <MaterialIcon
                name={visible ? "visibility_off" : "visibility"}
                className="text-[20px]"
              />
            </button>
          }
        />
        <Button type="submit" disabled={pending} className="mt-7 h-12 w-full gap-2 text-sm">
          <span>Log in</span>
          <MaterialIcon name="arrow_forward" className="text-[18px]" />
        </Button>
      </form>
    </div>
  );
}
