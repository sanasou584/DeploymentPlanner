import { expect } from 'vitest';
import mongoose, { type Document, type Model } from 'mongoose';

import { resourceSpecSchema } from '../../../src/models/value-objects/resource-spec.schema.js';
import { hpaSpecSchema } from '../../../src/models/value-objects/hpa-spec.schema.js';
import { ingressSpecSchema } from '../../../src/models/value-objects/ingress-spec.schema.js';
import { repositoryRefSchema } from '../../../src/models/value-objects/repository-ref.schema.js';
import { errorInfoSchema } from '../../../src/models/value-objects/error-info.schema.js';
import type { InvariantViolationError } from '../../../src/domain/errors/index.js';

/**
 * Offline root schema that embeds every value object subschema; value-object
 * tests run `validate()` (Mongoose 9's replacement of the deprecated
 * the deprecated sync variant) against documents built here - no database needed.
 */

let cached: Model<Document> | undefined;

export type VoRootDoc = (Document & Record<string, unknown>) & {
  validate(): Promise<undefined>;
};

export function buildVoRootModel(): Model<Document> {
  cached ??= mongoose.model<Document>(
    'VoRoot',
    new mongoose.Schema(
      {
        resources: resourceSpecSchema,
        hpa: hpaSpecSchema,
        ingress: ingressSpecSchema,
        repo: repositoryRefSchema,
        failure: errorInfoSchema,
      } as mongoose.SchemaDefinition,
      { timestamps: false, versionKey: false },
    ),
  );
  return cached;
}

export function newVoDoc(model: Model<Document>, patch: Record<string, unknown>): VoRootDoc {
  return new model(patch) as unknown as VoRootDoc;
}

/**
 * Mongoose 9 wraps errors thrown in `pre('validate')` hooks into a
 * ValidationError; the ORIGINAL thrown instance is preserved per path, so the
 * InvariantViolationError stays observable with its code/message intact. The
 * central error handler maps ValidationError on paths to VALIDATION_ERROR 400
 * and directly-thrown InvariantViolationError (behavior methods) to 422.
 */
export async function expectInvariantOnPath(
  doc: VoRootDoc,
  path: string,
): Promise<InvariantViolationError> {
  let rejection: { errors?: Record<string, unknown> } | undefined;

  try {
    await doc.validate();
  } catch (e: unknown) {
    rejection = e as { errors?: Record<string, unknown> };
  }

  expect(rejection?.errors).toBeDefined();
  const wrapped = (rejection?.errors ?? {}) as Record<string, unknown>;
  const error = wrapped[path];
  expect(error).toBeDefined();
  return error as InvariantViolationError;
}

/**
 * Runs validate() and captures a rejected ValidationError structurally
 * (name + per-path error messages) so tests can assert per-path messages
 * without fighting Mongoose typings.
 */
export async function validateCaptured(doc: VoRootDoc): Promise<
  | {
      name?: string;
      errors?: Record<string, { message?: string }>;
    }
  | undefined
> {
  return await (async () => {
    try {
      await doc.validate();
      return undefined;
    } catch (e: unknown) {
      return e as { name?: string; errors?: Record<string, { message?: string }> };
    }
  })();
}
