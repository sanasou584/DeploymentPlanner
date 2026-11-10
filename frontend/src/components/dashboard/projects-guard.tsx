"use client";

import { AUTH_LOGIN_ROUTE } from "@/data/navigation";
import { useAuthGate } from "@/hooks/use-session-guard";
import { ProjectsPage } from "@/components/dashboard/projects-page";

export function ProjectsGuard() {
  const status = useAuthGate(AUTH_LOGIN_ROUTE.href);
  if (status !== "granted") {
    return null;
  }
  return <ProjectsPage />;
}
