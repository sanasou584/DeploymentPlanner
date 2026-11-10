import type { EnvironmentTone } from "@/types/dashboard";

export const PROJECT_MODAL_ROW = {
  title: "New project",
  closeLabel: "Close dialog",
  nameLabel: "Project name",
  nameRequired: "*",
  slugHint: "Slug compatible",
  namePlaceholder: "shopflow-store",
  conflictMessage: "A project with this name already exists.",
  availabilityChecking: "Checking name availability...",
  descriptionLabel: "Description",
  descriptionHint: "(optional)",
  descriptionPlaceholder: "Brief summary of what this application does...",
  environmentLabel: "Environment",
  environmentHint: "Primary deployment tier configured at creation.",
  environmentMenuHeading: "Select Primary Tier",
  cancelLabel: "Cancel",
  submitLabel: "Create project",
  submitIcon: "add_circle",
  continueLabel: "Link to repo",
  saveDraftLabel: "Save & link later",
  backLabel: "Back",
  createSubmitLabel: "Create project",
  doneLabel: "Done",
  stepDetails: "Step 1 of 2",
  stepRepository: "Step 2 of 2",
  createdUnverifiedHeading: "Project created — repository not verified",
  createdUnverifiedSuffix:
    "Deploys will not run until GitHub verifies it. Re-check it from the project card.",
  createdFailedHeading: "Project created — repository not connected",
  createdFailedSuffix:
    "The project is saved. You can link a repository later from the project card.",
} as const;

export const EDIT_PROJECT_MODAL_ROW = {
  ...PROJECT_MODAL_ROW,
  title: "Edit project",
  submitLabel: "Save changes",
  submitIcon: "check",
} as const;

export const DELETE_PROJECT_MODAL_ROW = {
  title: "Delete project",
  closeLabel: "Close dialog",
  nameLabel: "Project name",
  copyHeading: "Confirm project deletion",
  copy: "This performs a soft delete — the project disappears from your workspace immediately. Its historical plans and deployments stay available for audits.",
  cancelLabel: "Cancel",
  submitLabel: "Delete project",
  submitIcon: "delete",
} as const;

export const CONNECT_REPOSITORY_MODAL_ROW = {
  titleConnect: "Connect repository",
  titleUpdate: "Update repository",
  closeLabel: "Close dialog",
  copy: "Deployments are built from this repository. Use a public GitHub repository and the branch you want to deploy.",
  urlLabel: "Repository URL",
  urlPlaceholder: "https://github.com/octocat/Hello-World",
  urlHint: "Public GitHub repository (github.com/owner/name).",
  urlRequiredMessage: "Repository URL is required.",
  branchLabel: "Branch",
  branchPlaceholder: "main",
  branchHint: "The branch to deploy from.",
  branchRequiredMessage: "Branch is required.",
  currentHeading: "Current repository",
  urlInvalidMessage: "Enter a URL like https://github.com/owner/name.",
  branchInvalidMessage:
    "Branch may only use letters, numbers, dots, dashes, underscores and slashes.",
  unverifiableHeading: "Saved, but verification failed",
  unverifiableFallback:
    "GitHub could not find that repository or branch. Check the URL and branch, then verify again.",
  githubFailedHeading: "Request failed",
  githubFailedMessage:
    "GitHub could not be reached or rejected the request. Try again in a few minutes.",
  cancelLabel: "Cancel",
  connectSubmitLabel: "Connect repository",
  updateSubmitLabel: "Update repository",
  submitIcon: "link",
  verifyLabel: "Verify",
} as const;

export const REPOSITORY_FEEDBACK = {
  verifiedLabel: "verified",
  invalidLabel: "not verified",
} as const;

export const PROJECT_FORM_FEEDBACK = {
  pendingLabel: "Working...",
  failedHeading: "Request failed",
  failedMessage: "We could not reach the planner core. Check your connection and try again.",
} as const;

export const PROJECT_NAME_LIMITS = {
  min: 1,
  max: 120,
  descriptionMax: 1000,
  requiredMessage: "Project name is required.",
  tooLongMessage: "Project name must be 120 characters or fewer.",
  descriptionTooLongMessage: "Description must be 1000 characters or fewer.",
} as const;

export interface EnvironmentOptionRow {
  id: EnvironmentTone;
  label: string;
  badge: string;
  badgeAccent: "tide" | "champagneBright" | "mint" | null;
  dotModerator: string;
}

export const ENVIRONMENT_OPTION_ROWS: EnvironmentOptionRow[] = [
  {
    id: "development",
    label: "Development",
    badge: "",
    badgeAccent: null,
    dotModerator: "bg-teal shadow-teal-dot",
  },
  {
    id: "staging",
    label: "Staging",
    badge: "PRE-PROD",
    badgeAccent: "champagneBright",
    dotModerator: "bg-champagne",
  },
  {
    id: "production",
    label: "Production",
    badge: "LIVE",
    badgeAccent: "mint",
    dotModerator: "bg-mint",
  },
];
