import { type UserRole } from '../domain/enums/user.enums.js';
import { User, type UserDocument, type UserFields, type UserMethods, type UserVirtuals } from '../models/entities/index.js';
import {
  BaseRepository,
  normalizedLimit,
  normalizedPage,
  type PaginatedResult,
  type RepositoryFilter,
  type RepositoryOptions,
} from './base.repository.js';

import type {
  AccountStatus,
} from '../domain/enums/account-status.enums.js';

export interface UserSearch {
  q?: string;
  role?: UserRole;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
}

/** Escapes user-provided text used inside a RegExp filter. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class UserRepository extends BaseRepository<UserFields, UserMethods, UserVirtuals> {
  constructor() {
    super(User);
  }

  findByEmail(email: string, options: RepositoryOptions = {}): Promise<UserDocument | null> {
    return this.findOne({ email: email.trim().toLowerCase() }, options);
  }

  /** Admin user list: text match on name/email, optional role, optional deleted. */
  async search(search: UserSearch): Promise<PaginatedResult<UserDocument>> {
    const filter: RepositoryFilter<UserFields> = {};
    const trimmed = search.q?.trim();
    if (trimmed) {
      const pattern = new RegExp(escapeRegex(trimmed), 'i');
      filter.$or = [{ name: pattern }, { email: pattern }];
    }
    if (search.role) {
      filter.role = search.role;
    }

    return this.paginate(
      filter,
      { page: normalizedPage(search.page), limit: normalizedLimit(search.limit) },
      { withDeleted: search.includeDeleted === true },
    );
  }
  
async findForAuthentication(
  email: string,
): Promise<UserDocument | null> {
  const query = User.findOne({
    email: email.trim().toLowerCase(),
  })
    .setOptions({ withDeleted: true })
    .select('+passwordHash');

  return await query.exec();
}
async findByStatus(
  status: AccountStatus,
): Promise<UserDocument[]> {
  return this.find({ status });
}

/**
 * Loads a user by id WITH its password hash (the field is `select: false`)
 * for sensitive checks: password change, credential verification.
 */
async findByIdWithPassword(
  id: string,
  options: RepositoryOptions = {},
): Promise<UserDocument | null> {
  const query = this.model
    .findById(id)
    .session(options.session ?? null)
    .select('+passwordHash');
  if (options.withDeleted) {
    query.setOptions({ withDeleted: true });
  }

  return (await query.exec()) as UserDocument | null;
}

}
