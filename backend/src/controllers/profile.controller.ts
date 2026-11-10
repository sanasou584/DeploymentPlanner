import type { RequestHandler } from 'express';

import type { AuthUser } from '../types/index.js';
import type { ProfileService } from '../services/profile/profile.service.js';
import { parseOrThrow } from '../shared/validation/request-validation.js';

import {
  updateProfileSchema,
  changePasswordSchema,
} from '../services/profile/profile.schema.js';

function getActor(res: {
  locals: Record<string, unknown>;
}): AuthUser {
  return res.locals.authUser as AuthUser;
}

export function createGetProfileController(
  service: ProfileService,
): RequestHandler {
  return async (_req, res) => {
    const actor = getActor(res);

    const data = await service.getProfile(actor.id);

    res.status(200).json({
      message: 'Profile retrieved successfully',
      data,
    });
  };
}

export function createUpdateProfileController(
  service: ProfileService,
): RequestHandler {
  return async (req, res) => {
    const actor = getActor(res);

    const input = parseOrThrow(
      updateProfileSchema,
      req.body,
      'Invalid profile data',
    );

    const data = await service.updateProfile(actor.id, input);

    res.status(200).json({
      message: 'Profile updated successfully',
      data,
    });
  };
}

export function createChangePasswordController(
  service: ProfileService,
): RequestHandler {
  return async (req, res) => {
    const actor = getActor(res);

    const input = parseOrThrow(
      changePasswordSchema,
      req.body,
      'Invalid password data',
    );

    await service.changePassword(actor.id, input);

    res.status(200).json({
      message: 'Password changed successfully',
      data: null,
    });
  };
}