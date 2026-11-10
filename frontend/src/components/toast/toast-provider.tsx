"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/utils/class-names";
import { MaterialIcon } from "@/shared/material-icon";
import type { MaterialIconName } from "@/types/icons";

export type ToastTone = "mint" | "crimson" | "champagne" | "ice";

export interface Toast {
  id: string;
  tone: ToastTone;
  title?: string;
  message: string;
}

interface ToastContextValue {
  push: (toast: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_CLASSES: Record<ToastTone, string> = {
  mint: "border-mint/40 bg-basin/95 text-mint",
  crimson: "border-crimson/40 bg-basin/95 text-crimson",
  champagne: "border-champagne/40 bg-basin/95 text-champagne",
  ice: "border-ice/40 bg-basin/95 text-ice",
};

const TONE_ICON: Record<ToastTone, MaterialIconName> = {
  mint: "check_circle",
  crimson: "error",
  champagne: "warning",
  ice: "verified_user",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => dismiss(id), 4500);
    return id;
  }, [dismiss]);
  const contextValue = useMemo(
  () => ({ push, dismiss }),
  [push, dismiss]
);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-[360px] max-w-[calc(100vw-3rem)] flex-col gap-3"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur",
                TONE_CLASSES[toast.tone],
              )}
            >
              <MaterialIcon name={TONE_ICON[toast.tone]} className="mt-0.5 shrink-0 text-[18px]" />
              <div className="min-w-0 flex-1">
                {toast.title ? (
                  <p className="font-display text-body-md font-semibold text-foam">{toast.title}</p>
                ) : null}
                <p className="font-display text-body-sm text-mist">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="shrink-0 text-mist transition-colors hover:text-foam"
              >
                <MaterialIcon name="close" className="text-[16px]" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
