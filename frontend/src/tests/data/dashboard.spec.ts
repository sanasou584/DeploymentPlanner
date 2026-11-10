import { describe, expect, it } from "vitest";
import {
  ADMIN_PENDING_APPROVALS_COUNT,
  AVATAR_MENU_ACCOUNT_SECTION,
  AVATAR_MENU_ADMINISTRATION_SECTION,
  AVATAR_MENU_LOGOUT_LABEL,
  DASHBOARD_BRAND_ROW,
  DASHBOARD_CRUMB_ROW,
  DASHBOARD_GREETING_ROW,
  DASHBOARD_NAV_ROWS,
  DASHBOARD_SEARCH_ROW,
  DASHBOARD_SOON_LABEL,
  DASHBOARD_STATE_ROWS,
  EMPTY_STATE_ROW,
  EMPTY_STAT_ROWS,
  EMPTY_TELEMETRY_ROWS,
  ENVIRONMENT_FILTER_ROWS,
  ENVIRONMENT_LABELS,
  LOGOUT_ROUTE,
  PROJECT_PAGINATION_ROW,
  PROJECT_STATS_ROWS,
  PROJECTS_HEADING_ROW,
  PROJECTS_ROUTE,
  USER_BADGE_ROWS,
  VIEW_TOGGLE_ROWS,
} from "@/data/dashboard";
import {
  ENVIRONMENT_OPTION_ROWS,
  PROJECT_MODAL_ROW,
} from "@/data/dashboard-form";
import type { DashboardFilterId, EnvironmentTone } from "@/types/dashboard";

const ACTIVITY_TONES: EnvironmentTone[] = ["development", "staging", "production"];

describe("dashboard data rows", () => {
  it("routes the workspace through the projects shell", () => {
    expect(PROJECTS_ROUTE).toMatchObject({ label: "Projects", href: "/projects" });
    expect(LOGOUT_ROUTE).toMatchObject({ label: "Log out", href: "/login" });
    expect(DASHBOARD_BRAND_ROW).toMatchObject({
      name: "DeploymentPlanner",
      tagline: "AI Platform",
      sectionLabel: "Telemetry Core",
    });
    expect(DASHBOARD_CRUMB_ROW).toMatchObject({
      brandContext: "DeploymentPlanner AI",
      label: "Projects",
    });
    expect(DASHBOARD_SEARCH_ROW).toMatchObject({
      label: "Search projects",
      placeholder: "Search projects...",
      notificationsLabel: "Notifications",
    });
    expect(DASHBOARD_SOON_LABEL).toBe("Soon");
  });

  it("keeps the telemetry navigation honest about unrealized destinations", () => {
    expect(DASHBOARD_NAV_ROWS).toHaveLength(4);
    const activeRows = DASHBOARD_NAV_ROWS.filter((row) => row.href !== undefined);
    const soonRows = DASHBOARD_NAV_ROWS.filter((row) => row.href === undefined);
    expect(activeRows).toHaveLength(1);
    expect(activeRows[0]).toMatchObject({ label: "Projects", href: "/projects", icon: "folder_open" });
    expect(soonRows.map((row) => row.label)).toEqual(["Analyses", "Plans", "Deployments"]);
    expect(soonRows.every((row) => row.kind === "soon")).toBe(true);
  });

  it("greets the session user without hardcoding an identity", () => {
    expect(DASHBOARD_GREETING_ROW.title).toBe("Welcome back");
    expect(DASHBOARD_GREETING_ROW.subtitle).toBe(
      "Manage your projects and prepare their deployments.",
    );
    expect(DASHBOARD_GREETING_ROW.actionLabel).toBe("New project");
  });

  it("seeds telemetry values at zero until the planner core returns", () => {
    expect(PROJECT_STATS_ROWS).toHaveLength(4);
    expect(PROJECT_STATS_ROWS.map((row) => row.value)).toEqual(["0", "0", "0", "0"]);
    expect(PROJECT_STATS_ROWS.map((row) => row.suffix)).toEqual(["", "ACTIVE", "STANDBY", "LIVE"]);
    expect(EMPTY_STAT_ROWS.map((row) => row.value)).toEqual(["0", "0", "0", "0"]);
    expect(EMPTY_STAT_ROWS.map((row) => row.suffix)).toEqual([
      "allocated",
      "instances",
      "replicas",
      "active",
    ]);
  });

  it("names the workspace loading and failure states from data rows", () => {
    expect(DASHBOARD_STATE_ROWS.loading).toMatchObject({
      icon: "radar",
      heading: "Reading your workspace",
      actionLabel: null,
    });
    expect(DASHBOARD_STATE_ROWS.error).toMatchObject({
      icon: "warning",
      heading: "Planner core unreachable",
      actionLabel: "Retry",
    });
  });

  it("documents the environment filter and heading copy", () => {
    const labels: DashboardFilterId[] = ["all", "development", "staging", "production"];
    expect(ENVIRONMENT_FILTER_ROWS.map((row) => row.id)).toEqual(labels);
    expect(ENVIRONMENT_FILTER_ROWS[0].label).toBe("All");
    expect(PROJECTS_HEADING_ROW).toEqual({ heading: "Your projects" });
  });

  it("exposes the pagination control labels from the mockup", () => {
    expect(PROJECT_PAGINATION_ROW).toEqual({
      previousLabel: "Previous",
      nextLabel: "Next",
    });
    expect(VIEW_TOGGLE_ROWS.map((row) => row.id)).toEqual(["grid", "list"]);
    expect(VIEW_TOGGLE_ROWS.map((row) => row.icon)).toEqual(["grid_view", "view_list"]);
  });

  it("describes the empty workspace state", () => {
    expect(EMPTY_STATE_ROW).toMatchObject({
      ringLabelLeft: "DP-SYS // IDLE",
      ringLabelRight: "WORKSPACE: UNALLOCATED",
      heading: "Create your first project",
      actionLabel: "New project",
    });
    expect(EMPTY_TELEMETRY_ROWS.map((row) => row.label)).toEqual([
      "Zero-trust Blueprint Analysis",
      "Autonomous Topology Inference",
      "Multi-cluster Readiness",
    ]);
  });

  it("documents the new project modal vocabulary", () => {
    expect(PROJECT_MODAL_ROW).toMatchObject({
      title: "New project",
      nameLabel: "Project name",
      slugHint: "Slug compatible",
      conflictMessage: "A project with this name already exists.",
      environmentLabel: "Environment",
      environmentHint: "Primary deployment tier configured at creation.",
      environmentMenuHeading: "Select Primary Tier",
      cancelLabel: "Cancel",
      submitLabel: "Create project",
      submitIcon: "add_circle",
    });
    expect(ENVIRONMENT_OPTION_ROWS.map((row) => row.id)).toEqual(ACTIVITY_TONES);
    expect(ENVIRONMENT_OPTION_ROWS.map((row) => row.badge)).toEqual(["", "PRE-PROD", "LIVE"]);
    expect(ENVIRONMENT_OPTION_ROWS.map((row) => row.label)).toEqual([
      "Development",
      "Staging",
      "Production",
    ]);
    expect(Object.keys(ENVIRONMENT_LABELS)).toEqual([...ACTIVITY_TONES]);
  });

  it("drives the avatar menu per role from data rows", () => {
    expect(ADMIN_PENDING_APPROVALS_COUNT).toBe("3");
    expect(AVATAR_MENU_LOGOUT_LABEL).toBe("Log out");
    expect(AVATAR_MENU_ADMINISTRATION_SECTION).toMatchObject({
      label: "Administration",
      items: [
        {
          id: "pending-approvals",
          label: "Pending approvals",
          icon: "how_to_reg",
          badge: "3",
        },
        { id: "users", label: "Users", icon: "group" },
      ],
    });
    expect(AVATAR_MENU_ACCOUNT_SECTION).toMatchObject({
      label: "Account",
      items: [
        { id: "my-projects", label: "My projects", icon: "folder", href: PROJECTS_ROUTE.href },
        { id: "profile", label: "Profile", icon: "person" },
        { id: "documentation", label: "Documentation", icon: "menu_book", externalMark: true },
      ],
    });
    expect(Object.keys(USER_BADGE_ROWS)).toEqual(["admin", "developer", "other"]);
    expect(USER_BADGE_ROWS.admin).toMatchObject({ label: "Administrator" });
    expect(USER_BADGE_ROWS.admin.classes).toContain("text-champagne");
    expect(USER_BADGE_ROWS.developer).toMatchObject({ label: "Developer" });
    expect(USER_BADGE_ROWS.developer.classes).toContain("text-ice");
    expect(USER_BADGE_ROWS.other.label).toBeUndefined();
    expect(USER_BADGE_ROWS.other.classes).toContain("text-ice");
  });
});
