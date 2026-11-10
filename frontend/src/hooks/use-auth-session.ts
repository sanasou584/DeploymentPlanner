import { useCallback } from "react";
import type { AuthAccount } from "@/types/auth";
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import { sessionCleared, sessionStarted } from "@/store/auth-session";
import type { AuthSessionState } from "@/store/auth-session";

export function useAuthSession(): AuthSessionState {
  return useAppSelector((state) => state.authSession);
}

export function useStartSession(): (session: { accessToken: string; user: AuthAccount }) => void {
  const dispatch = useAppDispatch();
  return useCallback(
    (session) => {
      dispatch(sessionStarted(session));
    },
    [dispatch],
  );
}

export function useSessionClear(): () => void {
  const dispatch = useAppDispatch();
  return useCallback(() => {
    dispatch(sessionCleared());
  }, [dispatch]);
}
