import { describe, expect, it } from "vitest";
import {
  paginationPageWindow,
  projectCountsOf,
  projectCreatedStamp,
  projectRowsOf,
  projectsCountLabel,
  projectsStatusLabel,
  repositorySummaryOf,
  repositoryUrlOf,
  statRowsOf,
  PROJECTS_PAGE_LIMIT,
} from "@/utils/project-view";
import type { Project, RepositoryRef } from "@/types/project";
import type { DashboardStatRow } from "@/types/dashboard";

function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    owner: "u1",
    name: "waveform-api",
    description: "Signal service.",
    environment: "DEVELOPMENT",
    repository: null,
    createdAt: "2026-10-12T10:00:00.000Z",
    updatedAt: "2026-10-12T10:00:00.000Z",
    ...overrides,
  };
}

describe("project view mapping", () => {
  it("maps planner environments onto the mockup tones", () => {
    expect(
      projectRowsOf([
        projectFixture({ environment: "DEVELOPMENT" }),
        projectFixture({ id: "p2", environment: "STAGING" }),
        projectFixture({ id: "p3", environment: "PRODUCTION" }),
      ]),
    ).toEqual([
      {
        id: "p1",
        name: "waveform-api",
        description: "Signal service.",
        environment: "development",
        createdAt: "Created Oct 12, 2026",
        repository: null,
      },
      {
        id: "p2",
        name: "waveform-api",
        description: "Signal service.",
        environment: "staging",
        createdAt: "Created Oct 12, 2026",
        repository: null,
      },
      {
        id: "p3",
        name: "waveform-api",
        description: "Signal service.",
        environment: "production",
        createdAt: "Created Oct 12, 2026",
        repository: null,
      },
    ]);
  });

  it("renders a missing description as an empty string", () => {
    expect(projectRowsOf([projectFixture({ description: null })])[0].description).toBe("");
  });

  it("carries the repository reference through the row mapping", () => {
    const repository: RepositoryRef = {
      provider: "github",
      owner: "octocat",
      name: "Hello-World",
      branch: "main",
      isValid: true,
    };
    const rows = projectRowsOf([projectFixture({ repository })]);
    expect(rows[0].repository).toEqual(repository);
  });

  it("builds the GitHub URL and summary from owner and name", () => {
    const repository: RepositoryRef = {
      provider: "github",
      owner: "octocat",
      name: "Hello-World",
      branch: "main",
      isValid: false,
    };
    expect(repositoryUrlOf(repository)).toBe("https://github.com/octocat/Hello-World");
    expect(repositorySummaryOf(repository)).toBe("octocat/Hello-World");
  });

  it("leaves an unparseable creation timestamp blank instead of throwing", () => {
    expect(projectCreatedStamp("not-a-date")).toBe("");
  });

  it("counts the workspace projects by tier for the telemetry stats", () => {
    expect(
      projectCountsOf([
        projectFixture({ environment: "DEVELOPMENT" }),
        projectFixture({ id: "p2", environment: "PRODUCTION" }),
        projectFixture({ id: "p3", environment: "PRODUCTION" }),
      ]),
    ).toEqual({ total: 3, development: 1, staging: 0, production: 2 });
  });

  it("overlays the computed counts onto the stat rows", () => {
    const rows: DashboardStatRow[] = [
      { id: "total", label: "Total projects", value: "0", suffix: "", accent: "total", icon: null, iconBadge: true },
    ];
    expect(statRowsOf(rows, { total: 7, development: 0, staging: 0, production: 0 })).toEqual([
      { id: "total", label: "Total projects", value: "7", suffix: "", accent: "total", icon: null, iconBadge: true },
    ]);
  });

  it("speaks the mockup count label with singular awareness", () => {
    expect(projectsCountLabel(0)).toBe("0 projects");
    expect(projectsCountLabel(1)).toBe("1 project");
    expect(projectsCountLabel(12)).toBe("12 projects");
  });

  it("clamps the pagination status label into the real range", () => {
    expect(projectsStatusLabel(undefined)).toBe("Page 1 of 1");
    expect(
      projectsStatusLabel({ page: 2, limit: 20, total: 45, pageCount: 3 }),
    ).toBe("Page 2 of 3");
    expect(
      projectsStatusLabel({ page: 9, limit: 20, total: 45, pageCount: 3 }),
    ).toBe("Page 3 of 3");
  });

  it("walks a three-number page window clamped to both ends", () => {
    expect(paginationPageWindow(1, 5)).toEqual([1, 2, 3]);
    expect(paginationPageWindow(3, 5)).toEqual([2, 3, 4]);
    expect(paginationPageWindow(5, 5)).toEqual([3, 4, 5]);
    expect(paginationPageWindow(2, 1)).toEqual([1]);
    expect(paginationPageWindow(0, 0)).toEqual([1]);
  });

  it("keeps the workspace read within the backend limit ceiling", () => {
    expect(PROJECTS_PAGE_LIMIT).toBe(100);
  });
});
