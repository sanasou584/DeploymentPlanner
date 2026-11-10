import pino, { type Logger } from 'pino';

/**
 * Logger factory. It takes the level as an argument instead of reading the
 * environment itself so this module stays a leaf of the dependency graph
 * (shared/ never imports config/, see docs/conventions.md).
 *
 * Set `sync: true` for entry-point scripts (or anything that ends via
 * process.exit): pino's default async stdout writer loses buffered lines
 * when the process exits immediately after logging.
 */
export function createLogger(level: string, options: { sync?: boolean } = {}): Logger {
  if (options.sync === true) {
    return pino(
      { level, timestamp: pino.stdTimeFunctions.isoTime },
      pino.destination({ fd: 1, sync: true }),
    );
  }
  return pino({ level, timestamp: pino.stdTimeFunctions.isoTime });
}
