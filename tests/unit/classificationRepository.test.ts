import { afterEach, describe, expect, it } from 'vitest';
import { createInMemoryDatabase, initializeSchema } from '../../src/worker/storage/db';
import { SignalboxRepository } from '../../src/worker/storage/repositories';

const openDatabases: ReturnType<typeof createInMemoryDatabase>[] = [];

function createRepository() {
  const db = createInMemoryDatabase();
  openDatabases.push(db);
  initializeSchema(db);
  return new SignalboxRepository(db);
}

afterEach(() => {
  for (const db of openDatabases.splice(0)) {
    db.close();
  }
});

describe('classification repository', () => {
  it('stores and replaces classifications per message and source', () => {
    const repository = createRepository();

    repository.upsertClassification({
      id: 'class_1',
      messageId: 'msg_1',
      category: 'unknown',
      importance: 'medium',
      recommendedAction: 'review',
      confidence: 0.5,
      reason: 'No deterministic rule matched this message.',
      source: 'rules',
      createdAt: '2026-06-26T15:01:00.000Z'
    });
    repository.upsertClassification({
      id: 'class_2',
      messageId: 'msg_1',
      category: 'security',
      importance: 'high',
      recommendedAction: 'alert',
      confidence: 0.96,
      reason: 'Security language detected.',
      source: 'rules',
      createdAt: '2026-06-26T15:02:00.000Z'
    });

    expect(repository.listClassifications()).toEqual([
      {
        id: 'class_1',
        messageId: 'msg_1',
        category: 'security',
        importance: 'high',
        recommendedAction: 'alert',
        confidence: 0.96,
        reason: 'Security language detected.',
        source: 'rules',
        createdAt: '2026-06-26T15:02:00.000Z'
      }
    ]);
  });
});
