
import type { RequestHandler } from 'express';

import type { AuthUser } from '../types/index.js';
import type { UserService } from '../types/index.js';
import { parseOrThrow } from '../shared/validation/request-validation.js';

import {
  userIdSchema,
  searchUsersSchema,
  updateUserSchema,
  changeRoleSchema,
} from '../services/users/user.schema.js';

function getId(params: unknown): string {
  return parseOrThrow(userIdSchema, params).id;
}

function getActor(res: {
  locals: Record<string, unknown>;
}): AuthUser {
  const actor = res.locals.authUser as AuthUser;
  return actor;
}

export function createListUsersController(
  service: UserService,
): RequestHandler {
  return async (req, res) => {
    const input = parseOrThrow(searchUsersSchema, req.query);

    const result = await service.listUsers(input);

    res.status(200).json(result);
  };
}

export function createGetUserController(
  service: UserService,
): RequestHandler {
  return async (req, res) => {
    const id = getId(req.params);

    const user = await service.getUser(id);

    res.status(200).json({ data: user });
  };
}

export function createUpdateUserController(
  service: UserService,
): RequestHandler {
  return async (req, res) => {
    const id = getId(req.params);

    const input = parseOrThrow(updateUserSchema, req.body);

    const user = await service.updateUser(id, input);

    res.status(200).json({ data: user });
  };
}

export function createChangeRoleController(
  service: UserService,
): RequestHandler {
  return async (req, res) => {
    const id = getId(req.params);

    const input = parseOrThrow(changeRoleSchema, req.body);

    const actor = getActor(res);

    const user = await service.changeRole(
      actor.id,
      id,
      input.role,
    );

    res.status(200).json({ data: user });
  };
}

export function createDeactivateUserController(
  service: UserService,
): RequestHandler {
  return async (req, res) => {
    const id = getId(req.params);
    const actor = getActor(res);

    const user = await service.deactivateUser(
      actor.id,
      id,
    );

    res.status(200).json({ data: user });
  };
}

export function createReactivateUserController(
  service: UserService,
): RequestHandler {
  return async (req, res) => {
    const id = getId(req.params);

    const user = await service.reactivateUser(id);

    res.status(200).json({ data: user });
  };
}
