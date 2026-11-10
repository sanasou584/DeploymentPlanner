import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthGateStatus } from "@/types/auth";
import { useAuthSession } from "@/hooks/use-auth-session";

export function useAuthGate(redirectTo: string): AuthGateStatus {
  const { token, hydrated } = useAuthSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  const status: AuthGateStatus = !mounted || !hydrated ? "pending" : token ? "granted" : "denied";

  useEffect(() => {
    if (status === "denied") {
      router.replace(redirectTo);
    }
  }, [status, redirectTo, router]);

  return status;
}
