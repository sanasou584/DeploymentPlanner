/**
 * Pure helpers for GitHub repository coordinates.
 * `parseGitHubUrl` accepts HTTPS URLs only:
 *   https://github.com/{owner}/{name}(.git)  (optional trailing slash)
 * Everything else (ssh, http, non-GitHub hosts, nested paths, missing parts)
 * is rejected.
 */

const OWNER = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?';
const REPO = '[A-Za-z0-9._-]{1,100}';
const GITHUB_HTTPS_URL = new RegExp(
  `^https://(?:www\\.)?github\\.com/(${OWNER})/(${REPO})(?:\\.git)?/?$`,
);

export interface RepoCoordinates {
  owner: string;
  name: string;
}

export function parseGitHubUrl(url: string): RepoCoordinates {
  const match = GITHUB_HTTPS_URL.exec(url);
  if (!match) {
    throw new Error(`Invalid GitHub repository URL: "${url}"`);
  }
  const [, owner, capturedName] = match;
  const name = capturedName?.endsWith('.git') ? capturedName.slice(0, -4) : capturedName;
  if (!owner || !name || name.length === 0 || name === '.' || name === '..') {
    throw new Error(`Invalid GitHub repository URL: "${url}"`);
  }
  return { owner, name };
}

export function buildGitHubUrl(owner: string, name: string): string {
  return `https://github.com/${owner}/${name}`;
}

/** GitHub username/org: 1-39 alphanumerics/hyphens, no leading/trailing hyphen, no consecutive hyphens. */
const GH_OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

export function isValidGitHubOwner(owner: string): boolean {
  return GH_OWNER.test(owner);
}

/** Repo name as accepted by GitHub: word chars, dot and hyphen. */
const GH_REPO = /^[A-Za-z0-9._-]{1,100}$/;

export function isValidGitHubRepoName(name: string): boolean {
  return GH_REPO.test(name) && !name.startsWith('.') && name !== '..';
}

/** Valid DNS hostname (no port, no scheme, no wildcards). */
const HOSTNAME =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;

export function isValidHostname(host: string): boolean {
  return host.length > 0 && host.length <= 253 && HOSTNAME.test(host);
}
