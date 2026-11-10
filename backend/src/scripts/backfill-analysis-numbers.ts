/* eslint-disable no-console -- CLI script: stdout/stderr IS the output */

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { getEnv } from '../config/env.js';
import { Analysis, ANALYSIS_MODEL_NAME } from '../models/entities/index.js';
import { createLogger } from '../shared/logging/logger.js';

/**
 * Data migration: analyses predate the `number` field (per-project sequence
 * number, "Analysis #N"). Run once per environment BEFORE the new code goes
 * live, so existing analyses get a stable number instead of failing the
 * `required: true` constraint on the next save:
 *
 *   npm run db:backfill-analysis-numbers
 *
 * Numbering is per project, ordered by createdAt ascending (oldest = #1),
 * matching the frontend's "N = total - index (newest first)" derivation.
 */
async function main(): Promise<void> {
  const env = getEnv();
  const logger = createLogger(env.logLevel);

  await connectDatabase(env.mongodbUri, { autoIndex: true });

  try {
    const projectIds = await Analysis.distinct('project');

    let updated = 0;

    for (const projectId of projectIds) {
      const analyses = await Analysis.find({ project: projectId })
        .sort({ createdAt: 1, _id: 1 })
        .exec();

      let position = 1;
      for (const analysis of analyses) {
        analysis.set('number', position);
        await analysis.save();
        position += 1;
        updated += 1;
      }
    }

    logger.info(
      { model: ANALYSIS_MODEL_NAME, projects: projectIds.length, updated },
      'backfill-analysis-numbers done',
    );
  } finally {
    await disconnectDatabase();
  }
}

void (async (): Promise<void> => {
  try {
    await main();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
})();
