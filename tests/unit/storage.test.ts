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

describe('SignalboxRepository', () => {
  it('stores account metadata without token fields', () => {
    const repository = createRepository();

    repository.upsertAccount({
      id: 'acct_personal',
      email: 'personal@gmail.com',
      displayName: 'Personal Gmail',
      syncState: 'idle',
      connectedAt: '2026-06-26T12:00:00.000Z',
      lastSyncAt: null
    });

    expect(repository.listAccounts()).toEqual([
      {
        id: 'acct_personal',
        email: 'personal@gmail.com',
        displayName: 'Personal Gmail',
        syncState: 'idle',
        connectedAt: '2026-06-26T12:00:00.000Z',
        lastSyncAt: null
      }
    ]);
  });

  it('upserts messages by account and Gmail message id', () => {
    const repository = createRepository();

    repository.upsertMessage({
      id: 'local_msg_1',
      accountId: 'acct_personal',
      gmailMessageId: 'gmail_123',
      gmailThreadId: 'thread_123',
      sender: 'GitHub <noreply@github.com>',
      recipients: 'personal@gmail.com',
      subject: 'New sign-in from macOS',
      snippet: 'A new sign-in was detected',
      receivedAt: '2026-06-26T13:00:00.000Z',
      labels: ['INBOX', 'IMPORTANT'],
      headers: {
        autoSubmitted: false,
        listUnsubscribe: false
      },
      createdAt: '2026-06-26T13:01:00.000Z',
      updatedAt: '2026-06-26T13:01:00.000Z'
    });

    repository.upsertMessage({
      id: 'local_msg_2',
      accountId: 'acct_personal',
      gmailMessageId: 'gmail_123',
      gmailThreadId: 'thread_123',
      sender: 'GitHub <noreply@github.com>',
      recipients: 'personal@gmail.com',
      subject: 'Updated subject',
      snippet: 'Updated snippet',
      receivedAt: '2026-06-26T13:00:00.000Z',
      labels: ['INBOX'],
      headers: {
        autoSubmitted: false,
        listUnsubscribe: false
      },
      createdAt: '2026-06-26T13:01:00.000Z',
      updatedAt: '2026-06-26T13:02:00.000Z'
    });

    expect(repository.listMessages()).toEqual([
      {
        id: 'local_msg_1',
        accountId: 'acct_personal',
        gmailMessageId: 'gmail_123',
        gmailThreadId: 'thread_123',
        sender: 'GitHub <noreply@github.com>',
        recipients: 'personal@gmail.com',
        subject: 'Updated subject',
        snippet: 'Updated snippet',
        receivedAt: '2026-06-26T13:00:00.000Z',
        labels: ['INBOX'],
        headers: {
          autoSubmitted: false,
          listUnsubscribe: false
        },
        createdAt: '2026-06-26T13:01:00.000Z',
        updatedAt: '2026-06-26T13:02:00.000Z'
      }
    ]);
  });

  it('records audit log entries in chronological order', () => {
    const repository = createRepository();

    repository.appendAuditLog({
      id: 'audit_1',
      accountId: 'acct_personal',
      messageId: 'local_msg_1',
      action: 'archive',
      automatic: true,
      reason: 'High-confidence newsletter cleanup',
      createdAt: '2026-06-26T13:10:00.000Z'
    });
    repository.appendAuditLog({
      id: 'audit_2',
      accountId: 'acct_personal',
      messageId: 'local_msg_2',
      action: 'review',
      automatic: false,
      reason: 'Low-confidence sender',
      createdAt: '2026-06-26T13:11:00.000Z'
    });

    expect(repository.listAuditLog()).toEqual([
      {
        id: 'audit_1',
        accountId: 'acct_personal',
        messageId: 'local_msg_1',
        action: 'archive',
        automatic: true,
        reason: 'High-confidence newsletter cleanup',
        createdAt: '2026-06-26T13:10:00.000Z'
      },
      {
        id: 'audit_2',
        accountId: 'acct_personal',
        messageId: 'local_msg_2',
        action: 'review',
        automatic: false,
        reason: 'Low-confidence sender',
        createdAt: '2026-06-26T13:11:00.000Z'
      }
    ]);
  });
});
