import { afterEach, describe, expect, it } from 'vitest';
import { DashboardService } from '../../src/worker/dashboard/dashboardService';
import { createInMemoryDatabase, initializeSchema } from '../../src/worker/storage/db';
import { SignalboxRepository } from '../../src/worker/storage/repositories';

const openDatabases: ReturnType<typeof createInMemoryDatabase>[] = [];

function createService() {
  const db = createInMemoryDatabase();
  openDatabases.push(db);
  initializeSchema(db);
  const repository = new SignalboxRepository(db);
  const service = new DashboardService(repository);
  return { repository, service };
}

afterEach(() => {
  for (const db of openDatabases.splice(0)) {
    db.close();
  }
});

describe('DashboardService', () => {
  it('returns latest decision rows from stored messages, classifications, and actions', () => {
    const { repository, service } = createService();
    repository.upsertAccount({
      id: 'acct_personal',
      email: 'personal@gmail.com',
      displayName: 'Personal Gmail',
      syncState: 'idle',
      connectedAt: '2026-06-26T14:00:00.000Z',
      lastSyncAt: '2026-06-26T15:01:00.000Z'
    });
    repository.upsertMessage({
      id: 'msg_1',
      accountId: 'acct_personal',
      gmailMessageId: 'gmail_1',
      gmailThreadId: 'thread_1',
      sender: 'GitHub <noreply@github.com>',
      recipients: 'personal@gmail.com',
      subject: 'Security alert',
      snippet: 'A new sign-in was detected',
      receivedAt: '2026-06-26T15:00:00.000Z',
      labels: ['INBOX'],
      headers: {
        autoSubmitted: false,
        listUnsubscribe: false
      },
      createdAt: '2026-06-26T15:01:00.000Z',
      updatedAt: '2026-06-26T15:01:00.000Z'
    });
    repository.upsertClassification({
      id: 'class_1',
      messageId: 'msg_1',
      category: 'security',
      importance: 'high',
      recommendedAction: 'alert',
      confidence: 0.96,
      reason: 'Security or account-access language detected in sender or subject.',
      source: 'rules',
      createdAt: '2026-06-26T15:01:00.000Z'
    });
    repository.upsertAction({
      id: 'action_1',
      messageId: 'msg_1',
      action: 'alert',
      status: 'applied',
      automatic: true,
      reason: 'High-confidence important message should notify immediately.',
      createdAt: '2026-06-26T15:02:00.000Z'
    });

    expect(service.getDashboard()).toEqual({
      decisions: [
        {
          id: 'msg_1',
          account: 'personal@gmail.com',
          sender: 'GitHub <noreply@github.com>',
          subject: 'Security alert',
          category: 'security',
          confidence: 0.96,
          recommendedAction: 'alert',
          actionStatus: 'applied',
          reason: 'Security or account-access language detected in sender or subject.',
          receivedAt: '2026-06-26T15:00:00.000Z'
        }
      ],
      metrics: {
        important: 1,
        autoArchived: 0,
        reviewRequired: 0,
        pendingDelete: 0
      }
    });
  });

  it('returns empty dashboard data when no messages exist', () => {
    const { service } = createService();

    expect(service.getDashboard()).toEqual({
      decisions: [],
      metrics: {
        important: 0,
        autoArchived: 0,
        reviewRequired: 0,
        pendingDelete: 0
      }
    });
  });
});
