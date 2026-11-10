import mongoose, { type ConnectOptions } from 'mongoose';

/**
 * Owns the single Mongoose connection of the monolith.
 * - `strictQuery` is globally `'throw'`: unknown query filter keys THROW
 *   (never silently stripped - `true` would turn typos into match-all queries).
 * - Index auto-creation is disabled in production (build-time / migration-owned).
 */

export type DbStatus =
  'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'uninitialized';

const READY_STATE: readonly DbStatus[] = [
  'disconnected',
  'connected',
  'connecting',
  'disconnecting',
  'uninitialized',
] as const;

export function getDbStatus(): DbStatus {
  const readyState = mongoose.connection.readyState;
  return READY_STATE[readyState] ?? 'uninitialized';
}

export interface ConnectOverrides {
  autoIndex: boolean;
}

/**
 * Connects the monolith's single Mongoose connection. The URI and the
 * autoIndex decision ARRIVE FROM the caller (a composition root: server.ts,
 * a standalone script, or a test helper) — config never reads env itself
 * (docs/conventions.md, "Dependency direction").
 */
export async function connectDatabase(
  mongodbUri: string,
  overrides: Partial<ConnectOverrides> = {},
): Promise<void> {
  mongoose.set('strictQuery', 'throw');

  await mongoose.connect(mongodbUri, {
    autoIndex: overrides.autoIndex ?? false,
    serverSelectionTimeoutMS: 10_000,
  } satisfies ConnectOptions);
}

/**
 * Closes the default connection whatever state it is in. `mongoose.disconnect()`
 * resolves only after in-flight work finishes — a connect that failed while
 * CONNECTING leaves readyState 2 forever on Mongoose 9, so a plain teardown
 * hangs. close(true) drops the connection without waiting for in-flight work,
 * making server shutdown safe on a failed startup too.
 */
export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(true);
  }
}
