import type {
  LoginFieldErrors,
  LoginFormValues,
  SignupFieldErrors,
  SignupFormValues,
} from "@/types/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FULL_NAME_MIN_LENGTH = 2;
const FULL_NAME_MAX_LENGTH = 100;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export function validateEmail(value: string): string | null {
  if (!value.trim()) {
    return "Email is required.";
  }
  if (!EMAIL_PATTERN.test(value.trim())) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) {
    return "Password is required.";
  }
  return null;
}

export function validateLoginForm(values: LoginFormValues): LoginFieldErrors {
  return {
    email: validateEmail(values.email),
    password: validatePassword(values.password),
  };
}

export function validateFullName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Full name is required.";
  }
  if (trimmed.length < FULL_NAME_MIN_LENGTH) {
    return `Full name must be at least ${FULL_NAME_MIN_LENGTH} characters.`;
  }
  if (trimmed.length > FULL_NAME_MAX_LENGTH) {
    return `Full name must be at most ${FULL_NAME_MAX_LENGTH} characters.`;
  }
  return null;
}

export function validateSignupPassword(value: string): string | null {
  if (!value) {
    return "Password is required.";
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  }
  return null;
}

export function validateSignupConfirm(confirmPassword: string, password: string): string | null {
  if (!confirmPassword) {
    return "Confirm password is required.";
  }
  if (confirmPassword !== password) {
    return "Passwords do not match.";
  }
  return null;
}

export function validateSignupForm(values: SignupFormValues): SignupFieldErrors {
  return {
    fullName: validateFullName(values.fullName),
    email: validateEmail(values.email),
    password: validateSignupPassword(values.password),
    confirmPassword: validateSignupConfirm(values.confirmPassword, values.password),
  };
}
