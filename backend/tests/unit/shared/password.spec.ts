import { describe, expect, it } from 'vitest';

import { argon2PasswordHasher } from '../../../src/shared/security/password-hasher.js';

describe('shared/security (argon2 password hashing)', () => {
  it('hashes a password and hides the plaintext', async () => {
    const hash = await argon2PasswordHasher.hash('correct horse battery staple');

    expect(hash).not.toContain('correct horse battery staple');
    expect(hash.startsWith('$argon2')).toBe(true);
  });

  it('verifies the right password and rejects the wrong one', async () => {
    const hash = await argon2PasswordHasher.hash('my-secret-pass');

    expect(await argon2PasswordHasher.verify('my-secret-pass', hash)).toBe(true);
    expect(await argon2PasswordHasher.verify('my-secret-pass2', hash)).toBe(false);
  });

  it('produces a different hash for the same password (unique salt)', async () => {
    const a = await argon2PasswordHasher.hash('pw');
    const b = await argon2PasswordHasher.hash('pw');

    expect(a).not.toBe(b);
    expect(await argon2PasswordHasher.verify('pw', b)).toBe(true);
  });

  it('rejects empty hashes instead of throwing', async () => {
    await expect(argon2PasswordHasher.verify('pw', '')).rejects.toThrow();
  });
});
