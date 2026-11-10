"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import type {
  AuthAccount,
  AuthAlertBanner,
  SignupFieldErrors,
  SignupFieldKey,
  SignupFormValues,
} from "@/types/auth";
import { AUTH_ALERTS } from "@/data/auth-alerts";
import { useAccountSignup } from "@/hooks/use-auth-request";
import { usePasswordVisibility } from "@/hooks/use-password-visibility";
import { AlertBanner } from "@/shared/alert-banner";
import { Button } from "@/shared/button";
import { MaterialIcon } from "@/shared/material-icon";
import { PasswordStrengthMeter } from "@/shared/password-strength-meter";
import { TextField } from "@/shared/text-field";
import { passwordStrengthScore } from "@/utils/password-strength";
import {
  parseApiError,
  parseAuthSuccess,
  signupFieldErrorsFromApiError,
} from "@/utils/auth-responses";
import { validateSignupForm } from "@/utils/validators";

interface SignupFormProps {
  onSubmit?: (values: SignupFormValues) => void | Promise<void>;
  onCreated?: (account: AuthAccount) => void;
}

const NAME_HINT = "2 to 100 characters";
const PASSWORD_HINT = "8 to 128 characters";
const UNEXPECTED_SIGNUP = AUTH_ALERTS.unexpected;

export function SignupForm({ onSubmit, onCreated }: SignupFormProps) {
  const [values, setValues] = useState<SignupFormValues>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<SignupFieldErrors>({});
  const [alert, setAlert] = useState<AuthAlertBanner | null>(null);
  const { pending, signup } = useAccountSignup();
  const { visible, toggle } = usePasswordVisibility();
  const { visible: confirmVisible, toggle: toggleConfirm } = usePasswordVisibility();

  function handleChange(field: SignupFieldKey) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  async function submitAccount(submission: { name: string; email: string; password: string }): Promise<void> {
    const result = await signup(submission);
    if (result.kind === "network") {
      setAlert(UNEXPECTED_SIGNUP);
      return;
    }
    if (!result.httpOk) {
      const error = parseApiError(result.payload);
      if (error) {
        const serverErrors = signupFieldErrorsFromApiError(error);
        const hasFieldErrors = Object.values(serverErrors).some(Boolean);
        if (hasFieldErrors) {
          setErrors(serverErrors);
          setAlert(null);
          return;
        }
      }
      setAlert(UNEXPECTED_SIGNUP);
      return;
    }
    const success = parseAuthSuccess(result.payload);
    if (!success.user) {
      setAlert(UNEXPECTED_SIGNUP);
      return;
    }
    setAlert(null);
    onCreated?.(success.user);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldErrors = validateSignupForm(values);
    setErrors(fieldErrors);
    const hasErrors = Object.values(fieldErrors).some(Boolean);
    if (hasErrors) {
      return;
    }
    setAlert(null);
    if (onSubmit) {
      void onSubmit({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      return;
    }
    void submitAccount({
      name: values.fullName.trim(),
      email: values.email.trim(),
      password: values.password,
    });
  }

  return (
    <div>
      {alert ? (
        <AlertBanner
          tone={alert.tone}
          icon={<MaterialIcon name={alert.icon} className="shrink-0 text-[18px]" />}
          className="mb-5"
        >
          {alert.message}
        </AlertBanner>
      ) : null}
      <form className="space-y-3.5" onSubmit={handleSubmit} noValidate>
        <TextField
          id="signup-fullname"
          label="Full name"
          labelClass="mb-1.5"
          labelAside={NAME_HINT}
          type="text"
          autoComplete="name"
          placeholder="Ada Lovelace"
          required
          value={values.fullName}
          onChange={handleChange("fullName")}
          disabled={pending}
          error={errors.fullName ?? null}
          icon={<MaterialIcon name="person" className="shrink-0 text-[20px] text-teal" />}
        />
        <TextField
          id="signup-email"
          label="Email"
          labelClass="mb-1.5"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          value={values.email}
          onChange={handleChange("email")}
          disabled={pending}
          error={errors.email ?? null}
          icon={<MaterialIcon name="mail" className="shrink-0 text-[20px] text-teal" />}
        />
        <TextField
          id="signup-password"
          label="Password"
          labelClass="mb-1.5"
          labelAside={PASSWORD_HINT}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
          value={values.password}
          onChange={handleChange("password")}
          disabled={pending}
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
          below={<PasswordStrengthMeter score={passwordStrengthScore(values.password)} />}
        />
        <TextField
          id="signup-confirm"
          label="Confirm password"
          labelClass="mb-1.5"
          type={confirmVisible ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Repeat your password"
          required
          value={values.confirmPassword}
          onChange={handleChange("confirmPassword")}
          disabled={pending}
          error={errors.confirmPassword ?? null}
          icon={<MaterialIcon name="lock" className="shrink-0 text-[20px] text-teal" />}
          trailing={
            <button
              type="button"
              aria-label={confirmVisible ? "Hide confirm password" : "Show confirm password"}
              onClick={toggleConfirm}
              className="flex shrink-0 cursor-pointer items-center justify-center p-1 text-teal transition-colors hover:text-foam focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice/40"
            >
              <MaterialIcon
                name={confirmVisible ? "visibility_off" : "visibility"}
                className="text-[20px]"
              />
            </button>
          }
        />
        <Button type="submit" disabled={pending} className="mt-4 h-12 w-full gap-2 text-sm">
          {pending ? (
            <>
              <MaterialIcon name="progress_activity" className="animate-spin text-[18px]" />
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <span>Create account</span>
              <MaterialIcon name="arrow_forward" className="text-[18px]" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
