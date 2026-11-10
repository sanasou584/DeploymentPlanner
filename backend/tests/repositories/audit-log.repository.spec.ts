import { setTimeout as sleep } from 'node:timers/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';

import { AuditLog, User, type UserDocument } from '../../src/models/entities/index.js';
import { AuditLogRepository } from '../../src/repositories/index.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';

const USER_ID = '64b1f6274190d8fe2ee1ba31' as unknown as Types.ObjectId;
const PROJECT_ID = '64b1f6274190d8fe2ee1ba33' as unknown as Types.ObjectId;
const PLAN_ID = '64b1f6274190d8fe2ee1ba34' as unknown as Types.ObjectId;

beforeAll(async () => {
  await connectTestingModule('audit_repo_test');
  await AuditLog.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await AuditLog.collection.deleteMany({});
});

describe('AuditLogRepository', () => {
  describe('listForEntity', () => {
    it('is empty for an entity with no entries', async () => {
      expect(await new AuditLogRepository().listForEntity('Project', PROJECT_ID)).toHaveLength(0);
    });

    it('returns only entries of the given entity, newest first', async () => {
      await AuditLog.record({
        actor: USER_ID,
        action: 'PROJECT_CREATED',
        entity: { type: 'Project', id: PROJECT_ID },
      });
      await sleep(10);
      await AuditLog.record({
        actor: USER_ID,
        action: 'PROJECT_UPDATED',
        entity: { type: 'Project', id: PROJECT_ID },
      });
      await AuditLog.record({
        actor: USER_ID,
        action: 'FILES_GENERATED',
        entity: { type: 'Plan', id: PLAN_ID },
      });

      const listed = await new AuditLogRepository().listForEntity('Project', PROJECT_ID);
      expect(listed).toHaveLength(2);
      expect(listed[0]?.action).toBe('PROJECT_UPDATED');
      expect(listed[1]?.action).toBe('PROJECT_CREATED');
      expect(String(listed[0]?.entity.id)).toBe(String(PROJECT_ID));
    });
  });

  describe('listErrors', () => {
    it('is empty when only INFO entries exist', async () => {
      await AuditLog.record({
        action: 'PROJECT_CREATED',
        entity: { type: 'Project', id: PROJECT_ID },
      });
      expect(await new AuditLogRepository().listErrors(['ERROR', 'WARN'])).toHaveLength(0);
    });

    it('returns WARN/ERROR entries newest first', async () => {
      await AuditLog.record({
        action: 'FILES_GENERATED',
        level: 'INFO',
        entity: { type: 'Plan', id: PLAN_ID },
      });
      await AuditLog.record({
        action: 'SYSTEM_ERROR',
        level: 'ERROR',
        entity: { type: 'WorkflowRun', id: PROJECT_ID },
        error: { code: 'E_FAIL', message: 'runner crashed' },
      });
      await sleep(10);
      await AuditLog.record({
        action: 'DEPLOYMENT_FAILED',
        level: 'WARN',
        entity: { type: 'Project', id: PROJECT_ID },
      });

      const errors = await new AuditLogRepository().listErrors(['ERROR', 'WARN']);
      expect(errors).toHaveLength(2);
      expect(errors[0]?.level).toBe('WARN');
      expect(errors[1]?.level).toBe('ERROR');
      expect(errors[1]?.error?.code).toBe('E_FAIL');
    });
  });
});

describe('User model (spec-driven lifespan checks)', () => {
  it('registers a regular account (fixture sanity)', async () => {
    const user = await User.register({ name: 'admin', email: 'admin@example.com', password: 'LongEnough1!' });
    const reloaded = (await User.findById(user._id)) as UserDocument;
    expect(reloaded.role).toBe('DEVELOPER');
  });
});

describe('strictQuery throw (AuditLogRepository)', () => {
  it('unknown filter keys throw instead of being stripped', async () => {
    await expect(new AuditLogRepository().exists({ notARealField: 1 })).rejects.toThrowError(/not in schema/);
  });
});
