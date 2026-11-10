import { describe, expect, it } from 'vitest';

import {
  encrypt,
  decrypt,
  type EncryptedTokenPayload,
} from '../../../src/shared/crypto/token-crypto.js';

const KEY = (length: number, seed = 1): Uint8Array =>
  new Uint8Array(length).map((_, i) => (i + seed) % 256);
const VALID_KEY = KEY(32);

describe('shared/crypto (AES-256-GCM)', () => {
  it('round-trips a plaintext through encrypt/decrypt', () => {
    const payload = encrypt(VALID_KEY, 'ghp_aVerySecretGitHubToken');

    expect(payload.iv).toHaveLength(16); // 12 random bytes -> 16 base64 chars
    expect(payload.cipherText).not.toContain('ghp_');
    expect(decrypt(VALID_KEY, payload)).toBe('ghp_aVerySecretGitHubToken');
  });

  it('generates a fresh IV for every call', () => {
    const a = encrypt(VALID_KEY, 'same-plain-text');
    const b = encrypt(VALID_KEY, 'same-plain-text');

    expect(a.iv).not.toBe(b.iv);
    expect(a.cipherText).not.toBe(b.cipherText);
    expect(decrypt(VALID_KEY, a)).toBe('same-plain-text');
    expect(decrypt(VALID_KEY, b)).toBe('same-plain-text');
  });

  it('detects tampering with the ciphertext', () => {
    const payload: EncryptedTokenPayload = encrypt(VALID_KEY, 'sensitive');
    const tampered: EncryptedTokenPayload = {
      ...payload,
      cipherText: Buffer.from('totally not the ciphertext').toString('base64'),
    };

    expect(() => decrypt(VALID_KEY, tampered)).toThrowError(/tampered or key mismatch/);
  });

  it('detects tampering with the auth tag', () => {
    const payload = encrypt(VALID_KEY, 'sensitive');
    const corruptTag = Buffer.from(payload.authTag, 'base64');
    corruptTag[0] = ((corruptTag[0] ?? 0) + 1) % 256;
    const tampered: EncryptedTokenPayload = { ...payload, authTag: corruptTag.toString('base64') };

    expect(() => decrypt(VALID_KEY, tampered)).toThrowError(/tampered or key mismatch/);
  });

  it('detects tampering with the IV', () => {
    const payload = encrypt(VALID_KEY, 'sensitive');
    const corruptIv = Buffer.from(payload.iv, 'base64');
    corruptIv[0] = ((corruptIv[0] ?? 0) + 1) % 256;
    const tampered: EncryptedTokenPayload = { ...payload, iv: corruptIv.toString('base64') };

    expect(() => decrypt(VALID_KEY, tampered)).toThrowError(/tampered or key mismatch/);
  });

  it('fails decryption with a different key', () => {
    const payload = encrypt(VALID_KEY, 'sensitive');

    expect(() => decrypt(KEY(32, 2), payload)).toThrowError(/tampered or key mismatch/);
  });

  it('rejects non-32-byte keys on both directions', () => {
    expect(() => encrypt(KEY(16), 'x')).toThrowError(/exactly 32 bytes/);
    expect(() => decrypt(KEY(64), { iv: '', authTag: '', cipherText: '', keyVersion: 1 })).toThrowError(
      /exactly 32 bytes/,
    );
  });
});
