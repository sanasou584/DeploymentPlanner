import { z } from 'zod';

import type { GithubProfile } from '../../types/index.js';

const tokenSchema = z.object({
  access_token: z.string().min(1),
});

const profileSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable(),
});

const emailSchema = z.array(z.object({
  email: z.email(),
  primary: z.boolean(),
  verified: z.boolean(),
}));

const GITHUB_TIMEOUT_MS = 10_000;

/**
 * Fetch + check + zod-parse in ONE step, so no caller mixes branching with
 * business flow (keeps each function's complexity low - the CodeScene
 * "Complex Method" rule).
 */
function fetchGithubJson<T>(
  url: string,
  init: RequestInit,
  schema: z.ZodType<T>,
  failMessage: string,
): Promise<T> {
  return (async () => {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(failMessage);
    }

    return schema.parse(await response.json());
  })();
}

/**
 * Functional service factory (docs/conventions.md, "Services"). Values are
 * frozen at creation time - no config read, no class, no `this`.
 */
export function createGithubOAuthService(
  clientId: string,
  clientSecret: string,
  callbackUrl: string,
) {
  function getAuthorizationUrl(
    state: string,
    challenge: string,
  ): string {
    const url = new URL('https://github.com/login/oauth/authorize');

    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('scope', 'read:user user:email');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return url.toString();
  }

  function apiHeaders(accessToken: string): Record<string, string> {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
    };
  }

  /** Step 1: OAuth code -> access token. */
  async function exchangeCodeForToken(
    code: string,
    verifier: string,
  ): Promise<string> {
    const token = await fetchGithubJson(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUrl,
          code,
          code_verifier: verifier,
        }),
      },
      tokenSchema,
      'GitHub token exchange failed',
    );

    return token.access_token;
  }

  /** Step 2: access token -> (profile, emails), in parallel. */
  async function fetchProfileAndEmails(accessToken: string) {
    return Promise.all([
      fetchGithubJson(
        'https://api.github.com/user',
        { headers: apiHeaders(accessToken) },
        profileSchema,
        'GitHub profile retrieval failed',
      ),
      fetchGithubJson(
        'https://api.github.com/user/emails',
        { headers: apiHeaders(accessToken) },
        emailSchema,
        'GitHub profile retrieval failed',
      ),
    ]);
  }

  /** Step 3: identity picks its verified primary email. */
  function verifiedPrimaryEmail(emails: z.infer<typeof emailSchema>): string {
    const primary = emails.find((item) => item.primary && item.verified);

    if (!primary) {
      throw new Error('Verified primary email required');
    }

    return primary.email.toLowerCase();
  }

  async function getProfile(
    code: string,
    verifier: string,
  ): Promise<GithubProfile> {
    const accessToken = await exchangeCodeForToken(code, verifier);

    const [user, emails] = await fetchProfileAndEmails(accessToken);

    return {
      githubId: String(user.id),
      name: user.name || user.login,
      email: verifiedPrimaryEmail(emails),
    };
  }

  return { getAuthorizationUrl, getProfile };
}

/**
 * Service contract, derived at its SOURCE (docs/conventions.md, "Types &
 * contracts") - never redeclared elsewhere; GithubProfile comes from src/types.
 */
export type GithubOAuthService = ReturnType<typeof createGithubOAuthService>;
