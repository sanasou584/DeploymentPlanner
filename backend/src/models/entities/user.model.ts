import {
  Schema,
  default as mongoose,
  type DefaultSchemaOptions,
  type HydratedDocument,
  type Model,
} from 'mongoose';

import { USER_ROLES, type UserRole } from '../../domain/enums/user.enums.js';
import { AccountDisabledError, InvariantViolationError } from '../../domain/errors/index.js';
import { baseSchemaOptions } from '../plugins/base-schema-options.js';
import { softDeletePlugin, type SoftDeletableMethods } from '../plugins/soft-delete.js';
import { argon2PasswordHasher } from '../../shared/security/password-hasher.js';

import {
  ACCOUNT_STATUSES,
  type AccountStatus,
} from '../../domain/enums/account-status.enums.js';

import {
  accountApprovalMachine,
} from '../../domain/state-machine/account-approval.machine.js';

import {
  ForbiddenError,
} from '../../domain/errors/index.js';

/**
 * User - a platform account. Soft-deleted means "deactivated": the document
 * stays in the collection (its email remains reserved, per the unique index).
 */

export interface UserFields {
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  status: AccountStatus;
  lastLoginAt?: Date | null;
  avatarUrl?: string | null;
}

export interface UserStatics {
  register(input: { name: string; email: string; password: string; role?: UserRole }): Promise<UserDocument>;
}

export interface UserMethods extends SoftDeletableMethods {
  setPassword(plain: string): Promise<UserDocument>;
  verifyPassword(plain: string): Promise<boolean>;
  recordLogin(): Promise<UserDocument>;
  updateProfile(patch: { name?: string; avatarUrl?: string | null }): Promise<UserDocument>;
  changeRole(newRole: UserRole): Promise<UserDocument>;
  deactivate(): Promise<UserDocument>;
  reactivate(): Promise<UserDocument>;
  isAdmin(): boolean;
  assertCanAuthenticate(): void;
  hasLocalPassword(): boolean;
  approve(): Promise<UserDocument>;
  reject(): Promise<UserDocument>;
}

export type UserVirtuals = { isActive: boolean; isDeleted: boolean };

export type UserDocument = HydratedDocument<UserFields, UserMethods & UserVirtuals>;

export type UserBaseModel = Model<UserFields, object, UserMethods>;
export type UserModel = UserBaseModel & UserStatics;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MIN = 2;
const NAME_MAX = 100;
const PASSWORD_MIN = 8;
const AVATAR_URL_MAX = 2048;

const userSchema = new Schema<
  UserFields,
  UserBaseModel,
  UserMethods,
  Record<string, never>,
  UserVirtuals,
  UserStatics,
  DefaultSchemaOptions
>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: NAME_MIN,
      maxlength: NAME_MAX,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      validate: {
        validator: (value: string): boolean => EMAIL.test(value),
        message: (p: { value: string }) => `Invalid email: "${p.value}"`,
      },
    },
    passwordHash: { type: String, required: false, select: false },
    role: { type: String, required: true, enum: USER_ROLES, default: 'DEVELOPER' },
    lastLoginAt: { type: Date, default: null },
    avatarUrl: { type: String, required: false, trim: true, maxlength: AVATAR_URL_MAX, default: null },
    status: {
    type: String,
    enum: ACCOUNT_STATUSES,
    required: true,
    default: 'PENDING',
    },
  },
  baseSchemaOptions(),
);

userSchema.plugin(softDeletePlugin);

const assertPasswordMin = (plain: string): void => {
  if (plain.length < PASSWORD_MIN) {
    throw new InvariantViolationError(`Password must be at least ${PASSWORD_MIN} characters`);
  }
}

userSchema.statics.register = async function register(
  this: UserBaseModel,
  input: { name: string; email: string; password: string; role?: UserRole },
): Promise<UserDocument> {
  assertPasswordMin(input.password);
  const passwordHash = await argon2PasswordHasher.hash(input.password);
  const created = new this({
    name: input.name,
    email: input.email,
    passwordHash,
    ...(input.role !== undefined ? { role: input.role } : {}),
  });

  return created.save() as unknown as Promise<UserDocument>;
};

userSchema.methods.setPassword = async function setPassword(
  this: UserDocument,
  plain: string,
): Promise<UserDocument> {
  assertPasswordMin(plain);
  this.set('passwordHash', await argon2PasswordHasher.hash(plain));

  return this.save() as unknown as Promise<UserDocument>;
};


userSchema.methods.verifyPassword = async function verifyPassword(
  this: UserDocument,
  plain: string,
): Promise<boolean> {

  // Vérifier que le champ a été chargé depuis MongoDB
  if (!this.isSelected('passwordHash')) {
    throw new InvariantViolationError(
      'passwordHash is not loaded - fetch with .select("+passwordHash")',
    );
  }

  const passwordHash = this.get('passwordHash') as
    | string
    | undefined;

  // Un utilisateur GitHub peut ne pas avoir de mot de passe
  if (!passwordHash) {
    return false;
  }

  // Vérifier le mot de passe local avec Argon2
  return argon2PasswordHasher.verify(
    plain,
    passwordHash,
  );
};


userSchema.methods.recordLogin = async function recordLogin(
  this: UserDocument,
): Promise<UserDocument> {
  this.set('lastLoginAt', new Date());

  return this.save() as unknown as Promise<UserDocument>;
};

userSchema.methods.updateProfile = async function updateProfile(
  this: UserDocument,
  patch: { name?: string; avatarUrl?: string | null },
): Promise<UserDocument> {
  if (patch.name !== undefined) {
    this.set('name', patch.name.trim());
  }
  if (patch.avatarUrl !== undefined) {
    this.set('avatarUrl', patch.avatarUrl);
  }
  return this.save() as unknown as Promise<UserDocument>;
};

userSchema.methods.changeRole = async function changeRole(
  this: UserDocument,
  newRole: UserRole,
): Promise<UserDocument> {
  this.set('role', newRole);

  return this.save() as unknown as Promise<UserDocument>;
};


userSchema.methods.deactivate =
  async function deactivate(
    this: UserDocument,
  ): Promise<UserDocument> {
    accountApprovalMachine.assertTransition(
      this.status,
      'DISABLED',
    );

    // Ne pas utiliser softDelete ici :
    // le statut DISABLED devient la source de vérité.
    this.set('status', 'DISABLED');

    return this.save() as unknown as Promise<UserDocument>;
  };

userSchema.methods.reactivate =
  async function reactivate(
    this: UserDocument,
  ): Promise<UserDocument> {
    accountApprovalMachine.assertTransition(
      this.status,
      'ACTIVE',
    );

    this.set('status', 'ACTIVE');

    return this.save() as unknown as Promise<UserDocument>;
  };


userSchema.methods.isAdmin = function isAdmin(this: UserDocument): boolean {
  return this.get('role') === 'ADMIN';
};


userSchema.methods.assertCanAuthenticate =
  function assertCanAuthenticate(
    this: UserDocument,
  ): void {
    if (this.get('deletedAt') != null) {
      throw new AccountDisabledError(
        'Account is deactivated',
      );
    }

    if (this.status !== 'ACTIVE') {
      throw new ForbiddenError(
        'Account is not approved or is disabled',
      );
    }
  };


userSchema.methods.hasLocalPassword = function hasLocalPassword(
  this: UserDocument,
): boolean {

  if (!this.isSelected('passwordHash')) {
    throw new InvariantViolationError(
      'passwordHash is not loaded',
    );
  }

  const passwordHash = this.get('passwordHash') as
    | string
    | undefined;

  return (
    typeof passwordHash === 'string' &&
    passwordHash.length > 0
  );
};

userSchema.virtual('isActive').get(function isActiveVirtual(this: UserDocument): boolean {
  return this.get('deletedAt') == null;
});


userSchema.methods.approve = async function approve(
  this: UserDocument,
): Promise<UserDocument> {
  accountApprovalMachine.assertTransition(
    this.status,
    'ACTIVE',
  );

  this.set('status', 'ACTIVE');

  return this.save() as unknown as Promise<UserDocument>;
};

userSchema.methods.reject = async function reject(
  this: UserDocument,
): Promise<UserDocument> {
  accountApprovalMachine.assertTransition(
    this.status,
    'REJECTED',
  );

  this.set('status', 'REJECTED');

  return this.save() as unknown as Promise<UserDocument>;
};


export const USER_MODEL_NAME = 'User' as const;
export const User = mongoose.model(USER_MODEL_NAME, userSchema);
