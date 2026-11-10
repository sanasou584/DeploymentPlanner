import { ConflictError, UnauthorizedError } from '../../domain/errors/index.js';
import { User } from '../../models/entities/index.js';
import type { UserDocument } from '../../models/entities/index.js';
import { UserRepository } from '../../repositories/user.repository.js';
import type { RegisterInput } from './register.schema.js';
import type { LoginInput } from './login.schema.js';
import type { AuthUser } from '../../types/index.js';

function toAuthUser(user: UserDocument): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

/**
 * Functional service factory (see docs/conventions.md, "Services").
 * Plain closures - never classes. Dependencies arrive as parameters and
 * default-wire themselves, so:
 *   - routes/index.ts calls createAuthService(new UserRepository()) (explicit),
 *   - tests call createAuthService() or inject a fake.
 */
export function createAuthService(
  users: UserRepository = new UserRepository(),
) {
  async function register(input: RegisterInput): Promise<AuthUser> {
    const existing = await users.findByEmail(
      input.email,
      { withDeleted: true },
    );

    if (existing) {
      throw new ConflictError('Email already registered');
    }

    try {
      const user = await User.register({
        name: input.name,
        email: input.email,
        password: input.password,
      });

      return toAuthUser(user);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new ConflictError('Email already registered');
      }

      throw error;
    }
  }

  async function login(input: LoginInput): Promise<AuthUser> {
    const user = await users.findForAuthentication(input.email);

    if (!user) {
      throw new UnauthorizedError(
        'Invalid email or password',
      );
    }
    user.assertCanAuthenticate();
    const isValid = await user.verifyPassword(input.password);

    if (!isValid) {
      throw new UnauthorizedError(
        'Invalid email or password',
      );
    }

    await user.recordLogin();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  return { register, login };
}

/**
 * Service contract, derived at its SOURCE — never redeclared elsewhere.
 */
export type AuthService = ReturnType<typeof createAuthService>;
