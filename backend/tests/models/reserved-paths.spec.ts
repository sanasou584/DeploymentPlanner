import mongoose from 'mongoose';

import { afterAll, describe, expect, it } from 'vitest';

import * as entityIndex from '../../src/models/entities/index.js';

/**
 * Guard against Mongoose reserved schema pathnames. The runtime only WARNS
 * ("`errors` is a reserved schema pathname..."), which is easy to miss in CI
 * logs, so this test FAILS instead. Names come from Mongoose's own reserved
 * map (node_modules/mongoose/lib/schema.js `Schema.reserved`) plus document
 * members the map does not cover.
 */

const EXTRA_RESERVED = new Set([
  '$__',
  '$isDeleted',
  '$session',
  '$locals',
]);

type PathType = mongoose.SchemaType & { schema?: mongoose.Schema; caster?: unknown };
type ModelLike = new () => unknown & { schema?: mongoose.Schema };

function collectSubSchemas(schema: mongoose.Schema, into: Set<mongoose.Schema>): void {
  if (into.has(schema)) {
    return;
  }
  into.add(schema);
  for (const pathType of Object.values(schema.paths)) {
    const asPath = pathType as PathType;
    if (asPath?.schema) {
      collectSubSchemas(asPath.schema, into);
    } else if (asPath?.caster) {
      const caster = asPath.caster as PathType;
      if (caster?.schema) {
        collectSubSchemas(caster.schema, into);
      }
    }
  }
}

function topLevelNames(schema: mongoose.Schema): string[] {
  return Object.keys(schema.paths).map((path) => path.split('.')[0] ?? path);
}

describe('mongoose reserved schema names', () => {
  it('resolves a schema for every entity in the barrel', () => {
    for (const value of Object.values(entityIndex)) {
      if (typeof value !== 'function' || !('schema' in value)) {
        continue;
      }
      expect((value as unknown as ModelLike & { schema: mongoose.Schema }).schema).toBeInstanceOf(mongoose.Schema);
    }
    expect(Object.values(entityIndex).length).toBeGreaterThan(5);
  });

  it('no schema path (top-level or embedded) uses a Mongoose reserved name', () => {
    const reservedMap = (mongoose.Schema as unknown as {
      reserved: Record<string, unknown>;
    }).reserved;
    const reservedNames = new Set<string>([
      ...Object.keys(reservedMap),
      ...EXTRA_RESERVED,
    ]);
    for (const name of ['errors', 'isNew', 'collection', 'save', 'validate', 'emit', 'get', 'init', 'isModified', 'remove', 'toObject', 'populated', 'listeners', 'removeListener', 'prototype']) {
      expect(reservedNames.has(name), `reserved map must include "${name}"`).toBe(true);
    }

    const offending: string[] = [];
    for (const [modelName, value] of Object.entries(entityIndex)) {
      if (typeof value !== 'function' || !('schema' in value)) {
        continue;
      }
      const modelSchema = (value as unknown as { schema: mongoose.Schema }).schema;
      const seen = new Set<mongoose.Schema>();
      collectSubSchemas(modelSchema, seen);
      for (const schema of seen) {
        const label = schema === modelSchema ? modelName : `${modelName} (embedded)`;
        for (const name of topLevelNames(schema)) {
          if (reservedNames.has(name)) {
            offending.push(`${label}: ${name}`);
          }
        }
      }
    }
    expect(offending).toEqual([]);
  });

});

afterAll(async () => {
  await mongoose.disconnect();
});
