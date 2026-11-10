import {
  Schema,
  default as mongoose,
  type DefaultSchemaOptions,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

import { InvariantViolationError } from '../../domain/errors/index.js';
import type { EncryptedTokenPayload } from '../../shared/crypto/token-crypto.js';
import { encrypt, decrypt } from '../../shared/crypto/token-crypto.js';
import { baseSchemaOptions } from '../plugins/base-schema-options.js';

/**
 * GithubConnection - one stored OAuth token per user (encrypted with
 * AES-256-GCM via shared/crypto/token-crypto). The encryption key is ALWAYS
 * passed by the caller (never read from the environment inside the model
 * layer). Revoking wipes the ciphertext so the raw token cannot outlive the
 * connection.
 */

export interface GithubConnectionFields {
  user: Types.ObjectId;
  githubLogin: string;
  accessToken: EncryptedTokenPayload;
  scopes: string[];
  connectedAt: Date;
  revokedAt?: Date | null;
}

export interface GithubConnectionStatics {
  connect(
    key: Uint8Array,
    input: { userId: Types.ObjectId; login: string; token: string; scopes?: string[] },
  ): Promise<GithubConnectionDocument>;
}

export interface GithubConnectionMethods {
  getAccessToken(key: Uint8Array): string;
  rotateToken(key: Uint8Array, token: string): Promise<GithubConnectionDocument>;
  revoke(): Promise<GithubConnectionDocument>;
}

export type GithubConnectionDocument = HydratedDocument<
  GithubConnectionFields,
  GithubConnectionMethods & GithubConnectionVirtuals
>;

export type GithubConnectionBaseModel = Model<GithubConnectionFields, object, GithubConnectionMethods>;
export type GithubConnectionModel = GithubConnectionBaseModel & GithubConnectionStatics;

export type GithubConnectionVirtuals = { isActive: boolean };

const accessTokenSchema = new Schema<EncryptedTokenPayload>(
  {
    keyVersion: { type: Number, required: true, min: 1, default: 1 },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    cipherText: { type: String, required: true },
  },
  { _id: false },
);

const githubConnectionSchema = new Schema<
  GithubConnectionFields,
  GithubConnectionBaseModel,
  GithubConnectionMethods,
  Record<string, never>,
  GithubConnectionVirtuals,
  GithubConnectionStatics,
  DefaultSchemaOptions
>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
    githubLogin: { type: String, required: true, trim: true, minlength: 1 },
    accessToken: { type: accessTokenSchema, select: false },
    scopes: { type: [String], default: [] },
    connectedAt: { type: Date, required: true, default: () => new Date() },
    revokedAt: { type: Date, default: null },
  },
  baseSchemaOptions(),
);

const requireActiveToken = function requireActiveToken(this: GithubConnectionDocument): void {
  if (this.get('revokedAt') != null) {
    throw new InvariantViolationError('Connection is revoked');
  }
  if (this.get('accessToken') === undefined) {
    throw new InvariantViolationError(
      'accessToken is not loaded - fetch with .select("+accessToken")',
    );
  }
};

// lifecycle invariant: an active connection ALWAYS carries an encrypted token;
// a revoked one NEVER does (the ciphertext is wiped on revoke).
githubConnectionSchema.pre('validate', function assertTokenLifecycle(
  this: GithubConnectionDocument & { invalidate(path: string, msg: string, kind: string, type: string): void },
): void {
  const active = this.get('revokedAt') == null;
  const hasToken = this.get('accessToken') !== undefined && this.get('accessToken') !== null;

  if (active && !hasToken) {
    this.invalidate('accessToken', 'An active connection must carry an encrypted token', '', 'required');
  }
  if (!active && hasToken) {
    this.invalidate('accessToken', 'A revoked connection must not carry a token', '', 'user defined');
  }
});

githubConnectionSchema.statics.connect = async function connect(
  this: GithubConnectionBaseModel,
  key: Uint8Array,
  input: { userId: Types.ObjectId; login: string; token: string; scopes?: string[] },
): Promise<GithubConnectionDocument> {
  const created = new this({
    user: input.userId,
    githubLogin: input.login,
    accessToken: encrypt(key, input.token),
    scopes: input.scopes ?? [],
  });

  return created.save() as unknown as Promise<GithubConnectionDocument>;
};

githubConnectionSchema.methods.getAccessToken = function getAccessToken(
  this: GithubConnectionDocument,
  key: Uint8Array,
): string {
  requireActiveToken.call(this);

  return decrypt(key, this.get('accessToken') as EncryptedTokenPayload);
};

githubConnectionSchema.methods.rotateToken = async function rotateToken(
  this: GithubConnectionDocument,
  key: Uint8Array,
  token: string,
): Promise<GithubConnectionDocument> {
  requireActiveToken.call(this);
  this.set('accessToken', encrypt(key, token));

  return this.save() as unknown as Promise<GithubConnectionDocument>;
};

githubConnectionSchema.methods.revoke = async function revoke(
  this: GithubConnectionDocument,
): Promise<GithubConnectionDocument> {
  if (this.get('revokedAt') != null) {
    throw new InvariantViolationError('Connection is already revoked');
  }
  this.set('revokedAt', new Date());
  this.set('accessToken', undefined); // wipe the ciphertext

  return this.save() as unknown as Promise<GithubConnectionDocument>;
};

githubConnectionSchema.virtual('isActive').get(function isActiveVirtual(
  this: GithubConnectionDocument,
): boolean {
  return this.get('revokedAt') == null;
});

export const GITHUB_CONNECTION_MODEL_NAME = 'GithubConnection' as const;
export const GithubConnection = mongoose.model(GITHUB_CONNECTION_MODEL_NAME, githubConnectionSchema);
