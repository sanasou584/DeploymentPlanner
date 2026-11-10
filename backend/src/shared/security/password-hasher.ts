import argon2 from 'argon2';

/**
 * Password hashing behind a tiny interface so the hashing strategy is swappable in tests.
 * Uses argon2 (argon2id - library default): memory-hard, the current OWASP
 * recommendation. A bcrypt fallback was NOT needed; argon2 ships prebuilt
 * native binaries for this platform.
 */

export interface PasswordHasher {
  hash(plainText: string): Promise<string>;
  verify(plainText: string, passwordHash: string): Promise<boolean>;
}

export const argon2PasswordHasher: PasswordHasher = {
  hash(plainText: string): Promise<string> {
    return argon2.hash(plainText);
  },
  verify(plainText: string, passwordHash: string): Promise<boolean> {
    return argon2.verify(passwordHash, plainText);
  },
};
