import type { Server } from 'node:http';

import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { getEnv } from './config/env.js';
import { createLogger } from './shared/logging/logger.js';

/**
 * Entry point: the only module that connects to MongoDB and listens.
 * Shutdown is graceful: stop accepting connections, drain, close the DB, exit.
 * Uncaught errors are logged and crash the process (fail fast).
 */
async function main(): Promise<void> {
  const env = getEnv();
  const logger = createLogger(env.logLevel);
  const app = createApp(logger);
  const server: Server = app.listen(env.port);

  await connectDatabase(env.mongodbUri, { autoIndex: env.nodeEnv !== 'production' });
  logger.info({ port: env.port, env: env.nodeEnv }, 'server started');

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    logger.info({ signal }, 'shutting down');

    const forceExit = setTimeout(() => {
      logger.error('graceful shutdown timed out; forcing exit');
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close();
    await disconnectDatabase();
    clearTimeout(forceExit);
    process.exit(0);
  }

  process.on('SIGTERM', (signal) => void shutdown(signal));
  process.on('SIGINT', (signal) => void shutdown(signal));
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'uncaught exception');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandled rejection');
    process.exit(1);
  });
}

// Async/await everywhere: entry point is an awaited bootstrap with ONE
// try/catch - no .then/.catch chains anywhere in the codebase.
// The logger may not exist yet (e.g. invalid environment); write to stderr.
void (async (): Promise<void> => {
  try {
    await main();
  } catch (err: unknown) {
    process.stderr.write(`Fatal startup error: ${String(err)}\n`);
    process.exit(1);
  }
})();
