import { afterEach, describe, expect, it } from 'vitest';
import { ActionApplier, type GmailActionGateway, type NotificationGateway } from '../../src/worker/actions/actionApplier';
import { InMemoryTokenStore } from '../../src/worker/accounts/inMemoryTokenStore';
import { createInMemoryDatabase, initializeSchema } from '../../src/worker/storage/db';
import { SignalboxRepository } from '../../src/worker/storage/repositories';
import type { StoredMessage } from '../../src/worker/storage/schema';

const openDatabases: ReturnType<typeof createInMemoryDatabase>[] = [];

class FakeGmailActionGateway implements GmailActionGateway {
  archived: Array<{ accountEmail: string; gmailMessageId: string }> = [];

  async archiveMessage(input: { accountEmail: string; gmailMessageId: string }): Promise<void> {
    this.archived.push({
      accountEmail: input.accountEmail,
      gmailMessageId: input.gmailMessageId
    });
  }
}

class FakeNotificationGateway implements NotificationGateway {
  alerts: Array<{ sender: string; subject: string }> = [];

  async notifyImportantMessage(input: { sender: string; subject: string }): Promise<void> {
    this.alerts.push({
      sender: input.sender,
      subject: input.subject
    });
  }
}

const baseMessage: StoredMessage = {
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
};

function createApplier() {
  const db = createInMemoryDatabase();
  openDatabases.push(db);
  initializeSchema(db);
  const repository = new SignalboxRepository(db);
  const tokenStore = new InMemoryTokenStore();
  const gmailGateway = new FakeGmailActionGateway();
  const notificationGateway = new FakeNotificationGateway();
  const applier = new ActionApplier(repository, tokenStore, gmailGateway, notificationGateway, {
    now: () => '2026-06-26T15:02:00.000Z'
  });

  repository.upsertAccount({
    id: 'acct_personal',
    email: 'personal@gmail.com',
    displayName: 'Personal Gmail',
    syncState: 'idle',
    connectedAt: '2026-06-26T14:00:00.000Z',
    lastSyncAt: null
  });
  repository.upsertMessage(baseMessage);

  return { applier, gmailGateway, notificationGateway, repository, tokenStore };
}

afterEach(() => {
  for (const db of openDatabases.splice(0)) {
    db.close();
  }
});

describe('ActionApplier', () => {
  it('applies planned alert actions with a notification and audit entry', async () => {
    const { applier, notificationGateway, repository } = createApplier();
    repository.upsertAction({
      id: 'action_alert',
      messageId: 'msg_1',
      action: 'alert',
      status: 'planned',
      automatic: true,
      reason: 'High-confidence important message should notify immediately.',
      createdAt: '2026-06-26T15:01:00.000Z'
    });

    await expect(applier.applyPlannedActions()).resolves.toEqual({
      applied: 1,
      skipped: 0,
      failed: 0
    });

    expect(notificationGateway.alerts).toEqual([
      {
        sender: 'GitHub <noreply@github.com>',
        subject: 'Security alert'
      }
    ]);
    expect(repository.listActions()[0]?.status).toBe('applied');
    expect(repository.listAuditLog()).toEqual([
      {
        id: 'audit_action_alert',
        accountId: 'acct_personal',
        messageId: 'msg_1',
        action: 'alert',
        automatic: true,
        reason: 'High-confidence important message should notify immediately.',
        createdAt: '2026-06-26T15:02:00.000Z'
      }
    ]);
  });

  it('applies planned archive actions through Gmail when tokens exist', async () => {
    const { applier, gmailGateway, repository, tokenStore } = createApplier();
    await tokenStore.saveTokens('personal@gmail.com', {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiryDate: 1782486000000,
      scope: 'https://www.googleapis.com/auth/gmail.modify',
      tokenType: 'Bearer'
    });
    repository.upsertAction({
      id: 'action_archive',
      messageId: 'msg_1',
      action: 'archive',
      status: 'planned',
      automatic: true,
      reason: 'High-confidence low-risk cleanup can be archived safely.',
      createdAt: '2026-06-26T15:01:00.000Z'
    });

    await expect(applier.applyPlannedActions()).resolves.toEqual({
      applied: 1,
      skipped: 0,
      failed: 0
    });

    expect(gmailGateway.archived).toEqual([
      {
        accountEmail: 'personal@gmail.com',
        gmailMessageId: 'gmail_1'
      }
    ]);
    expect(repository.listActions()[0]?.status).toBe('applied');
  });

  it('does not apply pending review actions', async () => {
    const { applier, gmailGateway, notificationGateway, repository } = createApplier();
    repository.upsertAction({
      id: 'action_review',
      messageId: 'msg_1',
      action: 'review',
      status: 'pending_review',
      automatic: false,
      reason: 'Decision requires user review before any mailbox-changing action.',
      createdAt: '2026-06-26T15:01:00.000Z'
    });

    await expect(applier.applyPlannedActions()).resolves.toEqual({
      applied: 0,
      skipped: 1,
      failed: 0
    });

    expect(gmailGateway.archived).toEqual([]);
    expect(notificationGateway.alerts).toEqual([]);
    expect(repository.listActions()[0]?.status).toBe('pending_review');
  });
});
