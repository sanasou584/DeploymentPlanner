import type { Aggregate, ClientSession, HydratedDocument, Schema } from 'mongoose';

import { InvalidStateTransitionError } from '../../domain/errors/index.js';

/**
 * softDeletePlugin
 * - adds `deletedAt?: Date` (stripped from JSON by baseSchemaOptions)
 * - instance methods softDelete()/restore() - each throws
 *   InvalidStateTransitionError when already in that state
 * - virtual `isDeleted`
 * - QUERY MIDDLEWARE: find/findOne/countDocuments/findOneAndDelete/
 *   findOneAndReplace/findOneAndUpdate exclude deleted documents by default.
 *   Opt in with:
 *     Model.find().setOptions({ withDeleted: true })
 *   (Model.exists() goes through findOne, so it is covered too)
 * - UPDATE/DELETE QUERIES (updateOne/updateMany/deleteMany as Model.* calls)
 *   also skip deleted docs unless opted in
 * - AGGREGATES: deleted docs filtered out unless Model.aggregate()
 *     .option({ withDeleted: true })
 */

export interface WithDeletedQueryOptions {
  withDeleted?: boolean;
}

export type SoftDeletableDocument = HydratedDocument<{ deletedAt?: Date }>;

interface Saver {
  save(options?: { session?: ClientSession }): Promise<SoftDeletableDocument>;
}

export interface SoftDeletableMethods {
  softDelete(session?: ClientSession): Promise<SoftDeletableDocument>;
  restore(session?: ClientSession): Promise<SoftDeletableDocument>;
}

const DELETED_AT = 'deletedAt';

export function softDeletePlugin(schema: Schema): void {
  schema.add({ deletedAt: { type: Date, default: null } });

  schema.virtual('isDeleted').get(function isDeletedVirtual(
    this: HydratedDocument<{ deletedAt?: Date }>,
  ): boolean {
    return this.get(DELETED_AT) != null;
  });

  schema.methods.softDelete = async function softDelete(
    this: SoftDeletableDocument & Saver,
    session?: ClientSession,
  ): Promise<SoftDeletableDocument> {
    if (this.get(DELETED_AT) != null) {
      throw new InvalidStateTransitionError('active', 'deleted', 'Already soft deleted');
    }
    this.set(DELETED_AT, new Date());
    return this.save(session ? { session } : undefined);
  };

  schema.methods.restore = async function restore(
    this: SoftDeletableDocument & Saver,
    session?: ClientSession,
  ): Promise<SoftDeletableDocument> {
    if (this.get(DELETED_AT) == null) {
      throw new InvalidStateTransitionError('deleted', 'active', 'Document is not soft deleted');
    }
    this.set(DELETED_AT, null);
    return this.save(session ? { session } : undefined);
  };

  const notDeleted = { [DELETED_AT]: null };

  const guardRead = function excludeDeletedRead(this: {
    getOptions(): WithDeletedQueryOptions;
    merge(source: object): void;
  }): void {
    if (!this.getOptions().withDeleted) {
      this.merge(notDeleted);
    }
  };

  for (const hook of [
    'find',
    'findOne',
    'countDocuments',
    'findOneAndDelete',
    'findOneAndReplace',
    'findOneAndUpdate',
  ] as const) {
    schema.pre(hook, guardRead);
  }

  const guardUpdate = function excludeDeletedUpdate(this: {
    getOptions(): WithDeletedQueryOptions;
    merge(source: object): void;
  }): void {
    if (!this.getOptions().withDeleted) {
      this.merge(notDeleted);
    }
  };

  for (const hook of ['updateMany', 'updateOne', 'deleteMany'] as const) {
    schema.pre(hook, guardUpdate);
  }

  schema.pre<Aggregate<unknown>>(
    'aggregate',
    function excludeDeletedAggregate(this: Aggregate<unknown>): void {
      const options = this.options as WithDeletedQueryOptions;
      if (!options.withDeleted) {
        this.pipeline().unshift({ $match: notDeleted });
      }
    },
  );
}
