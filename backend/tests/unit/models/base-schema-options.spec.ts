import { describe, expect, it } from 'vitest';
import mongoose, { type Document, type Model } from 'mongoose';

import { baseSchemaOptions } from '../../../src/models/plugins/base-schema-options.js';

let seq = 0;

function makeModel(definition: object): Model<Document> {
  seq += 1;
  const schema = new mongoose.Schema(definition, baseSchemaOptions());
  return mongoose.model<Document>(`BaseSchemaOptionsModel_${seq}`, schema);
}

describe('baseSchemaOptions serialization transform', () => {
  const model = makeModel({
    name: { type: String },
    apiKey: { type: String, select: false },
    publicField: { type: String },
  });

  it('stringifies with id as a real string (no ObjectId roundtrip issue)', () => {
    const doc = new model({ name: 'n', publicField: 'p', apiKey: 'sk_live_secret' });
    const json = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;

    expect(json['id']).toBeDefined();
    expect(typeof json['id']).toBe('string');
    expect((json['id'] as string).length).toBe(24);
  });

  it('removes _id and __v (versionKey disabled in options)', () => {
    const doc = new model({ name: 'n', publicField: 'p', apiKey: 'sk_live_secret' });
    const json = doc.toJSON() as unknown as Record<string, unknown>;

    expect(json['_id']).toBeUndefined();
    expect(json['__v']).toBeUndefined();
    expect(json['name']).toBe('n');
    expect(json['publicField']).toBe('p');
  });

  it('strips secrets even after they were explicitly selected onto the doc', () => {
    const doc = new model({ name: 'n', publicField: 'p', apiKey: 'sk_live_secret' });
    const json2 = doc.toJSON() as unknown as Record<string, unknown>;

    expect(json2['apiKey']).toBeUndefined();
  });
});
// NOTE: timestamp (createdAt/updatedAt) is filled on SAVE in Mongoose 9, not on
// document construction - its ISO-Z serialization contract is covered by the
// integration test tests/integration/base-schema-options.spec.ts.
