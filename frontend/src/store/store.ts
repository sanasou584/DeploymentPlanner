import { configureStore } from "@reduxjs/toolkit";
import { authSessionSlice } from "@/store/auth-session";
import { apiSlice } from "@/store/api";

export const appStore = configureStore({
  reducer: {
    authSession: authSessionSlice.reducer,
    api: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

export type AppState = ReturnType<typeof appStore.getState>;
export type AppDispatch = typeof appStore.dispatch;
