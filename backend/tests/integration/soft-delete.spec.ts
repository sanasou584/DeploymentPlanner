import { afterAll, beforeEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose, { type DefaultSchemaOptions, type HydratedDocument, type Model } from 'mongoose';

import { baseSchemaOptions } from '../../src/models/plugins/base-schema-options.js';
import {
  softDeletePlugin,
  type SoftDeletableMethods,
  type WithDeletedQueryOptions,
} from '../../src/models/plugins/soft-delete.js';
import { InvalidStateTransitionError } from '../../src/domain/errors/index.js';
import { connectTestingModule, disconnectTestingModule } from './test-database.js';

interface TaskFields {
  title: string;
  deletedAt: Date | null;
}

type TaskVirtuals = { isDeleted: boolean };
type TaskMethods = SoftDeletableMethods;
type TaskDoc = HydratedDocument<TaskFields, TaskMethods & TaskVirtuals>;
type TaskModel = Model<TaskFields, object, TaskMethods, TaskVirtuals, TaskDoc>;

let Task: TaskModel;


beforeAll(async () => {
  await connectTestingModule('soft_delete_test');

  const schema = new mongoose.Schema<
    TaskFields,
    TaskModel,
    TaskMethods,
    TaskVirtuals,
    TaskVirtuals,
    Record<never, never>,
    DefaultSchemaOptions
  >(
    { title: { type: String, required: true } },
    baseSchemaOptions(),
  );
  schema.plugin(softDeletePlugin);
  Task = mongoose.model<TaskFields, TaskModel, Record<never, never>>('SoftDeleteTask', schema);
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  // Purge EVERYTHING (active + deleted) between tests for a clean slate.
  await Task.deleteMany({}).setOptions({ withDeleted: true } satisfies WithDeletedQueryOptions);
});

async function newTask(title: string): Promise<TaskDoc> {
  return (await Task.create({ title })) as unknown as TaskDoc;
}

describe('softDeletePlugin (integration, mongodb-memory-server)', () => {
  it('starts with deletedAt=null and isDeleted=false', async () => {
    const doc = await newTask('fresh');

    expect(doc.deletedAt).toBeNull();
    expect(doc.isDeleted).toBe(false);
  });

  it('softDelete() persists deletedAt and flips the virtual', async () => {
    const doc = await newTask('to-delete');
    const after = (await doc.softDelete()) as unknown as TaskDoc;

    expect(after.deletedAt).not.toBeNull();
    expect(after.isDeleted).toBe(true);
    expect((await Task.findById(doc.get('_id') as unknown as string))?.get('deletedAt')).not.toBeNull();
  });

  it('softDelete() twice throws InvalidStateTransitionError', async () => {
    const doc = await newTask('already-deleted');
    await doc.softDelete();

    await expect(doc.softDelete()).rejects.toThrowError(InvalidStateTransitionError);
    await expect(doc.softDelete()).rejects.toThrowError(/Invalid state transition/);
  });

  it('restore() un-deletes and restore() on an active doc throws', async () => {
    const doc = await newTask('restore-me');
    const deleted = (await doc.softDelete()) as unknown as TaskDoc;
    const restored = (await deleted.restore()) as unknown as TaskDoc;

    expect(restored.deletedAt).toBeNull();
    expect(restored.isDeleted).toBe(false);
    await expect(restored.restore()).rejects.toThrowError(InvalidStateTransitionError);
    await expect(restored.restore()).rejects.toThrowError(/Invalid state transition/);
  });

  it('default find() excludes soft deleted docs (but keeps actives)', async () => {
    await newTask('mixed-active');
    const toDelete = await newTask('mixed-deleted');
    await toDelete.softDelete();

    const visible = (await Task.find({})) as unknown as TaskDoc[];
    const all = (await Task.find({}).setOptions({ withDeleted: true } satisfies WithDeletedQueryOptions)) as unknown as TaskDoc[];

    expect(visible.map((d) => d.get('title'))).toEqual(['mixed-active']);
    expect(all.map((d) => d.get('title')).sort()).toEqual(['mixed-active', 'mixed-deleted']);
  });

  it('default findOne() excludes deleted docs; withDeleted opts in', async () => {
    const doc = await newTask('one-and-done');
    await doc.softDelete();
    await newTask('stays');

    expect(await findByTitle('one-and-done')).toBeNull();
    expect((await findByTitle('one-and-done', true))?.isDeleted).toBe(true);
    expect((await findByTitle('stays'))?.get('title')).toBe('stays');
  });

  it('countDocuments excludes deleted docs by default', async () => {
    await newTask('count-a');
    const doc = await newTask('count-b');
    await doc.softDelete();

    expect(await Task.countDocuments({})).toBe(1);
    expect(await Task.countDocuments({}).setOptions({ withDeleted: true } satisfies WithDeletedQueryOptions)).toBe(2);
  });

  it('Model.exists() respects the default filter because it runs findOne', async () => {
    const doc = await newTask('exists-target');
    await doc.softDelete();

    expect(await Task.exists({ _id: doc.get('_id') as unknown as string })).toBeNull();
    expect(await Task.exists({ _id: doc.get('_id') as unknown as string }).setOptions({ withDeleted: true } satisfies WithDeletedQueryOptions)).not.toBeNull();
  });

  it('aggregate excludes deleted unless opted in via option', async () => {
    await newTask('agg-active');
    const doc = await newTask('agg-deleted');
    await doc.softDelete();

    const withoutOptIn = await Task.aggregate([{ $match: {} }]);
    const withOptIn = await Task.aggregate([{ $match: {} }]).option({ withDeleted: true } satisfies WithDeletedQueryOptions);

    expect(withoutOptIn).toHaveLength(1);
    expect(withOptIn).toHaveLength(2);
  });

  it('updateMany targets only active docs unless withDeleted', async () => {
    await newTask('upd-a');
    const deleted = await newTask('upd-b');
    await deleted.softDelete();

    const strict = await Task.updateMany({}, { $set: { title: 'updated-strict' } });
    expect(strict.modifiedCount).toBe(1);

    const full = await Task.updateMany({}, { $set: { title: 'updated-all' } }).setOptions({ withDeleted: true } satisfies WithDeletedQueryOptions);
    expect(full.modifiedCount).toBe(2);
  });

  it('findOneAndUpdate skips deleted docs by default', async () => {
    const doc = await newTask('fau-target');
    await doc.softDelete();

    const res = await Task.findOneAndUpdate({ _id: doc.get('_id') as unknown as string }, { $set: { title: 'should-not-apply' } });
    expect(res).toBeNull();

    expect(await Task.findById(doc.get('_id') as unknown as string)).toBeNull(); // excluded by default
    const revived = (await Task.findById(doc.get('_id') as unknown as string).setOptions({ withDeleted: true } satisfies WithDeletedQueryOptions)) as unknown as TaskDoc | null;
    expect(revived?.get('title')).toBe('fau-target');
  });
});

const findByTitle = async (title: string, withDeleted = false): Promise<TaskDoc | null> => {
  const query = Task.find({ title }).sort({ createdAt: 1 });
  if (withDeleted) {
    query.setOptions({ withDeleted: true } satisfies WithDeletedQueryOptions);
  }
  const docs = await query.exec();
  return (docs[0] ?? null) as unknown as TaskDoc | null;
};
