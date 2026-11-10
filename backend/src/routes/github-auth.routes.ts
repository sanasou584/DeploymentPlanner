import { Router } from 'express';

import type { GithubAuthDeps } from '../controllers/github-auth.controller.js';
import {
  createGithubStartController,
  createGithubCallbackController,
} from '../controllers/github-auth.controller.js';

/**
 * HTTP wiring ONLY: paths + controllers created ON the route line.
 * Dependencies arrive injected from routes/index.ts (the composition root).
 */
export function createGithubAuthRouter(deps: GithubAuthDeps): Router {
  const router = Router();

  router.get('/github', createGithubStartController(deps));

  router.get('/github/callback', createGithubCallbackController(deps));

  return router;
}
