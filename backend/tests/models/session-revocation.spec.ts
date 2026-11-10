import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SessionRevocation } from '../../src/models/entities/index.js';
import {
  connectTestingModule,
  disconnectTestingModule,
  stopMemoryServer,
} from '../integration/test-database.js';

beforeAll(async () => {
  await connectTestingModule('session_revocations_test');
  // Index builds are asynchronous right after connect: make the uniqueness
  // deterministic for the tests that race a duplicate insert.
  await SessionRevocation.syncIndexes();
});

afterAll(async () => {
  await disconnectTestingModule();
  await stopMemoryServer();
});

describe('SessionRevocation', () => {
  it('stores a jti with its expiry and expiresAt is required', async () => {
    await SessionRevocation.create({ jti: 'jti-1', expiresAt: new Date() });

    const stored = await SessionRevocation.findOne({ jti: 'jti-1' });
    expect(stored?.get('jti')).toBe('jti-1');
    expect(stored?.get('expiresAt')).toBeInstanceOf(Date);

    const missingExpiry = new SessionRevocation({ jti: 'jti-no-expiry' });
    await expect(missingExpiry.validate()).rejects.toThrow(
      /expiresAt/,
    );
  });

  it('keeps jti unique across rows', async () => {
    await SessionRevocation.create({ jti: 'jti-2', expiresAt: new Date() });

    await expect(
      SessionRevocation.create({ jti: 'jti-2', expiresAt: new Date() }),
    ).rejects.toThrowError(/duplicate key|E11000/i);
  });
});
