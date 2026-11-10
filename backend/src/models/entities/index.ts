/**
 * models/entities - every Mongoose model of the backend, one file per model.
 * Consumers (repositories/services) import from this barrel. Importing the
 * barrel registers every model on the shared connection once, so cross-model
 * `ref`s always resolve.
 */

export {
  USER_MODEL_NAME,
  User,
  type UserDocument,
  type UserFields,
  type UserMethods,
  type UserModel,
  type UserStatics,
  type UserVirtuals,
} from './user.model.js';

export {
  GITHUB_CONNECTION_MODEL_NAME,
  GithubConnection,
  type GithubConnectionDocument,
  type GithubConnectionFields,
  type GithubConnectionMethods,
  type GithubConnectionModel,
  type GithubConnectionStatics,
  type GithubConnectionVirtuals,
} from './github-connection.model.js';

export {
  PROJECT_MODEL_NAME,
  Project,
  type ProjectDocument,
  type ProjectFields,
  type ProjectMethods,
  type ProjectModel,
  type ProjectStatics,
  type ProjectVirtuals,
} from './project.model.js';

export {
  ANALYSIS_MODEL_NAME,
  Analysis,
  type AnalysisComponent,
  type AnalysisDocker,
  type AnalysisDockerFinding,
  type AnalysisDocument,
  type AnalysisFields,
  type AnalysisMethods,
  type AnalysisModel,
  type AnalysisStatics,
  type AnalysisTechnology,
  type AnalysisVirtuals,
} from './analysis.model.js';

export {
  RECOMMENDATION_MODEL_NAME,
  Recommendation,
  type RecommendationDocument,
  type RecommendationFields,
  type RecommendationGeneratedBy,
  type RecommendationMethods,
  type RecommendationModel,
  type RecommendationStatics,
} from './recommendation.model.js';

export {
  DEPLOYMENT_PLAN_MODEL_NAME,
  DeploymentPlan,
  type DeploymentPlanDocument,
  type DeploymentPlanDocumentMethods,
  type DeploymentPlanFields,
  type DeploymentPlanModel,
  type DeploymentPlanStatics,
  type DeploymentPlanVirtuals,
  type PlanComponent,
  type PlanReview,
} from './deployment-plan.model.js';

export {
  GENERATED_FILE_MODEL_NAME,
  GeneratedFile,
  contentHashOf,
  type GeneratedFileDocument,
  type GeneratedFileFields,
  type GeneratedFileMethods,
  type GeneratedFileModel,
  type GeneratedFileStatics,
  type GeneratedFileValidation,
} from './generated-file.model.js';

export {
  DEPLOYMENT_MODEL_NAME,
  Deployment,
  type DeploymentArgo,
  type DeploymentDocument,
  type DeploymentDocumentMethods,
  type DeploymentFields,
  type DeploymentGitops,
  type DeploymentModel,
  type DeploymentStatics,
  type DeploymentVirtuals,
} from './deployment.model.js';

export {
  WORKFLOW_RUN_MODEL_NAME,
  WorkflowRun,
  type WorkflowRunDocument,
  type WorkflowRunFields,
  type WorkflowRunMethods,
  type WorkflowRunModel,
  type WorkflowSubject,
} from './workflow-run.model.js';

export {
  AUDIT_LOG_MODEL_NAME,
  AuditLog,
  type AuditEntity,
  type AuditLogDocument,
  type AuditLogFields,
  type AuditLogModel,
  type AuditLogStatics,
} from './audit-log.model.js';
export {
  AuthIdentity,
  type AuthIdentityDocument,
  type AuthIdentityFields,
} from './auth-identity.model.js';

export {
  SESSION_REVOCATION_MODEL_NAME,
  SessionRevocation,
  type SessionRevocationDocument,
  type SessionRevocationFields,
} from './session-revocation.model.js';
