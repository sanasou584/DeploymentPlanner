"use client";

import { useEffect, type ReactNode } from "react";
import { Provider } from "react-redux";
import { appStore } from "@/store/store";
import { parseStoredSession, sessionRestored } from "@/store/auth-session";

const STORAGE_KEY = "deployment-planner-ai.auth-session";

export const AUTH_SESSION_STORAGE_KEY = STORAGE_KEY;

export function ReduxProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (appStore.getState().authSession.token) return;
    appStore.dispatch(sessionRestored(parseStoredSession(window.localStorage.getItem(STORAGE_KEY))));
  }, []);

  useEffect(() => {
    const persist = () => {
      const { token, user } = appStore.getState().authSession;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    };
    persist();
    return appStore.subscribe(persist);
  }, []);

  return <Provider store={appStore}>{children}</Provider>;
}
