import { z } from 'zod';

import { parseGitHubUrl } from '../../domain/value-objects/repository-url.js';

const BRANCH_PATTERN = /^[A-Za-z0-9._/-]+$/;

function isSafeBranchName(value: string): boolean {
  return (
    !value.includes('..') &&
    !value.includes('//') &&
    !value.startsWith('/') &&
    !value.endsWith('/') &&
    !value.split('/').some((segment) => segment.startsWith('.'))
  );
}

/**
 * The model resolves owner/name through `parseGitHubUrl` (the single source
 * of truth for the URL grammar, https GitHub repositories only). Validating
 * here turns a bad URL into a 400 at the boundary instead of a bare model
 * error surfacing as a 500.
 */
function isGitHubRepositoryUrl(value: string): boolean {
  try {
    parseGitHubUrl(value);
    return true;
  } catch {
    return false;
  }
}

export const connectRepositorySchema = z.strictObject({
  url: z
    .url()
    .max(200)
    .refine(isGitHubRepositoryUrl, {
      message: 'Must be a https GitHub repository URL (github.com/owner/name)',
    }),
  branch: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(BRANCH_PATTERN)
    .refine(isSafeBranchName),
});

export type ConnectRepositoryInput = z.infer<typeof connectRepositorySchema>;
