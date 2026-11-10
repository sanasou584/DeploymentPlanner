import {
  ForbiddenError,
  NotFoundError,
} from '../../domain/errors/index.js';

import { UserRepository } from '../../repositories/user.repository.js';

import type { UserDocument } from '../../models/entities/index.js';

import type {
  ChangePasswordInput,
  UpdateProfileInput,
} from './profile.schema.js';

function toProfileDto(user: UserDocument) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    lastLoginAt: user.lastLoginAt ?? null,
  };
}

function toProfilePatch(input: UpdateProfileInput) {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
  };
}

function requireActive(user: UserDocument | null): UserDocument {
  if (!user) {
    throw new NotFoundError('User not found');
  }

  user.assertCanAuthenticate();

  return user;
}

export function createProfileService(
  users: UserRepository = new UserRepository(),
) {
  async function findActiveUser(id: string) {
    return requireActive(await users.findById(id, { withDeleted: true }));
  }

  async function getProfile(userId: string) {
    return toProfileDto(await findActiveUser(userId));
  }

  async function updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ) {
    const user = await findActiveUser(userId);

    await user.updateProfile(toProfilePatch(input));

    return toProfileDto(user);
  }

  async function changePassword(
    userId: string,
    input: ChangePasswordInput,
  ) {
    const user = requireActive(
      await users.findByIdWithPassword(userId, { withDeleted: true }),
    );

    if (!user.hasLocalPassword()) {
      throw new ForbiddenError('This account has no local password');
    }

    const isValid = await user.verifyPassword(input.currentPassword);

    if (!isValid) {
      throw new ForbiddenError('Current password is incorrect');
    }

    await user.setPassword(input.newPassword);
  }

  return {
    getProfile,
    updateProfile,
    changePassword,
  };
}

export type ProfileService = ReturnType<typeof createProfileService>;