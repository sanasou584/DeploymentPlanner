import { BRAND } from "@/data/brand";
import type {
  CrumbRow,
  DashboardBrandRow,
  DashboardHeadingRow,
  DashboardNavRow,
  DashboardStateKind,
  DashboardStateRow,
  DashboardStatRow,
  EmptyStatVisualRow,
  EnvironmentFilterRow,
  EnvironmentTone,
  GreetingRow,
  PaginationRow,
  SearchRow,
  TelemetryRow,
  UserBadgeRow,
  UserMenuRoleKind,
  UserMenuSectionRow,
  ViewToggleRow,
} from "@/types/dashboard";
import type { NavLink } from "@/types/navigation";

export const PROJECTS_ROUTE: NavLink = {
  id: "projects",
  label: "Projects",
  href: "/projects",
};

export const LOGOUT_ROUTE: NavLink = {
  id: "logout",
  label: "Log out",
  href: "/login",
};

export const DASHBOARD_BRAND_ROW: DashboardBrandRow = {
  name: BRAND.wordmarkMain,
  tagline: BRAND.aiTagline,
  sectionLabel: "Telemetry Core",
};

export const DASHBOARD_CRUMB_ROW: CrumbRow = {
  brandContext: `${BRAND.wordmarkMain} ${BRAND.wordmarkAccent}`,
  label: "Projects",
};

export const DASHBOARD_SEARCH_ROW: SearchRow = {
  label: "Search projects",
  placeholder: "Search projects...",
  notificationsLabel: "Notifications",
};

export const DASHBOARD_SOON_LABEL = "Soon";

export const DASHBOARD_NAV_ROWS: DashboardNavRow[] = [  {
    id: "projects",
    label: "Projects",
    href: PROJECTS_ROUTE.href,
    icon: "folder_open",
    kind: "active",
  },
  { id: "analyses", label: "Analyses", icon: "analytics", kind: "soon" },
  { id: "plans", label: "Plans", icon: "schema", kind: "soon" },
  { id: "deployments", label: "Deployments", icon: "alt_route", kind: "soon" },
];

export const DASHBOARD_GREETING_ROW: GreetingRow = {
  title: "Welcome back",
  subtitle: "Manage your projects and prepare their deployments.",
  actionLabel: "New project",
};

export const PROJECT_STATS_ROWS: DashboardStatRow[] = [
  {
    id: "total",
    label: "Total projects",
    value: "0",
    suffix: "",
    accent: "total",
    icon: "folder",
    iconBadge: true,
  },
  {
    id: "development",
    label: "Development",
    value: "0",
    suffix: "ACTIVE",
    accent: "development",
    icon: null,
    iconBadge: true,
  },
  {
    id: "staging",
    label: "Staging",
    value: "0",
    suffix: "STANDBY",
    accent: "staging",
    icon: null,
    iconBadge: true,
  },
  {
    id: "production",
    label: "Production",
    value: "0",
    suffix: "LIVE",
    accent: "production",
    icon: null,
    iconBadge: true,
  },
];

export const PROJECTS_HEADING_ROW: DashboardHeadingRow = {
  heading: "Your projects",
};

export const ENVIRONMENT_FILTER_ROWS: EnvironmentFilterRow[] = [
  { id: "all", label: "All" },
  { id: "development", label: "Development" },
  { id: "staging", label: "Staging" },
  { id: "production", label: "Production" },
];

export const VIEW_TOGGLE_ROWS: ViewToggleRow[] = [
  { id: "grid", label: "Grid view", icon: "grid_view" },
  { id: "list", label: "List view", icon: "view_list" },
];

export const PROJECT_PAGINATION_ROW: PaginationRow = {
  previousLabel: "Previous",
  nextLabel: "Next",
};

export const EMPTY_STAT_ROWS: DashboardStatRow[] = [
  {
    id: "total",
    label: "Total projects",
    value: "0",
    suffix: "allocated",
    accent: "total",
    icon: "folder",
    iconBadge: true,
  },
  {
    id: "development",
    label: "Development",
    value: "0",
    suffix: "instances",
    accent: "development",
    icon: null,
    iconBadge: true,
  },
  {
    id: "staging",
    label: "Staging",
    value: "0",
    suffix: "replicas",
    accent: "staging",
    icon: null,
    iconBadge: true,
  },
  {
    id: "production",
    label: "Production",
    value: "0",
    suffix: "active",
    accent: "production",
    icon: null,
    iconBadge: true,
  },
];

export const EMPTY_STATE_ROW: EmptyStatVisualRow = {
  ringLabelLeft: "DP-SYS // IDLE",
  ringLabelRight: "WORKSPACE: UNALLOCATED",
  heading: "Create your first project",
  copy: "Register an application to start planning its deployment pipelines, container manifests, and cloud topology.",
  actionLabel: "New project",
};

export const DASHBOARD_STATE_ROWS: Record<DashboardStateKind, DashboardStateRow> = {
  loading: {
    icon: "radar",
    iconSpin: true,
    heading: "Reading your workspace",
    copy: "Pulling the latest projects from the planner core.",
    actionLabel: null,
  },
  error: {
    icon: "warning",
    heading: "Planner core unreachable",
    copy: "We could not load your projects. Check your connection and try again.",
    actionLabel: "Retry",
  },
};

export const EMPTY_TELEMETRY_ROWS: TelemetryRow[] = [
  {
    id: "blueprint",
    label: "Zero-trust Blueprint Analysis",
    icon: "verified_user",
    iconAccent: "frostMid",
  },
  {
    id: "topology",
    label: "Autonomous Topology Inference",
    icon: "memory",
    iconAccent: "tide",
  },
  {
    id: "readiness",
    label: "Multi-cluster Readiness",
    icon: "bolt",
    iconAccent: "champagneBright",
  },
];

export const CARD_ACTION_ROW = {
  menuLabel: "Project actions",
  editLabel: "Edit",
  deleteLabel: "Delete",
  connectLabel: "Connect repository",
  updateLabel: "Update repository",
  repositoryOpenLabel: "Open on GitHub",
} as const;

export const ENVIRONMENT_LABELS: Record<EnvironmentTone, string> = {
  development: "Development",
  staging: "Staging",
  production: "Production",
};

export const ADMIN_PENDING_APPROVALS_COUNT = "3";

export const USER_BADGE_ROWS: Record<UserMenuRoleKind, UserBadgeRow> = {
  admin: {
    label: "Administrator",
    classes: "border-champagne/60 bg-champagne/10 text-champagne font-semibold",
  },
  developer: {
    label: "Developer",
    classes: "border-teal/35 bg-teal/20 text-ice font-medium",
  },
  other: {
    classes: "border-teal/35 bg-teal/20 text-ice font-medium",
  },
};

export const AVATAR_MENU_ADMINISTRATION_SECTION: UserMenuSectionRow = {
  id: "administration",
  label: "Administration",
  items: [
    {
      id: "pending-approvals",
      label: "Pending approvals",
      icon: "how_to_reg",
      badge: ADMIN_PENDING_APPROVALS_COUNT,
    },
    { id: "users", label: "Users", icon: "group" },
  ],
};

export const AVATAR_MENU_ACCOUNT_SECTION: UserMenuSectionRow = {
  id: "account",
  label: "Account",
  items: [
    { id: "my-projects", label: "My projects", icon: "folder", href: PROJECTS_ROUTE.href },
    { id: "profile", label: "Profile", icon: "person" },
    {
      id: "documentation",
      label: "Documentation",
      icon: "menu_book",
      externalMark: true,
    },
  ],
};

export const AVATAR_MENU_LOGOUT_LABEL = "Log out";
