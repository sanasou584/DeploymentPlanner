"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PROJECTS_ROUTE } from "@/data/dashboard";
import { AUTH_LOGIN_ROUTE } from "@/data/navigation";
import { useStartSession } from "@/hooks/use-auth-session";
import { parseGithubHandoff } from "@/utils/auth-responses";

export function GithubHandoff() {
  const startSession = useStartSession();
  const router = useRouter();

  useEffect(() => {
    const handoff = parseGithubHandoff(window.location.hash);
    if (!handoff) {
      router.replace(AUTH_LOGIN_ROUTE.href);
      return;
    }
    startSession(handoff);
    router.replace(PROJECTS_ROUTE.href);
  }, [startSession, router]);

  return null;
}
