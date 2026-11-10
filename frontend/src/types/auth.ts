import type { MaterialIconName } from "@/types/icons";

export interface AuthAccount {
  id: string;
  name: string;
  email: string;
  role: string;
}

export type AuthGateStatus = "pending" | "granted" | "denied";

export type AuthAlertTone = "crimson" | "orange" | "champagne";

export type LoginAlertKind =
  | "invalid-credentials"
  | "account-deactivated"
  | "pending-approval"
  | "github-conflict"
  | "session-expired"
  | "unexpected";

export interface AuthAlertBanner {
  id: LoginAlertKind;
  tone: AuthAlertTone;
  icon: MaterialIconName;
  message: string;
}

/** Raw HTTP outcome of one auth request; components map it to UI states. */
export type AuthApiResult =
  | { kind: "http"; httpOk: boolean; status: number; payload: unknown }
  | { kind: "network" };

export interface SignupSubmission {
  name: string;
  email: string;
  password: string;
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export type LoginFieldKey = keyof LoginFormValues;

export type LoginFieldError = string | null;

export type LoginFieldErrors = Partial<Record<LoginFieldKey, LoginFieldError>>;

export interface SignupFormValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type SignupFieldKey = keyof SignupFormValues;

export type SignupFieldErrors = Partial<Record<SignupFieldKey, LoginFieldError>>;
