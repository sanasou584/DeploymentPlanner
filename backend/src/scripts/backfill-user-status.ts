
/* eslint-disable no-console -- CLI script: stdout/stderr IS the output */

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { getEnv } from '../config/env.js';
import { User, USER_MODEL_NAME } from '../models/entities/index.js';
import { createLogger } from '../shared/logging/logger.js';

/**
 * Data migration: users predating the approval workflow have NO `status`
 * field, so the schema default (PENDING) never applies to them and
 * `assertCanAuthenticate` would reject every existing account, including
 * admins. Run once per environment BEFORE the new code goes live:
 *
 *   npm run db:backfill-user-status
 *
 * Mapping honors the previous source of truth (soft delete):
 *   deletedAt == null -> ACTIVE (existing, loggable accounts)
 *   deletedAt != null -> DISABLED (previously deactivated accounts)
 */
async function main(): Promise<void> {
  const env = getEnv();
  const logger = createLogger(env.logLevel);

  await connectDatabase(env.mongodbUri, { autoIndex: true });

  try {
    const missingStatus = { status: { $exists: false } };

    const activated = await User.updateMany(
      { ...missingStatus, deletedAt: null },
      { $set: { status: 'ACTIVE' } },
    );

    const disabled = await User.updateMany(
      { ...missingStatus, deletedAt: { $ne: null } },
      { $set: { status: 'DISABLED' } },
    );

    logger.info(
      {
        model: USER_MODEL_NAME,
        activated: activated.modifiedCount,
        disabled: disabled.modifiedCount,
      },
      'backfill-user-status done',
    );
  } finally {
    await disconnectDatabase();
  }
}

void (async (): Promise<void> => {
  try {
    await main();
  } catch (error: unknown) {
    console.error(
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  }
})();
