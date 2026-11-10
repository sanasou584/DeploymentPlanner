import type {
  DashboardStatRow,
  EnvironmentTone,
  ProjectRow,
  StatAccent,
} from "@/types/dashboard";
import type {
  ApiListPagination,
  Project,
  ProjectEnvironment,
  RepositoryRef,
} from "@/types/project";

const TONE_BY_ENVIRONMENT: Record<ProjectEnvironment, EnvironmentTone> = {
  DEVELOPMENT: "development",
  STAGING: "staging",
  PRODUCTION: "production",
};

const CREATED_STAMP_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function environmentToneOf(environment: ProjectEnvironment): EnvironmentTone {
  return TONE_BY_ENVIRONMENT[environment];
}

/** "Created Oct 12, 2026" — fixed en-US stamp; the row renders client-side only. */
export function projectCreatedStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `Created ${CREATED_STAMP_FORMAT.format(date)}`;
}

/** Always built from owner/name; GitHub is the only supported provider. */
export function repositoryUrlOf(repository: RepositoryRef): string {
  return `https://github.com/${repository.owner}/${repository.name}`;
}

export function repositorySummaryOf(repository: RepositoryRef): string {
  return `${repository.owner}/${repository.name}`;
}

export function projectRowOf(project: Project): ProjectRow {
  return {
    id: project.id,
    name: project.name,
    description: project.description ?? "",
    environment: environmentToneOf(project.environment),
    createdAt: projectCreatedStamp(project.createdAt),
    repository: project.repository ?? null,
  };
}

export function projectRowsOf(projects: Project[]): ProjectRow[] {
  return projects.map(projectRowOf);
}

export function projectCountsOf(projects: Project[]): Record<StatAccent, number> {
  const counts: Record<StatAccent, number> = {
    total: projects.length,
    development: 0,
    staging: 0,
    production: 0,
  };
  for (const project of projects) {
    counts[TONE_BY_ENVIRONMENT[project.environment]] += 1;
  }
  return counts;
}

export function statRowsOf(
  rows: DashboardStatRow[],
  counts: Record<StatAccent, number>,
): DashboardStatRow[] {
  return rows.map((row) => ({ ...row, value: String(counts[row.accent] ?? 0) }));
}

export const PROJECTS_PAGE_LIMIT = 100;

export function projectsCountLabel(total: number): string {
  return `${total} ${total === 1 ? "project" : "projects"}`;
}

/** "Page 2 of 5"; empty lists report "Page 1 of 1". */
export function projectsStatusLabel(pagination?: ApiListPagination): string {
  if (!pagination) {
    return "Page 1 of 1";
  }
  const pageCount = Math.max(1, pagination.pageCount);
  return `Page ${Math.min(Math.max(1, pagination.page), pageCount)} of ${pageCount}`;
}

/** Three-number window centered on the current page, clamped to the range. */
export function paginationPageWindow(page: number, pageCount: number): number[] {
  const boundedCount = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), boundedCount);
  const start = Math.min(Math.max(1, current - 1), Math.max(1, boundedCount - 2));
  const pages: number[] = [];
  for (let candidate = start; candidate < start + 3 && candidate <= boundedCount; candidate += 1) {
    pages.push(candidate);
  }
  return pages;
}
