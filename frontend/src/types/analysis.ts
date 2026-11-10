export type AnalysisStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export type TechnologyCategory =
  | "LANGUAGE"
  | "FRAMEWORK"
  | "LIBRARY"
  | "DATABASE"
  | "BUILD_TOOL"
  | "RUNTIME"
  | "OTHER";

export type AnalysisComponentType =
  | "FRONTEND"
  | "BACKEND"
  | "DATABASE"
  | "WORKER"
  | "OTHER";

export type DockerFindingSeverity = "INFO" | "WARNING" | "ERROR";

export interface AnalysisTechnology {
  name: string;
  version?: string | null;
  category: TechnologyCategory;
  sourceFile?: string | null;
}

export interface AnalysisComponent {
  name: string;
  type: AnalysisComponentType;
  rootPath: string;
}

export interface AnalysisDockerFinding {
  ruleId: string;
  severity: DockerFindingSeverity;
  message: string;
  file?: string | null;
  line?: number | null;
}

export interface AnalysisDocker {
  hasDockerfile: boolean;
  hasCompose: boolean;
  findings: AnalysisDockerFinding[];
}

export interface AnalysisError {
  code: string;
  message: string;
}

export interface Analysis {
  id: string;
  project: string;
  requestedBy: string;
  number: number;
  status: AnalysisStatus;
  branch: string;
  detectedFiles: string[];
  technologies: AnalysisTechnology[];
  components: AnalysisComponent[];
  docker: AnalysisDocker;
  error?: AnalysisError | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisResponse {
  message: string;
  data: Analysis;
}

export interface AnalysisListResponse {
  message: string;
  data: Analysis[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
  };
}

export type RecommendationType =
  | "REPLICAS"
  | "CPU"
  | "MEMORY"
  | "HPA"
  | "INGRESS"
  | "DOCKER"
  | "SECURITY"
  | "GENERAL";

export type RecommendationSeverity = "INFO" | "WARNING" | "CRITICAL";

export type RecommendationStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface RecommendationProposedFile {
  path: string;
  content: string;
}

export interface RecommendationGeneratedBy {
  provider: string;
  model: string;
}

export interface Recommendation {
  id: string;
  analysisId: string;
  generatedBy: RecommendationGeneratedBy;
  type: RecommendationType;
  severity: RecommendationSeverity;
  title: string;
  description: string;
  componentName?: string | null;
  suggestedValue?: string | null;
  confidence?: number | null;
  proposedFile?: RecommendationProposedFile | null;
  status: RecommendationStatus;
  decisionNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationListResponse {
  message: string;
  data: Recommendation[];
}

export interface RecommendationAuditResponse {
  message: string;
  data: {
    created: number;
    recommendations: Recommendation[];
  };
}

export interface RecommendationResponse {
  message: string;
  data: Recommendation;
}

export interface AiAuditRequested {
  message: string;
  data: {
    analysisId: string;
    status: string;
  };
}

export interface RejectRecommendationBody {
  note?: string;
}
