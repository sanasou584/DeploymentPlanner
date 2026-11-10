
import {
  SessionRevocation,
} from '../models/entities/index.js';

/**
 * Deny-list of revoked session tokens (logout). Rows self-expire through the
 * model TTL index once the revoked token would have expired anyway.
 */
export class SessionRevocationRepository {
  /** Idempotent upsert: logging out twice never fails. */
  async ensureRevoked(jti: string, expiresAt: Date) {
    return SessionRevocation.findOneAndUpdate(
      { jti },
      {
        $set: {
          jti,
          expiresAt,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    ).exec();
  }

  async isRevoked(jti: string): Promise<boolean> {
    const row = await SessionRevocation.exists({ jti }).exec();
    return row !== null;
  }
}
