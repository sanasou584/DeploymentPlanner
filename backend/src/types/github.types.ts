/**
 * Shared DTO shape of a GitHub profile — reused across layers (the OAuth
 * service produces it, the GitHub auth service consumes it). Module-local
 * shapes do NOT belong here: derive them with ReturnType in their module.
 */
export interface GithubProfile {
  githubId: string;
  name: string;
  email: string;
}
