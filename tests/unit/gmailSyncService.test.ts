import { afterEach, describe, expect, it } from 'vitest';
import { InMemoryTokenStore } from '../../src/worker/accounts/inMemoryTokenStore';
import { GmailSyncService, type GmailGateway } from '../../src/worker/gmail/sync';
import type { RawGmailMessage } from '../../src/worker/gmail/normalize';
import { createInMemoryDatabase, initializeSchema } from '../../src/worker/storage/db';
import { SignalboxRepository } from '../../src/worker/storage/repositories';

const openDatabases: ReturnType<typeof createInMemoryDatabase>[] = [];

class FakeGmailGateway implements GmailGateway {
  requests: string[] = [];

  async listRecentMessages(input: { accountEmail: string }): Promise<RawGmailMessage[]> {
    this.requests.push(input.accountEmail);
    return [
      {
        id: 'gmail_123',
        threadId: 'thread_123',
        labelIds: ['INBOX'],
        snippet: 'A new sign-in was detected',
        internalDate: '1782486000000',
        payload: {
          headers: [
            { name: 'From', value: 'GitHub <noreply@github.com>' },
            { name: 'To', value: input.accountEmail },
            { name: 'Subject', value: 'New sign-in from macOS' }
          ]
        }
      }
    ];
  }
}

function createSyncService() {
  const db = createInMemoryDatabase();
  openDatabases.push(db);
  initializeSchema(db);
  const repository = new SignalboxRepository(db);
  const tokenStore = new InMemoryTokenStore();
  const gateway = new FakeGmailGateway();
  const service = new GmailSyncService(repository, tokenStore, gateway, {
    createMessageId: (accountId, gmailMessageId) => `${accountId}_${gmailMessageId}`,
    now: () => '2026-06-26T15:01:00.000Z'
  });
  return { gateway, repository, service, tokenStore };
}

afterEach(() => {
  for (const db of openDatabases.splice(0)) {
    db.close();
  }
});

describe('GmailSyncService', () => {
  it('syncs recent Gmail messages for accounts with stored tokens', async () => {
    const { gateway, repository, service, tokenStore } = createSyncService();
    repository.upsertAccount({
      id: 'acct_personal',
      email: 'personal@gmail.com',
      displayName: 'Personal Gmail',
      syncState: 'idle',
      connectedAt: '2026-06-26T14:00:00.000Z',
      lastSyncAt: null
    });
    await tokenStore.saveTokens('personal@gmail.com', {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiryDate: 1782486000000,
      scope: 'https://www.googleapis.com/auth/gmail.modify',
      tokenType: 'Bearer'
    });

    await expect(service.syncRecentMessages()).resolves.toEqual({
      accountsChecked: 1,
      messagesStored: 1,
      accountsSkipped: 0
    });

    expect(gateway.requests).toEqual(['personal@gmail.com']);
    expect(repository.listMessages()).toEqual([
      {
        id: 'acct_personal_gmail_123',
        accountId: 'acct_personal',
        gmailMessageId: 'gmail_123',
        gmailThreadId: 'thread_123',
        sender: 'GitHub <noreply@github.com>',
        recipients: 'personal@gmail.com',
        subject: 'New sign-in from macOS',
        snippet: 'A new sign-in was detected',
        receivedAt: '2026-06-26T15:00:00.000Z',
        labels: ['INBOX'],
        headers: {
          autoSubmitted: false,
          listUnsubscribe: false
        },
        createdAt: '2026-06-26T15:01:00.000Z',
        updatedAt: '2026-06-26T15:01:00.000Z'
      }
    ]);
    expect(repository.listClassifications()).toEqual([
      {
        id: 'class_acct_personal_gmail_123_rules',
        messageId: 'acct_personal_gmail_123',
        category: 'security',
        importance: 'high',
        recommendedAction: 'alert',
        confidence: 0.96,
        reason: 'Security or account-access language detected in sender or subject.',
        source: 'rules',
        createdAt: '2026-06-26T15:01:00.000Z'
      }
    ]);
    expect(repository.listActions()).toEqual([
      {
        id: 'action_acct_personal_gmail_123_alert',
        messageId: 'acct_personal_gmail_123',
        action: 'alert',
        status: 'planned',
        automatic: true,
        reason: 'High-confidence important message should notify immediately.',
        createdAt: '2026-06-26T15:01:00.000Z'
      }
    ]);
    expect(repository.listAccounts()[0]?.lastSyncAt).toBe('2026-06-26T15:01:00.000Z');
  });

  it('skips accounts without stored tokens', async () => {
    const { gateway, repository, service } = createSyncService();
    repository.upsertAccount({
      id: 'acct_personal',
      email: 'personal@gmail.com',
      displayName: 'Personal Gmail',
      syncState: 'idle',
      connectedAt: '2026-06-26T14:00:00.000Z',
      lastSyncAt: null
    });

    await expect(service.syncRecentMessages()).resolves.toEqual({
      accountsChecked: 1,
      messagesStored: 0,
      accountsSkipped: 1
    });
    expect(gateway.requests).toEqual([]);
  });
});
