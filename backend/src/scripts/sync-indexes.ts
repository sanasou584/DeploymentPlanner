import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { getEnv } from '../config/env.js';
import mongoose from 'mongoose';
import { createLogger } from '../shared/logging/logger.js';

export interface SyncIndexLogger {
  info(entry: object, msg: string): void;
  error(entry: object, msg: string): void;
}

/**
 * Synchronizes Mongoose-declared indexes with the database.
 * MANDATORY on every deploy: autoIndex is OFF in production, so unique and
 * partial indexes only exist if this script runs there.
 *
 *  npm run db:sync-indexes            # dry-run: prints current-vs-declared diff
 *  npm run db:sync-indexes -- --apply
 *  npm run db:sync-indexes -- --uri mongodb://...
 *
 * Exits non-zero if any model fails to sync; always terminates the process.
 */

export interface SyncIndexesOptions {
  apply: boolean;
  uri?: string | undefined;
}

export interface SyncIndexesResult {
  failures: string[];
}

export interface IndexDiff {
  toCreate: Record<string, unknown>;
  toDrop: string[];
}

export interface IndexSyncCapable {
  diffIndexes(): Promise<IndexDiff>;
  syncIndexes(): Promise<Record<string, unknown>>;
}

function asSyncCapable(value: object): IndexSyncCapable | null {
  if (!('diffIndexes' in value && 'syncIndexes' in value)) {
    return null;
  }
  // Cast stays inside this script: mongoose 9 model generics do not reduce
  // to a common base shape for every entity (same reason as BaseRepository).
  return value as unknown as IndexSyncCapable;
}

export async function runSyncIndexes(
  options: SyncIndexesOptions,
  extra: { logger?: SyncIndexLogger } = {},
): Promise<SyncIndexesResult> {
  const logger = extra.logger ?? createLogger(getEnv().logLevel, { sync: true });
  const failures: string[] = [];

  // The script is the ONLY writer of indexes in this run. Mongoose reads
  // autoIndex at Model.init() time from schema.options → conn.config →
  // base.options (node_modules/mongoose/lib/model.js:1131); with the process
  // default (true in dev) a plain connect auto-builds every declared index
  // and both half-races diffIndexes() and silently VANDALIZES the database by
  // adding the diff — equivalent to an accidental --apply. Disable at the
  // global level BEFORE the models are registered (barrel import below runs
  // on a connection that does not exist yet, so init() queues against
  // base.options) and again on the connection config (second level of the
  // lookup), making the run autoIndex-free regardless of NODE_ENV.
  mongoose.set('autoIndex', false);
  const entityIndex = (await import('../models/entities/index.js')) as unknown as Record<
    string,
    object
  >;
  try {
    // Default URI: resolved HERE (this script is a standalone composition
    // root) - config/database.ts never reads env itself.
    await connectDatabase(options.uri ?? getEnv().mongodbUri, { autoIndex: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { failures: [`connect: ${message}`] };
  }

  for (const [modelName, value] of Object.entries(entityIndex)) {
    if (typeof value !== 'function') {
      continue;
    }
    const model = asSyncCapable(value);
    if (!model) {
      continue;
    }
    try {
      const diff = await model.diffIndexes();
      const toCreate: Record<string, Record<string, number | string>> = (diff.toCreate ??
        {}) as Record<string, Record<string, number | string>>;
      const toDrop: string[] = diff.toDrop ?? [];

      if (options.apply) {
        const created = (await model.syncIndexes()) as Record<
          string,
          Record<string, unknown>
        >;
        logger.info(
          { model: modelName, toCreate, toDrop, created },
          'indexes synced',
        );
      } else {
        logger.info({ model: modelName, toCreate, toDrop }, 'index diff (dry-run)');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${modelName}: ${message}`);
      logger.error({ model: modelName, message }, 'index sync failed');
    }
  }

  await disconnectDatabase();
  return { failures };
}

function parseUri(argv: readonly string[]): string | undefined {
  const uriArgIdx = argv.indexOf('--uri');
  const value = uriArgIdx >= 0 ? argv[uriArgIdx + 1] : undefined;
  return value ?? undefined;
}

async function main(): Promise<void> {
  const { failures } = await runSyncIndexes({
    apply: process.argv.includes('--apply'),
    uri: parseUri(process.argv.slice(2)),
  });
  // CLI semantics: hard exit after the report; disconnectDatabase() force-closes
  // every readyState, so nothing can keep the loop alive here.
  process.exit(failures.length > 0 ? 1 : 0);
}

const isEntry =
  typeof process.argv[1] === 'string' &&
  (import.meta.url === `file://${process.argv[1]}` ||
    import.meta.url.endsWith(process.argv[1]));
if (isEntry === true) {
  void (async (): Promise<void> => {
    try {
      await main();
    } catch (error: unknown) {
      const crashLogger = createLogger(getEnv().logLevel, { sync: true });
      crashLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'db:sync-indexes crashed');
      process.exit(1);
    }
  })();
}
