import { Router } from 'express';
import type { RequestHandler } from 'express';

import type { ProjectService } from '../services/project/project.service.js';
import {
  createCreateProjectController,
  createListProjectsController,
  createGetProjectController,
  createUpdateProjectController,
  createDeleteProjectController,
  createProjectAvailabilityController,
} from '../controllers/project.controller.js';

/**
 * HTTP wiring ONLY: paths + guard + controller, one line per endpoint.
 * Service and guard arrive injected from routes/index.ts.
 */
export function createProjectRouter(
  projectService: ProjectService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post('/', requireAuth, createCreateProjectController(projectService));

  // Literal path before '/:id' or it would be swallowed as an id.
  router.get('/availability', requireAuth, createProjectAvailabilityController(projectService));

  router.get('/', requireAuth, createListProjectsController(projectService));

  router.get('/:id', requireAuth, createGetProjectController(projectService));

  router.patch('/:id', requireAuth, createUpdateProjectController(projectService));

  router.delete('/:id', requireAuth, createDeleteProjectController(projectService));

  return router;
}