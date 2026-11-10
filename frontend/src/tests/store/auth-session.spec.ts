import { describe, expect, it } from "vitest";
import {
  authSessionSlice,
  sessionCleared,
  sessionExpired,
  sessionRestored,
  sessionStarted,
  parseStoredSession,
} from "@/store/auth-session";
import type { AuthAccount } from "@/types/auth";

const ADA: AuthAccount = {
  id: "u1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "DEVELOPER",
};

const reducer = authSessionSlice.reducer;

describe("authSession reducer", () => {
  it("starts empty and unhydrated", () => {
    expect(reducer(undefined, { type: "@@INIT" })).toEqual({
      token: null,
      user: null,
      hydrated: false,
      expired: false,
    });
  });

  it("stores the token and user on sessionStarted", () => {
    expect(
      reducer(undefined, sessionStarted({ accessToken: "token-1", user: ADA })),
    ).toEqual({ token: "token-1", user: ADA, hydrated: false, expired: false });
  });

  it("clears everything on sessionCleared", () => {
    expect(
      reducer({ token: "token-1", user: ADA, hydrated: true, expired: false }, sessionCleared()),
    ).toEqual({ token: null, user: null, hydrated: false, expired: false });
  });

  it("restores a persisted session and marks the store hydrated", () => {
    expect(reducer(undefined, sessionRestored({ token: "token-2", user: ADA }))).toEqual({
      token: "token-2",
      user: ADA,
      hydrated: true,
      expired: false,
    });
  });

  it("marks hydration even when persisted storage is empty", () => {
    expect(reducer(undefined, sessionRestored({ token: null, user: null }))).toEqual({
      token: null,
      user: null,
      hydrated: true,
      expired: false,
    });
  });

  it("drops the session and raises the expired flag on sessionExpired", () => {
    const expiredState = reducer(
      { token: "token-1", user: ADA, hydrated: true, expired: false },
      sessionExpired(),
    );
    expect(expiredState).toEqual({
      token: null,
      user: null,
      hydrated: true,
      expired: true,
    });
  });

  it("resets the expired flag on the next sign in", () => {
    const expiredThenSignedIn = sessionStarted;
    expect(
      reducer({ token: null, user: null, hydrated: true, expired: true }, expiredThenSignedIn({ accessToken: "token-2", user: ADA })),
    ).toEqual({ token: "token-2", user: ADA, hydrated: true, expired: false });
  });
});

describe("parseStoredSession", () => {
  it("returns an empty session for null storage", () => {
    expect(parseStoredSession(null)).toEqual({ token: null, user: null, hydrated: false, expired: false });
  });

  it("returns an empty session for malformed JSON", () => {
    expect(parseStoredSession("{broken-json" )).toEqual({
      token: null,
      user: null,
      hydrated: false,
      expired: false,
    });
  });

  it("returns an empty session for wrong shapes", () => {
    expect(parseStoredSession('{"token":"t"}')).toEqual({
      token: null,
      user: null,
      hydrated: false,
      expired: false,
    });
    expect(parseStoredSession('{"token":"t","user":{"id":"u1"}}')).toEqual({
      token: null,
      user: null,
      hydrated: false,
      expired: false,
    });
  });

  it("accepts a stored token and user", () => {
    expect(parseStoredSession(JSON.stringify({ token: "token-3", user: ADA }))).toEqual({
      token: "token-3",
      user: ADA,
    });
  });

  it("keeps the hydration flag out of the persisted payload", () => {
    expect(
      parseStoredSession(JSON.stringify({ token: "token-4", user: ADA, hydrated: true })),
    ).toEqual({ token: "token-4", user: ADA });
  });
});
