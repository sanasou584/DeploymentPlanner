import mongoose from 'mongoose';

import {
  ForbiddenError,
  UnauthorizedError,
} from '../../domain/errors/index.js';

import type {
  UserDocument,
} from '../../models/entities/index.js';

import {
  UserRepository,
} from '../../repositories/user.repository.js';

import {
  AuthIdentityRepository,
} from '../../repositories/auth-identity.repository.js';

import type {
  GithubProfile,
} from '../../types/index.js';

export function createGithubAuthService(
  users: UserRepository = new UserRepository(),
  identities: AuthIdentityRepository =
    new AuthIdentityRepository(),
) {
  async function login(
    profile: GithubProfile,
  ): Promise<UserDocument> {

    // 1. Vérifier si ce compte GitHub est déjà lié
    const identity = await identities.findGithubIdentity(
      profile.githubId,
    );

    if (identity) {
      const user = await users.findById(
        identity.userId,
        { withDeleted: true },
      );

      if (!user) {
        throw new UnauthorizedError(
          'Account not found',
        );
      }

      // Vérifier le statut AVANT de produire un JWT
      user.assertCanAuthenticate();

      await user.recordLogin();

      return user;
    }

    // 2. Same verified email as a local password account: GitHub becomes an
    //    ADDITIONAL sign-in method on that account (GitHub has already
    //    verified the email owner), then the same status gate as password
    //    login applies below.
    const existingUser = await users.findByEmail(
      profile.email,
      { withDeleted: true },
    );

    if (existingUser) {
      await identities.assertNoConflictingGithubIdentity(
        existingUser.id,
        profile.githubId,
      );

      await identities.createGithubIdentity(
        existingUser.id,
        profile.githubId,
      );

      // Vérifier le statut AVANT de produire un JWT
      existingUser.assertCanAuthenticate();

      await existingUser.recordLogin();

      return existingUser;
    }

    // 3. Créer le développeur en attente
    let createdUser: UserDocument | undefined;

    await mongoose.connection.transaction(async (session) => {
      const user = await users.create(
        {
          name: profile.name,
          email: profile.email,
          role: 'DEVELOPER',
          status: 'PENDING',
        },
        { session },
      );

      await identities.createGithubIdentity(
        user._id,
        profile.githubId,
        session,
      );

      createdUser = user;
    });

    if (!createdUser) {
      throw new Error('User creation failed');
    }

    // 4. Ne pas autoriser immédiatement la connexion
    throw new ForbiddenError(
      'Account created. Waiting for administrator approval.',
    );
  }

  return { login };
}

export type GithubAuthService =
  ReturnType<typeof createGithubAuthService>;
