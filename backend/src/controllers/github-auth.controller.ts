import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import type { RequestHandler, Response } from 'express';

import { AppError } from '../domain/errors/index.js';
import type { GithubOAuthService } from '../services/auth/github-oauth.service.js';
import type { GithubAuthService } from '../services/auth/github-auth.service.js';
import type { AuthUser, SessionTokenService } from '../types/index.js';

const OAUTH_MAX_AGE = 5 * 60 * 1000;

/**
 * Domain codes the callback converts into a redirect to the frontend with
 * `?github=<code>` — the frontend maps each code to its alert banner. Data
 * table: adding an outcome = one row here, never new branching. Errors that
 * are NOT in this set belong to the central error handler, like everywhere
 * else.
 */
const BROWSER_REDIRECT_CODES = new Set<string>([
  'CONFLICT',
  'ACCOUNT_DISABLED',
  'FORBIDDEN',
]);

/**
 * One shared dependency bag for the GitHub OAuth feature. Built ONCE by
 * routes/index.ts (the composition root) and passed to every controller
 * factory below, so each route line can wire itself directly:
 *   router.get('/github', createGithubStartController(deps));
 */
export interface GithubAuthDeps {
  oauth: GithubOAuthService;
  auth: GithubAuthService;
  sessions: SessionTokenService;
  frontendUrl: string;
  secureCookies: boolean;
}

function equalState(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);

  return x.length === y.length && timingSafeEqual(x, y);
}

function oauthCookieOptions(secureCookies: boolean) {
  return {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax' as const,
    signed: true,
    path: '/api/v1/auth/github',
    maxAge: OAUTH_MAX_AGE,
  };
}

function clearOAuthCookies(res: Response, secureCookies: boolean): void {
  const options = {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax' as const,
    path: '/api/v1/auth/github',
  };

  res.clearCookie('oauth_state', options);
  res.clearCookie('oauth_verifier', options);
}

interface OAuthCallbackData {
  code: string;
  verifier: string;
}

/**
 * Browser handoff (https://github.com/... -> callback -> the React app):
 * the callback is a browser navigation, so the success response is a 302 to
 * the frontend landing on /session with the session in the URL fragment
 * (fragments never reach the server or the referrer). The frontend parses
 * this exact field set under standalone apps — field names live in its
 * parseGithubHandoff util.
 */
function buildHandoffRedirect(
  frontendUrl: string,
  accessToken: string,
  user: AuthUser,
): string {
  const handoff = new URLSearchParams({
    access_token: accessToken,
    user_id: user.id,
    user_name: user.name,
    user_email: user.email,
    user_role: user.role,
  });

  return `${frontendUrl}/session#${handoff.toString()}`;
}

function buildErrorRedirect(
  frontendUrl: string,
  code: string,
): string {
  return `${frontendUrl}/?github=${encodeURIComponent(code)}`;
}

function getOAuthCallbackData(
  state: unknown,
  code: unknown,
  savedState: unknown,
  verifier: unknown,
): OAuthCallbackData | null {
  if (typeof state !== 'string') return null;
  if (typeof code !== 'string') return null;
  if (typeof savedState !== 'string') return null;
  if (typeof verifier !== 'string') return null;
  if (!equalState(state, savedState)) return null;

  return { code, verifier };
}

/**
 * Factories take the deps bag and return route-ready handlers; service
 * contract TYPES come straight from each service file (source of truth).
 */
export function createGithubStartController(
  deps: GithubAuthDeps,
): RequestHandler {
  return (_req, res) => {
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');

    const challenge = createHash('sha256')
      .update(verifier)
      .digest('base64url');

    res.cookie('oauth_state', state, oauthCookieOptions(deps.secureCookies));
    res.cookie('oauth_verifier', verifier, oauthCookieOptions(deps.secureCookies));

    res.redirect(deps.oauth.getAuthorizationUrl(state, challenge));
  };
}


export function createGithubCallbackController(
  deps: GithubAuthDeps,
): RequestHandler {
  return async (req, res) => {
    const state = req.query.state;
    const code = req.query.code;

    const savedState: unknown =
      req.signedCookies?.oauth_state;

    const verifier: unknown =
      req.signedCookies?.oauth_verifier;

    // Supprimer les données temporaires OAuth
    clearOAuthCookies(res, deps.secureCookies);

    // La réponse part en navigation navigateur : jamais de cache.
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Referrer-Policy', 'no-referrer');

    const callbackData = getOAuthCallbackData(
      state,
      code,
      savedState,
      verifier,
    );

    if (callbackData === null) {
      res.redirect(buildErrorRedirect(deps.frontendUrl, 'INVALID_STATE'));
      return;
    }

    let user: AuthUser;

    try {
      const profile = await deps.oauth.getProfile(
        callbackData.code,
        callbackData.verifier,
      );

      user = await deps.auth.login(profile);
    } catch (error) {
      // Transport adapter for the BROWSER hop: the browser that lands here
      // cannot read a JSON error body, so known account outcomes are turned
      // into a redirect carrying their stable code. This try/catch exists
      // ONLY for that transport; every other error keeps bubbling to the
      // central error handler (Express 5 forwards async rejections).
      if (error instanceof AppError && BROWSER_REDIRECT_CODES.has(error.code)) {
        res.redirect(buildErrorRedirect(deps.frontendUrl, error.code));
        return;
      }

      throw error;
    }

    const accessToken = await deps.sessions.create(user.id);

    res.redirect(buildHandoffRedirect(deps.frontendUrl, accessToken, user));
  };
}

