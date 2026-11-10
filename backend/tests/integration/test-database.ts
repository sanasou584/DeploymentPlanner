import { MongoMemoryReplSet } from 'mongodb-memory-server';

import { connectDatabase, disconnectDatabase } from '../../src/config/database.js';

/**
 * Boots a throwaway MongoDB REPLICA SET (mongodb-memory-server) and reuses
 * one instance per worker for speed. A single-node replica set is required:
 * cross-document services run mongoose transactions (services README) and
 * transactions are only allowed on replica set members. Tests call
 * connectTestingModule() beforeAll and disconnectTestingModule() afterAll.
 */

let replSet: MongoMemoryReplSet | undefined;

export async function connectTestingModule(dbName = 'deployment_planner_test'): Promise<void> {
  replSet ??= await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await connectDatabase(replSet.getUri(dbName), { autoIndex: true });
}

export async function disconnectTestingModule(): Promise<void> {
  await disconnectDatabase();
}

export async function stopMemoryServer(): Promise<void> {
  await replSet?.stop();
  replSet = undefined;
}
