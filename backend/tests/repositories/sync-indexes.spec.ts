import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { runSyncIndexes as RunSyncIndexes } from '../../src/scripts/sync-indexes.js';

/**
 * Exercises runSyncIndexes in-process against mongodb-memory-server:
 *
 * 1. With NODE_ENV=development a dry run must be read-only — no collection and
 *    no index may be created. This is the regression test for the bug where a
 *    dev run auto-built every declared index on connect (Mongoose reads
 *    autoIndex at Model.init() from schema.options → conn.config →
 *    base.options) and raced/half-applied the dry-run diff. The script now
 *    sets `mongoose.set('autoIndex', false)` BEFORE registering models (the
 *    barrel is dynamic-imported inside runSyncIndexes) and connects with
 *    { autoIndex: false }.
 * 2. --apply must create the declared indexes and a following dry run must
 *    report an EMPTY diff.
 * 3. An unreachable database surfaces failures instead of throwing.
 *
 * NODE_ENV is flipped BEFORE the dynamic import of the script so the env
 * module (which locks its parsed snapshot on first getEnv()) parses
 * NODE_ENV=development, matching the bug report.
 */

let memoryServer: MongoMemoryServer;
let runSyncIndexes: typeof RunSyncIndexes;

interface LogRecord {
  entry: Record<string, unknown>;
  msg: string;
}

class Recorder {
  infologs: LogRecord[] = [];
  errorlogs: LogRecord[] = [];

  info(entry: Record<string, unknown>, msg: string): void {
    this.infologs.push({ entry, msg });
  }

  error(entry: Record<string, unknown>, msg: string): void {
    this.errorlogs.push({ entry, msg });
  }
}

beforeAll(async () => {
  memoryServer = await MongoMemoryServer.create();
  process.env.NODE_ENV = 'development';
  const module = await import('../../src/scripts/sync-indexes.js');
  runSyncIndexes = module.runSyncIndexes;
});

afterAll(async () => {
  process.env.NODE_ENV = 'test';
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await memoryServer.stop();
});

async function countCollections(uri: string): Promise<Array<{ name: string }>> {
  const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 10_000 }).asPromise();
  if (!conn.db) throw new Error('probe connection has no db');
  const names: Array<{ name: string }> = [];
  const cursor = conn.db.listCollections();
  let result = await cursor.next();
  while (result) {
    names.push({ name: result.name });
    result = await cursor.next();
    if (names.length > 50) break;
  }
  await conn.close(true);
  return names;
}

async function connectTo(uri: string): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  }
}

describe('runSyncIndexes', () => {
  it('dry run with NODE_ENV=development writes NOTHING (no collections, no indexes)', async () => {
    const uri = memoryServer.getUri('sync_dev_dry');
    const probe = new Recorder();
    const before = await countCollections(uri);
    const result = await runSyncIndexes({ apply: false, uri }, { logger: probe });
    expect(result.failures).toEqual([]);
    const after = await countCollections(uri);

    expect(before).toEqual([]);
    const afterNames = after.map((c) => c.name);
    expect(afterNames, `before=${JSON.stringify(before)} dryRunLogs=${JSON.stringify(probe.errorlogs)}`).toEqual([]);
    await mongoose.disconnect();
  });

  it('dev apply creates the declared indexes; the following dry run diff is EMPTY', async () => {
    const uri = memoryServer.getUri('sync_dev_apply');

    const applyResult = await runSyncIndexes({ apply: true, uri }, { logger: recorderUnnamed() });
    expect(applyResult.failures).toEqual([]);

    await connectTo(uri);
    if (!mongoose.connection.db) throw new Error('connection has no db');
    const [users, projects, plans, auditLogs, generatedFiles] = await Promise.all([
      mongoose.connection.db.collection('users').indexes(),
      mongoose.connection.db.collection('projects').indexes(),
      mongoose.connection.db.collection('deploymentplans').indexes(),
      mongoose.connection.db.collection('auditlogs').indexes(),
      mongoose.connection.db.collection('generatedfiles').indexes(),
    ]);

    const emailUnique = users.find((index) => index.name === 'email_1');
    expect(emailUnique?.unique).toBe(true);

    const ownerName = projects.find((index) => JSON.stringify(index.key) === '{"owner":1,"name":1}');
    expect(ownerName?.unique).toBe(true);
    expect(JSON.stringify(ownerName?.partialFilterExpression)).toContain('"deletedAt":null');

    const planVersion = plans.find((index) => JSON.stringify(index.key) === '{"project":1,"version":1}');
    expect(planVersion?.unique).toBe(true);

    const auditEntityTime = auditLogs.find((index) =>
      index.name === 'entity.type_1_entity.id_1_createdAt_-1',
    );
    expect(auditEntityTime).toBeDefined();
    const auditActor = auditLogs.find((index) => index.name === 'actor_1_createdAt_-1');
    expect(auditActor).toBeDefined();
    const auditLevel = auditLogs.find((index) => index.name === 'level_1_createdAt_-1');
    expect(auditLevel).toBeDefined();

    const generatedKind = generatedFiles.find((index) =>
      JSON.stringify(index.key).startsWith('{"project":1,"plan":1,"kind":1'),
    );
    expect(generatedKind).toBeDefined();
    await mongoose.disconnect();

    const recorder = new Recorder();
    const dryResult = await runSyncIndexes({ apply: false, uri }, { logger: recorder });
    expect(dryResult.failures).toEqual([]);

    const dryRunEntries = recorder.infologs.filter((log) => log.msg === 'index diff (dry-run)');
    for (const log of dryRunEntries) {
      expect(Object.keys((log.entry.toCreate ?? {}) as object)).toEqual([]);
      expect((log.entry.toDrop as string[]) ?? []).toEqual([]);
    }
    expect(dryRunEntries.length).toBeGreaterThan(0);
  });

  it('collects failures instead of throwing when the database is unreachable', async () => {
    const result = await runSyncIndexes(
      { apply: false, uri: 'mongodb://127.0.0.1:1/none?serverSelectionTimeoutMS=300' },
      { logger: recorderUnnamed() },
    );
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain('connect');
  });
});

function recorderUnnamed(): Recorder {
  return new Recorder();
}

