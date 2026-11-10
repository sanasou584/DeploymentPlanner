import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose, { type DefaultSchemaOptions, type Model } from 'mongoose';

import { baseSchemaOptions } from '../../src/models/plugins/base-schema-options.js';
import { connectTestingModule, disconnectTestingModule } from './test-database.js';

interface ThingFields {
  label?: string;
  apiKey?: string;
}

type ThingModel = Model<ThingFields, Record<never, never>, Record<never, never>>;
let Thing: ThingModel;

beforeAll(async () => {
  await connectTestingModule('base_schema_options_test');

  const schema = new mongoose.Schema<ThingFields, ThingModel, Record<never, never>, Record<never, never>, Record<never, never>, Record<never, never>, DefaultSchemaOptions>(
    { label: { type: String }, apiKey: { type: String, select: false } },
    baseSchemaOptions(),
  );
  Thing = mongoose.model<ThingFields, ThingModel, Record<never, never>>('BaseSchemaOptionsThing', schema);
});

afterAll(async () => {
  await disconnectTestingModule();
});

describe('baseSchemaOptions (integration, mongodb-memory-server)', () => {
  it('serializes persisted docs: id string, no _id/__v, timestamps as ISO-Z, no secrets', async () => {
    const created = await Thing.create({ label: 'a', apiKey: 'sk_secret_xyz' });
    const found = (await Thing.findById(created.id)) as Record<string, unknown>;
    const json = JSON.parse(JSON.stringify(found)) as Record<string, unknown>;

    expect(typeof json['id']).toBe('string');
    expect(json['_id']).toBeUndefined();
    expect(json['__v']).toBeUndefined();
    expect(json['apiKey']).toBeUndefined();

    const createdAt = json['createdAt'] as string;
    expect(createdAt.startsWith(new Date().toISOString().slice(0, 10))).toBe(true);
    expect(createdAt.endsWith('Z')).toBe(true);
  });
});
