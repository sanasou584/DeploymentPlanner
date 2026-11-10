import type { RequestHandler } from 'express';

import type { ProjectService } from '../services/project/project.service.js';
import { parseOrThrow } from '../shared/validation/request-validation.js';
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsSchema,
  projectIdSchema,
  availabilityQuerySchema,
} from '../services/project/project.schema.js';

// `res.locals.userId` is set by the requireAuth guard on the route line.

export function createCreateProjectController(
  projectService: ProjectService,
): RequestHandler {
  return async (req, res) => {
    const input = parseOrThrow(createProjectSchema, req.body, 'Invalid project data');
    const project = await projectService.create(res.locals.userId, input);

    res.status(201).json({
      message: 'Project created successfully',
      data: project,
    });
  };
}

// GET /projects/availability - case-insensitive ownership probe used by the
// create-project flow to pre-check name collisions across the whole
// workspace. Soft-deleted projects are excluded like every other query.
export function createProjectAvailabilityController(
  projectService: ProjectService,
): RequestHandler {
  return async (req, res) => {
    const input = parseOrThrow(
      availabilityQuerySchema,
      req.query,
      'Invalid availability query',
    );
    const { exists } = await projectService.availability(res.locals.userId, input);

    res.status(200).json({
      message: 'Project name availability checked',
      data: { name: input.name, exists },
    });
  };
}

export function createListProjectsController(
  projectService: ProjectService,
): RequestHandler {
  return async (req, res) => {
    const pagination = parseOrThrow(listProjectsSchema, req.query);
    const result = await projectService.list(res.locals.userId, pagination);

    res.status(200).json(result);
  };
}

export function createGetProjectController(
  projectService: ProjectService,
): RequestHandler {
  return async (req, res) => {
    const id = parseOrThrow(projectIdSchema, req.params.id, 'Invalid project id');
    const project = await projectService.get(res.locals.userId, id);

    res.status(200).json({
      message: 'Project retrieved successfully',
      data: project,
    });
  };
}

export function createUpdateProjectController(
  projectService: ProjectService,
): RequestHandler {
  return async (req, res) => {
    const id = parseOrThrow(projectIdSchema, req.params.id, 'Invalid project id');
    const input = parseOrThrow(updateProjectSchema, req.body, 'Invalid project data');
    const project = await projectService.update(res.locals.userId, id, input);

    res.status(200).json({
      message: 'Project updated successfully',
      data: project,
    });
  };
}

export function createDeleteProjectController(
  projectService: ProjectService,
): RequestHandler {
  return async (req, res) => {
    const id = parseOrThrow(projectIdSchema, req.params.id, 'Invalid project id');

    await projectService.remove(res.locals.userId, id);

    res.status(200).json({ message: 'Project deleted successfully' });
  };
}