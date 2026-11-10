export type RepositoryFieldError =
  | "urlRequired"
  | "urlInvalid"
  | "branchRequired"
  | "branchInvalid";

const URL_PATTERN =
  /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/[A-Za-z0-9._-]{1,100}(\.git)?\/?$/;

const BRANCH_PATTERN = /^[A-Za-z0-9._/-]+$/;

export function repositoryUrlErrorOf(url: string): RepositoryFieldError | undefined {
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return "urlRequired";
  }
  return URL_PATTERN.test(trimmed) ? undefined : "urlInvalid";
}

export function repositoryBranchErrorOf(branch: string): RepositoryFieldError | undefined {
  const trimmed = branch.trim();
  if (trimmed.length === 0) {
    return "branchRequired";
  }
  const unsafe =
    !BRANCH_PATTERN.test(trimmed) ||
    trimmed.includes("..") ||
    trimmed.includes("//") ||
    trimmed.startsWith("/") ||
    trimmed.endsWith("/") ||
    trimmed.split("/").some((segment) => segment.startsWith("."));
  return unsafe ? "branchInvalid" : undefined;
}

export function repositoryFieldErrorsOf(
  url: string,
  branch: string,
): Partial<Record<"url" | "branch", RepositoryFieldError>> {
  const errors: Partial<Record<"url" | "branch", RepositoryFieldError>> = {};
  const urlError = repositoryUrlErrorOf(url);
  if (urlError) {
    errors.url = urlError;
  }
  const branchError = repositoryBranchErrorOf(branch);
  if (branchError) {
    errors.branch = branchError;
  }
  return errors;
}
