
import type { RequestHandler } from 'express';

import { parseOrThrow } from '../shared/validation/request-validation.js';
import { userIdSchema } from '../services/users/user.schema.js';

import type {
  UserApprovalService,
} from '../services/users/user-approval.service.js';

function readId(params: unknown): string {
  return parseOrThrow(userIdSchema, params).id;
}

export function createListPendingController(
  service: UserApprovalService,
): RequestHandler {
  return async (_req, res) => {
    const users = await service.listPending();

    res.status(200).json({
      message: 'Pending registrations',
      data: users,
    });
  };
}

export function createApproveUserController(
  service: UserApprovalService,
): RequestHandler {
  return async (req, res) => {
    const id = readId(req.params);

    const user = await service.approveUser(id);

    res.status(200).json({
      message: 'User approved successfully',
      data: user,
    });
  };
}

export function createRejectUserController(
  service: UserApprovalService,
): RequestHandler {
  return async (req, res) => {
    const id = readId(req.params);

    const user = await service.rejectUser(id);

    res.status(200).json({
      message: 'User registration rejected',
      data: user,
    });
  };
}
