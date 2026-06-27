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

describe('action repository', () => {
  it('stores and replaces planned actions per message and action', () => {
    const repository = createRepository();

    repository.upsertAction({
      id: 'action_1',
      messageId: 'msg_1',
      action: 'review',
      status: 'pending_review',
      automatic: false,
      reason: 'Low-confidence message.',
      createdAt: '2026-06-26T15:01:00.000Z'
    });
    repository.upsertAction({
      id: 'action_2',
      messageId: 'msg_1',
      action: 'review',
      status: 'pending_review',
      automatic: false,
      reason: 'Updated review reason.',
      createdAt: '2026-06-26T15:02:00.000Z'
    });

    expect(repository.listActions()).toEqual([
      {
        id: 'action_1',
        messageId: 'msg_1',
        action: 'review',
        status: 'pending_review',
        automatic: false,
        reason: 'Updated review reason.',
        createdAt: '2026-06-26T15:02:00.000Z'
      }
    ]);
  });
});
