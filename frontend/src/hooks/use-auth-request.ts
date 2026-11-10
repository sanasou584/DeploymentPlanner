import { useCallback, useState } from "react";
import type { AuthApiResult, LoginFormValues, SignupSubmission } from "@/types/auth";
import { API_BASE_URL } from "@/store/api-base";

async function postJson(path: string, body: unknown): Promise<AuthApiResult> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    return {
      kind: "http",
      httpOk: response.ok,
      status: response.status,
      payload,
    };
  } catch {
    return { kind: "network" };
  }
}

async function postSignedJson(
  path: string,
  token: string,
): Promise<AuthApiResult> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    return {
      kind: "http",
      httpOk: response.ok,
      status: response.status,
      payload,
    };
  } catch {
    return { kind: "network" };
  }
}

export function useAccountLogin(): {
  pending: boolean;
  login: (values: LoginFormValues) => Promise<AuthApiResult>;
} {
  const [pending, setPending] = useState(false);
  const login = useCallback(async (values: LoginFormValues): Promise<AuthApiResult> => {
    setPending(true);
    try {
      return await postJson("/auth/login", {
        email: values.email,
        password: values.password,
      });
    } finally {
      setPending(false);
    }
  }, []);
  return { pending, login };
}

export function useAccountSignup(): {
  pending: boolean;
  signup: (submission: SignupSubmission) => Promise<AuthApiResult>;
} {
  const [pending, setPending] = useState(false);
  const signup = useCallback(async (submission: SignupSubmission): Promise<AuthApiResult> => {
    setPending(true);
    try {
      return await postJson("/auth/register", {
        name: submission.name,
        email: submission.email,
        password: submission.password,
      });
    } finally {
      setPending(false);
    }
  }, []);
  return { pending, signup };
}

export function useAccountLogout(): {
  pending: boolean;
  logout: (token: string) => Promise<AuthApiResult>;
} {
  const [pending, setPending] = useState(false);
  const logout = useCallback(async (token: string): Promise<AuthApiResult> => {
    setPending(true);
    try {
      return await postSignedJson("/auth/logout", token);
    } finally {
      setPending(false);
    }
  }, []);
  return { pending, logout };
}
