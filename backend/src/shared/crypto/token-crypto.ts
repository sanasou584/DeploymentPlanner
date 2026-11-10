import { createCipheriv, createDecipheriv, randomBytes, type CipherGCMTypes } from 'node:crypto';

/**
 * AES-256-GCM token encryption. The key (from TOKEN_ENCRYPTION_KEY, exactly
 * 32 bytes) is ALWAYS passed in - this module never reads the environment
 * (shared/ stays below config/). Payload shape is persisted as-is:
 *   { keyVersion: number, iv: string, authTag: string, cipherText: string }
 *   (base64 strings; keyVersion is a numeric discriminator stamped on
 *   encryption so decrypt() can reject payloads written under an unknown
 *   key generation instead of failing with a generic tamper error).
 * A fresh random IV is generated for every call.
 */

export interface EncryptedTokenPayload {
  keyVersion: number;
  iv: string;
  authTag: string;
  cipherText: string;
}

export const CURRENT_KEY_VERSION = 1 as const;

const KNOWN_KEY_VERSIONS = new Set<number>([CURRENT_KEY_VERSION]);

const IV_BYTES = 12;
const KEY_BYTES = 32;
const ALGO: CipherGCMTypes = 'aes-256-gcm';

function assertKey(key: Uint8Array): void {
  if (key.byteLength !== KEY_BYTES) {
    throw new Error(`TOKEN_ENCRYPTION_KEY must be exactly ${KEY_BYTES} bytes`);
  }
}

export function encrypt(key: Uint8Array, plainText: string): EncryptedTokenPayload {
  assertKey(key);

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const enciphered = cipher.update(plainText, 'utf8');
  const cipherText = Buffer.concat([enciphered, cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    keyVersion: CURRENT_KEY_VERSION,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    cipherText: cipherText.toString('base64'),
  };
}

export function decrypt(key: Uint8Array, payload: EncryptedTokenPayload): string {
  assertKey(key);

  if (!KNOWN_KEY_VERSIONS.has(payload.keyVersion)) {
    throw new Error(
      `Unknown key version ${payload.keyVersion}: the payload is unusable (version ${CURRENT_KEY_VERSION} is currently supported). Key rotation is not implemented yet.`,
    );
  }

  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const cipherText = Buffer.from(payload.cipherText, 'base64');

  try {
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('Token decryption failed: payload tampered or key mismatch');
  }
}
