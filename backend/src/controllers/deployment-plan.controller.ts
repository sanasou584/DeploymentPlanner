
import type { RequestHandler } from 'express';

import { parseOrThrow } from '../shared/validation/request-validation.js';

import {
  createPlanBodySchema,
  planComponentParamsSchema,
  planParamsSchema,
  projectPlansParamsSchema,
  rejectPlanBodySchema,
  updatePlanComponentBodySchema,
} from '../services/deployment-plans/deployment-plan.schema.js';

import type {
  DeploymentPlanService,
} from '../services/deployment-plans/deployment-plan.service.js';

export function createPlanHandler(
  service: DeploymentPlanService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId } = parseOrThrow(
        projectPlansParamsSchema,
        req.params,
        'Invalid project id',
      );

      const body = parseOrThrow(
        createPlanBodySchema,
        req.body,
        'Invalid deployment plan data',
      );

      const plan = await service.create(
        res.locals.userId as string,
        projectId,
        body,
      );

      res.status(201).json({
        message: 'Deployment plan created',
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  };
}

export function listPlansHandler(
  service: DeploymentPlanService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId } = parseOrThrow(
        projectPlansParamsSchema,
        req.params,
        'Invalid project id',
      );

      const plans = await service.list(
        res.locals.userId as string,
        projectId,
      );

      res.json({
        message: 'Deployment plans retrieved',
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  };
}

export function getPlanHandler(
  service: DeploymentPlanService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, planId } = parseOrThrow(
        planParamsSchema,
        req.params,
        'Invalid deployment plan id',
      );

      const plan = await service.get(
        res.locals.userId as string,
        projectId,
        planId,
      );

      res.json({
        message: 'Deployment plan retrieved',
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  };
}

export function updatePlanComponentHandler(
  service: DeploymentPlanService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, planId, name } = parseOrThrow(
        planComponentParamsSchema,
        req.params,
        'Invalid deployment plan component',
      );

      const body = parseOrThrow(
        updatePlanComponentBodySchema,
        req.body,
        'Invalid component update data',
      );

      const plan = await service.updateComponent(
        res.locals.userId as string,
        projectId,
        planId,
        name,
        body,
      );

      res.json({
        message: 'Deployment plan component updated',
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  };
}

export function approvePlanHandler(
  service: DeploymentPlanService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, planId } = parseOrThrow(
        planParamsSchema,
        req.params,
        'Invalid deployment plan id',
      );

      const plan = await service.approve(
        res.locals.userId as string,
        projectId,
        planId,
      );

      res.json({
        message: 'Deployment plan approved',
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  };
}

export function rejectPlanHandler(
  service: DeploymentPlanService,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { projectId, planId } = parseOrThrow(
        planParamsSchema,
        req.params,
        'Invalid deployment plan id',
      );

      const { reason } = parseOrThrow(
        rejectPlanBodySchema,
        req.body,
        'Invalid rejection reason',
      );

      const plan = await service.reject(
        res.locals.userId as string,
        projectId,
        planId,
        reason,
      );

      res.json({
        message: 'Deployment plan rejected',
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  };
}
