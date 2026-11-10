
import { Types } from 'mongoose';

import { NotFoundError } from '../../domain/errors/index.js';

import { type UserRepository } from '../../repositories/user.repository.js';

function validateId(id: string): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new NotFoundError('User not found');
  }
}

export function createUserApprovalService(
  users: UserRepository,
) {
  async function listPending() {
    const pendingUsers = await users.findByStatus('PENDING');

    return pendingUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    }));
  }

  async function getUser(id: string) {
    validateId(id);

    const user = await users.findById(id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  async function approveUser(id: string) {
    const user = await getUser(id);

    await user.approve();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  }

  async function rejectUser(id: string) {
    const user = await getUser(id);

    await user.reject();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  }

  return {
    listPending,
    approveUser,
    rejectUser,
  };
}

export type UserApprovalService =
  ReturnType<typeof createUserApprovalService>;
