
import type { ClientSession, Types } from 'mongoose';

import { ConflictError } from '../domain/errors/index.js';

import {
  AuthIdentity,
} from '../models/entities/index.js';

export class AuthIdentityRepository {
  async findGithubIdentity(githubId: string) {
    return AuthIdentity.findOne({
      provider: 'github',
      providerUserId: githubId,
    }).exec();
  }

  /** The GitHub identity an account already owns, whatever the GitHub id. */
  async findUserGithubIdentity(userId: Types.ObjectId | string) {
    return AuthIdentity.findOne({
      provider: 'github',
      userId,
    }).exec();
  }

  async createGithubIdentity(
    userId: Types.ObjectId | string,
    githubId: string,
    session?: ClientSession,
  ) {
    const [identity] = await AuthIdentity.create(
      [{
        userId,
        provider: 'github',
        providerUserId: githubId,
      }],
      session ? { session } : undefined,
    );

    if (!identity) {
      throw new Error('Identity creation failed');
    }

    return identity;
  }

  /**
   * Rejects re-linking a DIFFERENT GitHub account to an account that already
   * owns one. Called by the service before the (safe) insert.
   */
  async assertNoConflictingGithubIdentity(
    userId: Types.ObjectId | string,
    githubId: string,
  ): Promise<void> {
    const owned = await this.findUserGithubIdentity(userId);

    if (owned && owned.providerUserId !== githubId) {
      throw new ConflictError(
        'A different GitHub account is already linked to this email.',
      );
    }
  }
}
