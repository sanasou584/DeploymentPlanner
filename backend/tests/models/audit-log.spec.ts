import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';

import { AuditLog, type AuditLogDocument } from '../../src/models/entities/audit-log.model.js';
import { InvariantViolationError } from '../../src/domain/errors/index.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';
import { validatedErrorPaths } from '../helpers/schema-validation.js';

const USER_ID = '64b1f6274190d8fe2ee1ba31' as unknown as Types.ObjectId;
const USER2_ID = '64b1f6274190d8fe2ee1ba32' as unknown as Types.ObjectId;
const PROJECT_ID = '64b1f6274190d8fe2ee1ba33' as unknown as Types.ObjectId;

const recordCreated = (): Promise<AuditLogDocument> =>
  AuditLog.record({
    actor: USER_ID,
    action: 'PROJECT_CREATED',
    entity: { type: 'Project', id: PROJECT_ID },
    message: 'proj created',
  });

beforeAll(async () => {
  await connectTestingModule('audit_logs_test');
  await AuditLog.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  // AuditLog blocks deleteMany; purge at the DRIVER level for the test env.
  await AuditLog.collection.deleteMany({});
});

describe('AuditLog model', () => {
  describe('record()', () => {
    it('records an event with actor, action, entity and message', async () => {
      const entry = await recordCreated();

      expect(entry.action).toBe('PROJECT_CREATED');
      expect(entry.level).toBe('INFO');
      expect(entry.actor).toBeTruthy();
      expect(String(entry.entity.id)).toBe(String(PROJECT_ID));
      expect(entry.get('createdAt') as Date).toBeInstanceOf(Date);
    });

    it('rejects an unknown action', async () => {
      const entry = new AuditLog({ action: 'VISIBLE Magick' as never, entity: { type: 'Project', id: PROJECT_ID } });
      expect(await validatedErrorPaths(entry)).toContain('action');
    });

    it('defaults level to INFO and permits ERROR entries (admin error view)', async () => {
      const errorEntry = await AuditLog.record({
        action: 'SYSTEM_ERROR',
        level: 'ERROR',
        entity: { type: 'Deployment', id: PROJECT_ID },
        error: { code: 'E_INTERNAL', message: 'driver crashed' },
      });

      expect(errorEntry.level).toBe('ERROR');
      expect(errorEntry.error?.code).toBe('E_INTERNAL');
    });

    it('metadata (the allowed Mixed use) stores arbitrary payloads', async () => {
      const entry = await AuditLog.record({
        action: 'RECOMMENDATION_ACCEPTED',
        actor: USER2_ID,
        entity: { type: 'Recommendation', id: PROJECT_ID },
        metadata: { decisionNote: 'ok', nested: { counts: [1, 2, 3] } },
      });

      expect(JSON.parse(JSON.stringify(entry.metadata))).toEqual({
        decisionNote: 'ok',
        nested: { counts: [1, 2, 3] },
      });
    });

    it('actor defaults to system (absent)', async () => {
      const systemEntry = await AuditLog.record({
        action: 'SYSTEM_ERROR',
        entity: { type: 'System', id: PROJECT_ID },
      });

      expect(systemEntry.get('actor')).toBeUndefined();
    });
  });

  describe('immutability (append-only enforcement)', () => {
    it('save() of an EXISTING record throws', async () => {
      const entry = await recordCreated();
      entry.set('message', 'mutated');

      await expect(entry.save()).rejects.toThrowError(InvariantViolationError);
      await expect(entry.save()).rejects.toThrowError(/append-only/);
    });

    it('updateOne/updateMany/deleteMany/deleteOne all throw', async () => {
      await recordCreated();

      await expect(AuditLog.updateOne({}, { $set: { message: 'x' } })).rejects.toThrowError(
        InvariantViolationError,
      );
      await expect(AuditLog.updateMany({}, { $set: { message: 'x' } })).rejects.toThrowError(
        InvariantViolationError,
      );
      await expect(AuditLog.deleteOne({})).rejects.toThrowError(InvariantViolationError);
      await expect(AuditLog.deleteMany({})).rejects.toThrowError(InvariantViolationError);
    });

    it('findOneAndUpdate / findOneAndDelete / findOneAndReplace throw', async () => {
      await recordCreated();

      await expect(AuditLog.findOneAndUpdate({}, { $set: { message: 'x' } })).rejects.toThrowError(
        InvariantViolationError,
      );
      await expect(AuditLog.findOneAndDelete({})).rejects.toThrowError(InvariantViolationError);
      await expect(AuditLog.findOneAndReplace({}, { action: 'USER_CREATED' as never })).rejects.toThrowError(
        InvariantViolationError,
      );
    });

    it('replaceOne targets deleteOne/updateOne machinery paths (also blocked)', async () => {
      await recordCreated();
      const entry = await recordCreated();

      await expect(
        AuditLog.replaceOne({ _id: entry._id }, { action: 'USER_UPDATED' as never }),
      ).rejects.toThrowError(InvariantViolationError);
    });
  });

  describe('history + admin error views (index coverage)', () => {
    it('indexes exist for entity, actor, and level lookups', async () => {
      const indexKeys = (await AuditLog.listIndexes()).map((index) => JSON.stringify(index.key));

      expect(indexKeys).toContain('{"_id":1}'); // default
      expect(indexKeys).toContain('{"entity.type":1,"entity.id":1,"createdAt":-1}');
      expect(indexKeys).toContain('{"actor":1,"createdAt":-1}');
      expect(indexKeys).toContain('{"level":1,"createdAt":-1}');
    });

    it('reads are free: find() works despite append-only writes', async () => {
      await recordCreated();
      const rows = (await AuditLog.find({})) as AuditLogDocument[];
      const first = rows[0];

      expect(rows).toHaveLength(1);
      expect(first?.action).toBe('PROJECT_CREATED');
    });
  });
});
