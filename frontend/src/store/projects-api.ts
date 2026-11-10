import { apiSlice } from "@/store/api";
import type {
  ConnectRepositoryBody,
  ProjectAvailabilityResponse,
  ProjectDraftBody,
  ProjectListResponse,
  ProjectMutationResponse,
  ProjectResponse,
  ProjectUpdateBody,
} from "@/types/project";

export const projectsApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    listProjects: build.query<ProjectListResponse, { page: number; limit: number }>({
      query: ({ page, limit }) => ({
        url: "/projects",
        params: { page, limit },
      }),
      providesTags: ["Projects"],
    }),
    createProject: build.mutation<ProjectResponse, ProjectDraftBody>({
      query: (body) => ({ url: "/projects", method: "POST", body }),
      invalidatesTags: ["Projects"],
    }),
    updateProject: build.mutation<ProjectResponse, { id: string; body: ProjectUpdateBody }>({
      query: ({ id, body }) => ({ url: `/projects/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Projects"],
    }),
    checkProjectAvailability: build.query<
      ProjectAvailabilityResponse,
      { name: string }
    >({
      query: ({ name }) => ({ url: "/projects/availability", params: { name } }),
    }),
    deleteProject: build.mutation<ProjectMutationResponse, { id: string }>({
      query: ({ id }) => ({ url: `/projects/${id}`, method: "DELETE" }),
      invalidatesTags: ["Projects"],
    }),
    connectProjectRepository: build.mutation<
      ProjectResponse,
      { id: string; body: ConnectRepositoryBody }
    >({
      query: ({ id, body }) => ({
        url: `/projects/${id}/repository`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Projects"],
    }),
    verifyProjectRepository: build.mutation<ProjectResponse, { id: string }>({
      query: ({ id }) => ({
        url: `/projects/${id}/repository/verify`,
        method: "POST",
      }),
      invalidatesTags: ["Projects"],
    }),
  }),
});

export const {
  useListProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useConnectProjectRepositoryMutation,
  useVerifyProjectRepositoryMutation,
  useCheckProjectAvailabilityQuery,
} = projectsApi;
