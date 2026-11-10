import { useCallback, useMemo } from "react";
import {
  useConnectProjectRepositoryMutation,
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useListProjectsQuery,
  useUpdateProjectMutation,
  useVerifyProjectRepositoryMutation,
} from "@/store/projects-api";
import type {
  ConnectRepositoryBody,
  ProjectListResponse,
  ProjectUpdateBody,
} from "@/types/project";
import type {
  DashboardProjectError,
  ProjectModalSubmitResult,
  ProjectModalValues,
  RepositorySubmitResult,
} from "@/types/dashboard";
import { PROJECTS_PAGE_LIMIT } from "@/utils/project-view";
import { apiErrorCode, apiErrorMessage, apiFieldErrorsOf } from "@/utils/api-error";

const ENVIRONMENT_OF = {
  development: "DEVELOPMENT",
  staging: "STAGING",
  production: "PRODUCTION",
} as const;

export const PROJECT_LIST_ERROR_FALLBACK = "Project list could not be loaded.";
const PROJECT_SAVE_FAILED_FALLBACK =
  "We could not reach the planner core. Check your connection and try again.";

function loadErrorOf(error: unknown): DashboardProjectError {
  return {
    code: apiErrorCode(error) ?? "INTERNAL_ERROR",
    message: apiErrorMessage(error, PROJECT_LIST_ERROR_FALLBACK),
  };
}

export function useProjectsPage(page: number): {
  data: ProjectListResponse | undefined;
  loading: boolean;
  refetching: boolean;
  error: DashboardProjectError | null;
  refetch: () => void;
} {
  const query = useListProjectsQuery({ page, limit: PROJECTS_PAGE_LIMIT });
  const refetch = useMemo(() => () => query.refetch(), [query]);
  return useMemo(
    () => ({
      data: query.data,
      loading: query.isLoading || (query.isFetching && query.data === undefined),
      refetching: query.isFetching && query.data !== undefined,
      error: query.isError ? loadErrorOf(query.error) : null,
      refetch,
    }),
    [query, refetch],
  );
}

function submitResultOf(error: unknown): ProjectModalSubmitResult {
  const code = apiErrorCode(error);
  if (code === "DUPLICATE_PROJECT_NAME" || code === "CONFLICT") {
    return {
      kind: "conflict",
      code,
      message: apiErrorMessage(error, "A project with this name already exists."),
    };
  }
  if (code === "VALIDATION_ERROR") {
    return {
      kind: "invalid",
      code,
      message: apiErrorMessage(error, "Validation failed. Verify the highlighted fields."),
      fieldErrors: apiFieldErrorsOf(error),
    };
  }
  return {
    kind: "failed",
    code: code ?? "INTERNAL_ERROR",
    message: apiErrorMessage(error, PROJECT_SAVE_FAILED_FALLBACK),
  };
}

function repositorySubmitResultOf(error: unknown): RepositorySubmitResult {
  const code = apiErrorCode(error);
  if (code === "VALIDATION_ERROR") {
    return {
      kind: "invalid",
      code,
      message: apiErrorMessage(
        error,
        "Validation failed. Verify the highlighted fields.",
      ),
      fieldErrors: apiFieldErrorsOf(error),
    };
  }
  return {
    kind: "failed",
    code: code ?? "INTERNAL_ERROR",
    message: apiErrorMessage(error, PROJECT_SAVE_FAILED_FALLBACK),
  };
}

export function useProjectMutations(): {
  submitting: boolean;
  removing: boolean;
  connecting: boolean;
  verifying: boolean;
  create: (values: ProjectModalValues) => Promise<ProjectModalSubmitResult>;
  update: (
    project: { id: string; name: string; description: string },
    next: ProjectModalValues,
  ) => Promise<ProjectModalSubmitResult>;
  remove: (project: { id: string; name: string }) => Promise<boolean>;
  connect: (
    project: { id: string },
    body: ConnectRepositoryBody,
  ) => Promise<RepositorySubmitResult>;
  verify: (project: { id: string }) => Promise<boolean>;
} {
  const [createProject, createMeta] = useCreateProjectMutation();
  const [updateProject, updateMeta] = useUpdateProjectMutation();
  const [deleteProject, deleteMeta] = useDeleteProjectMutation();
  const [connectRepository, connectMeta] = useConnectProjectRepositoryMutation();
  const [verifyRepository, verifyMeta] = useVerifyProjectRepositoryMutation();

  const create = useCallback(
    async (values: ProjectModalValues): Promise<ProjectModalSubmitResult> => {
      try {
        const response = await createProject({
          name: values.name.trim(),
          description: values.description.trim() ? values.description.trim() : undefined,
          environment: ENVIRONMENT_OF[values.environment],
        }).unwrap();
        return { kind: "success", projectId: response.data.id };
      } catch (error) {
        return submitResultOf(error);
      }
    },
    [createProject],
  );

  const update = useCallback(
    async (
      project: { id: string; name: string; description: string },
      next: ProjectModalValues,
    ): Promise<ProjectModalSubmitResult> => {
      const body: ProjectUpdateBody = {};
      const name = next.name.trim();
      if (name !== project.name.trim()) {
        body.name = name;
      }
      if (next.description !== project.description) {
        body.description = next.description.trim();
      }
      if (Object.keys(body).length === 0) {
        return { kind: "success" };
      }
      try {
        await updateProject({ id: project.id, body }).unwrap();
        return { kind: "success" };
      } catch (error) {
        return submitResultOf(error);
      }
    },
    [updateProject],
  );

  const remove = useCallback(
    async (project: { id: string; name: string }): Promise<boolean> => {
      try {
        await deleteProject({ id: project.id }).unwrap();
        return true;
      } catch {
        return false;
      }
    },
    [deleteProject],
  );

  const connect = useCallback(
    async (
      project: { id: string },
      body: ConnectRepositoryBody,
    ): Promise<RepositorySubmitResult> => {
      try {
        const response = await connectRepository({ id: project.id, body }).unwrap();
        return response.data.repository?.isValid
          ? { kind: "success" }
          : {
              kind: "unverifiable",
              message: response.data.repository?.lastVerificationError ?? undefined,
            };
      } catch (error) {
        return repositorySubmitResultOf(error);
      }
    },
    [connectRepository],
  );

  const verify = useCallback(
    async (project: { id: string }): Promise<boolean> => {
      try {
        await verifyRepository({ id: project.id }).unwrap();
        return true;
      } catch {
        return false;
      }
    },
    [verifyRepository],
  );

  return {
    submitting: createMeta.isLoading || updateMeta.isLoading,
    removing: deleteMeta.isLoading,
    connecting: connectMeta.isLoading,
    verifying: verifyMeta.isLoading,
    create,
    update,
    remove,
    connect,
    verify,
  };
}
