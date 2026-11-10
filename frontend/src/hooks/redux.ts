import { useContext } from "react";
import { ReactReduxContext, useSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { AppState, AppDispatch } from "@/store/store";
import { appStore } from "@/store/store";

export function useAppDispatch(): AppDispatch {
  const context = useContext(ReactReduxContext);
  return context ? context.store.dispatch : appStore.dispatch;
}

export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector;
