import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { schemaSql } from './schema.js';

export type SignalboxDatabase = DatabaseSync;

export function createInMemoryDatabase(): SignalboxDatabase {
  return new DatabaseSync(':memory:');
}

export function openSignalboxDatabase(appSupportPath: string): SignalboxDatabase {
  return new DatabaseSync(path.join(appSupportPath, 'signalbox.sqlite'));
}

export function initializeSchema(database: SignalboxDatabase): void {
  database.exec(schemaSql);
}
