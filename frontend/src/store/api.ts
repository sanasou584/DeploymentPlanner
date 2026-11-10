import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { sessionExpired } from "@/store/auth-session";
import { API_BASE_URL } from "@/store/api-base";

interface AuthSessionSnapshot {
  authSession?: { token?: string | null };
}

function snapshotToken(getState: () => unknown): string | null {
  const state = getState() as AuthSessionSnapshot;
  return state.authSession?.token ?? null;
}

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = snapshotToken(getState);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

/**
 * Expired access tokens (1h lifetime, no refresh endpoint) arrive here as a
 * 401 from any Bearer call: the session is cleared immediately and the login
 * screen picks the "session expired" banner from the store.
 */
const baseQueryWithSessionGuard: typeof baseQuery = async (
  args,
  api,
  extraOptions,
) => {
  const result = await baseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    api.dispatch(sessionExpired());
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithSessionGuard,
  tagTypes: [
  "Projects",
  "Project",
  "Analyses",
  "Recommendations",
  "DeploymentPlans",
],
  endpoints: () => ({}),
});
