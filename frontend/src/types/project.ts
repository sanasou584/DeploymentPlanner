export type ProjectEnvironment = "DEVELOPMENT" | "STAGING" | "PRODUCTION";

export interface RepositoryRef {
  provider: string;
  owner: string;
  name: string;
  branch: string;
  defaultBranch?: string | null;
  isValid: boolean;
  lastVerifiedAt?: string | null;
  lastVerificationError?: string | null;
}

export interface Project {
  id: string;
  owner: string;
  name: string;
  description?: string | null;
  environment: ProjectEnvironment;
  repository: RepositoryRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiListPagination {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface ProjectListResponse {
  message: string;
  data: Project[];
  pagination: ApiListPagination;
}

export interface ProjectResponse {
  message: string;
  data: Project;
}

export interface ProjectMutationResponse {
  message: string;
}

export interface ProjectAvailabilityResponse {
  message: string;
  data: { name: string; exists: boolean };
}

export interface ProjectDraftBody {
  name: string;
  description?: string;
  environment?: ProjectEnvironment;
}

export interface ConnectRepositoryBody {
  url: string;
  branch: string;
}

export interface ProjectUpdateBody {
  name?: string;
  description?: string;
}
