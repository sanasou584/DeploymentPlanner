import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AuthAccount } from "@/types/auth";

export interface AuthSessionState {
  token: string | null;
  user: AuthAccount | null;
  hydrated: boolean;
  expired: boolean;
}

export type StoredSession = Pick<AuthSessionState, "token" | "user">;

const initialState: AuthSessionState = {
  token: null,
  user: null,
  hydrated: false,
  expired: false,
};

function isAuthAccount(value: unknown): value is AuthAccount {
  if (typeof value !== "object" || value === null) return false;
  const account = value as Partial<AuthAccount>;
  return (
    typeof account.id === "string" &&
    typeof account.name === "string" &&
    typeof account.email === "string" &&
    typeof account.role === "string"
  );
}

export const authSessionSlice = createSlice({
  name: "authSession",
  initialState,
  reducers: {
    sessionStarted: (
      state,
      action: PayloadAction<{ accessToken: string; user: AuthAccount }>,
    ) => {
      state.token = action.payload.accessToken;
      state.user = action.payload.user;
      state.expired = false;
    },
    sessionCleared: () => initialState,
    sessionRestored: (
      state,
      action: PayloadAction<StoredSession>,
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.hydrated = true;
      state.expired = false;
    },
    sessionExpired: (state) => {
      state.token = null;
      state.user = null;
      state.hydrated = true;
      state.expired = true;
    },
  },
});

export const { sessionStarted, sessionCleared, sessionRestored, sessionExpired } =
  authSessionSlice.actions;

export function parseStoredSession(raw: string | null): StoredSession {
  if (!raw) return initialState;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return initialState;
    const session = parsed as StoredSession;
    if (session.token !== null && typeof session.token !== "string") return initialState;
    if (session.user !== null && !isAuthAccount(session.user)) return initialState;
    return { token: session.token ?? null, user: session.user ?? null };
  } catch {
    return initialState;
  }
}
