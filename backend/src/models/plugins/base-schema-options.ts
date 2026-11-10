import type { Document, Schema } from 'mongoose';

/**
 * Shared schema options for every ROOT model:
 * - timestamps: true (UTC tracked by the driver; serialized as ISO strings)
 * - `id` exposed as string, `_id`/`__v` removed from JSON/plain objects
 * - every `select: false` field declared on the schema is stripped from
 *   serialization output (secrets can never leak through toJSON)
 * - `deletedAt` (soft delete) is stripped too; consumers use the `isDeleted` virtual
 *
 * Usage (root models ONLY - embedded subschemas define their own options):
 *   const userSchema = new Schema({...}, baseSchemaOptions());
 *
 * Mongoose hands the transform the document; the document exposes its schema
 * at runtime (`doc.schema`), which is how select flags are inspected.
 */

interface SchemaExposingDoc {
  readonly schema?: Schema;
}

const HIDDEN_ROOT_KEYS = new Set(['_id', '__v', 'deletedAt']);

function stripHiddenPaths(ret: Record<string, unknown>, schema: Schema): void {
  for (const key of Object.keys(ret)) {
    const schemaType = schema.path(key);
    if (schemaType && schemaType.options.select === false) {
      delete ret[key];
    }
  }
}

function serializeTransform(doc: Document, ret: Record<string, unknown>): Record<string, unknown> {
  if (ret.id === undefined && ret._id !== undefined) {
    ret.id = String(ret._id);
  }

  for (const key of HIDDEN_ROOT_KEYS) {
    delete ret[key];
  }

  const schema = (doc as unknown as SchemaExposingDoc).schema;
  if (schema) {
    stripHiddenPaths(ret, schema);
  }

  return ret;
}

export function baseSchemaOptions(): {
  timestamps: true;
  versionKey: false;
  strictQuery: 'throw';
  toJSON: {
    virtuals: true;
    transform: (doc: Document, ret: Record<string, unknown>) => Record<string, unknown>;
  };
  toObject: {
    virtuals: true;
    transform: (doc: Document, ret: Record<string, unknown>) => Record<string, unknown>;
  };
} {
  return {
    timestamps: true,
    versionKey: false,
    strictQuery: 'throw',
    toJSON: { virtuals: true, transform: serializeTransform },
    toObject: { virtuals: true, transform: serializeTransform },
  };
}
