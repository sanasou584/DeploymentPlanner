import { describe, expect, it } from 'vitest';

import {
  CURRENT_KEY_VERSION,
  encrypt,
  decrypt,
  type EncryptedTokenPayload,
} from '../../../src/shared/crypto/token-crypto.js';

const KEY = (length: number, seed = 1): Uint8Array =>
  new Uint8Array(length).map((_, i) => (i + seed) % 256);
const VALID_KEY = KEY(32);

describe('token payload keyVersion', () => {
  it('encrypt stamps the CURRENT_KEY_VERSION', () => {
    const payload = encrypt(VALID_KEY, 'stamped-token');

    expect(CURRENT_KEY_VERSION).toBe(1);
    expect(payload.keyVersion).toBe(CURRENT_KEY_VERSION);
    expect(decrypt(VALID_KEY, payload)).toBe('stamped-token');
  });

  it('decrypt rejects an unknown keyVersion with a clear error', () => {
    const payload: EncryptedTokenPayload = {
      ...encrypt(VALID_KEY, 'written-by-future-key'),
      keyVersion: 9,
    };

    expect(() => decrypt(VALID_KEY, payload)).toThrowError(/unknown key version 9/i);
    expect(() => decrypt(VALID_KEY, payload)).toThrowError(/Key rotation is not implemented/);
  });

  it('decrypt keeps the generic tamper error for the CURRENT version with a wrong key', () => {
    const payload = encrypt(VALID_KEY, 'sensitive');

    expect(() => decrypt(KEY(32, 2), payload)).toThrowError(/tampered or key mismatch/);
  });
});
