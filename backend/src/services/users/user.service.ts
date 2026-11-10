
import {
  ForbiddenError,
  NotFoundError,
  InvariantViolationError,
} from '../../domain/errors/index.js';

import { UserRepository } from '../../repositories/user.repository.js';

import type { UserDocument } from '../../models/entities/index.js';
import type { AuthUser } from '../../types/index.js';
import type {
  UserRole,
} from '../../domain/enums/user.enums.js';

import type {
  SearchUsersInput,
  UpdateUserInput,
} from './user.schema.js';

function toUserDto(user: UserDocument) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ?? null,
  };
}

export function createUserService(
  users: UserRepository = new UserRepository(),
) {
  async function findUser(id: string) {
    const user = await users.findById(id, {
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  async function getAuthenticatedUser(
    id: string,
  ): Promise<AuthUser> {
    const user = await findUser(id);

    user.assertCanAuthenticate();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  async function listUsers(input: SearchUsersInput) {
    const result = await users.search({
      q: input.q,
      role: input.role,
      includeDeleted: input.includeDeleted,
      page: input.page,
      limit: input.limit,
    });

    return {
      data: result.items.map(toUserDto),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pageCount: result.pageCount,
      },
    };
  }

  async function getUser(id: string) {
    return toUserDto(await findUser(id));
  }

  async function updateUser(
    id: string,
    input: UpdateUserInput,
  ) {
    const user = await findUser(id);

    if (!user.isActive) {
      throw new ForbiddenError(
        'Cannot modify a deactivated user',
      );
    }

    await user.updateProfile({
      name: input.name,
    });

    return toUserDto(user);
  }

  async function changeRole(
    actorId: string,
    targetId: string,
    role: UserRole,
  ) {
    if (actorId === targetId) {
      throw new ForbiddenError(
        'Cannot change your own role',
      );
    }

    const user = await findUser(targetId);

    if (!user.isActive) {
      throw new ForbiddenError(
        'Cannot change the role of a deactivated user',
      );
    }

    if (user.role === role) {
      throw new InvariantViolationError(
        'User already has this role',
      );
    }

    await user.changeRole(role);

    return toUserDto(user);
  }

  async function deactivateUser(
    actorId: string,
    targetId: string,
  ) {
    if (actorId === targetId) {
      throw new ForbiddenError(
        'Cannot deactivate your own account',
      );
    }

    const user = await findUser(targetId);

    await user.deactivate();

    return toUserDto(user);
  }

  async function reactivateUser(id: string) {
    const user = await findUser(id);

    await user.reactivate();

    return toUserDto(user);
  }

  return {
    getAuthenticatedUser,
    listUsers,
    getUser,
    updateUser,
    changeRole,
    deactivateUser,
    reactivateUser,
  };
}
