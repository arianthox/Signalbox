import type { StatementSync } from 'node:sqlite';
import type { MessageDecision } from '../../shared/types.js';
import type { AccountRecord, ActionRecord, AuditLogRecord, ClassificationRecord, StoredMessage } from './schema.js';
import type { SignalboxDatabase } from './db.js';

type AccountRow = {
  id: string;
  email: string;
  display_name: string | null;
  sync_state: AccountRecord['syncState'];
  connected_at: string;
  last_sync_at: string | null;
};

type MessageRow = {
  id: string;
  account_id: string;
  gmail_message_id: string;
  gmail_thread_id: string;
  sender: string;
  recipients: string;
  subject: string;
  snippet: string;
  received_at: string;
  labels_json: string;
  headers_json: string;
  created_at: string;
  updated_at: string;
};

type AuditLogRow = {
  id: string;
  account_id: string;
  message_id: string | null;
  action: AuditLogRecord['action'];
  automatic: 0 | 1;
  reason: string;
  created_at: string;
};

type ClassificationRow = {
  id: string;
  message_id: string;
  category: ClassificationRecord['category'];
  importance: ClassificationRecord['importance'];
  recommended_action: ClassificationRecord['recommendedAction'];
  confidence: number;
  reason: string;
  source: ClassificationRecord['source'];
  created_at: string;
};

type ActionRow = {
  id: string;
  message_id: string;
  action: ActionRecord['action'];
  status: ActionRecord['status'];
  automatic: 0 | 1;
  reason: string;
  created_at: string;
};

type DecisionRow = {
  id: string;
  account_email: string;
  sender: string;
  subject: string;
  category: MessageDecision['category'];
  confidence: number;
  recommended_action: MessageDecision['recommendedAction'];
  action_status: MessageDecision['actionStatus'] | null;
  reason: string;
  received_at: string;
};

export class SignalboxRepository {
  constructor(private readonly database: SignalboxDatabase) {}

  upsertAccount(account: AccountRecord): void {
    this.prepare(
      `INSERT INTO accounts (id, email, display_name, sync_state, connected_at, last_sync_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         display_name = excluded.display_name,
         sync_state = excluded.sync_state,
         last_sync_at = excluded.last_sync_at`
    ).run(account.id, account.email, account.displayName, account.syncState, account.connectedAt, account.lastSyncAt);
  }

  listAccounts(): AccountRecord[] {
    return this.prepare('SELECT * FROM accounts ORDER BY connected_at ASC')
      .all()
      .map((row) => mapAccountRow(row as AccountRow));
  }

  deleteAccountByEmail(email: string): void {
    this.prepare('DELETE FROM accounts WHERE email = ?').run(email);
  }

  getAccountByEmail(email: string): AccountRecord | null {
    const row = this.prepare('SELECT * FROM accounts WHERE email = ?').get(email);
    return row ? mapAccountRow(row as AccountRow) : null;
  }

  getAccountById(id: string): AccountRecord | null {
    const row = this.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
    return row ? mapAccountRow(row as AccountRow) : null;
  }

  upsertMessage(message: StoredMessage): void {
    this.prepare(
      `INSERT INTO messages (
         id, account_id, gmail_message_id, gmail_thread_id, sender, recipients,
         subject, snippet, received_at, labels_json, headers_json, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id, gmail_message_id) DO UPDATE SET
         gmail_thread_id = excluded.gmail_thread_id,
         sender = excluded.sender,
         recipients = excluded.recipients,
         subject = excluded.subject,
         snippet = excluded.snippet,
         received_at = excluded.received_at,
         labels_json = excluded.labels_json,
         headers_json = excluded.headers_json,
         updated_at = excluded.updated_at`
    ).run(
      message.id,
      message.accountId,
      message.gmailMessageId,
      message.gmailThreadId,
      message.sender,
      message.recipients,
      message.subject,
      message.snippet,
      message.receivedAt,
      JSON.stringify(message.labels),
      JSON.stringify(message.headers),
      message.createdAt,
      message.updatedAt
    );
  }

  listMessages(): StoredMessage[] {
    return this.prepare('SELECT * FROM messages ORDER BY received_at DESC')
      .all()
      .map((row) => mapMessageRow(row as MessageRow));
  }

  getMessageById(id: string): StoredMessage | null {
    const row = this.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    return row ? mapMessageRow(row as MessageRow) : null;
  }

  upsertClassification(classification: ClassificationRecord): void {
    this.prepare(
      `INSERT INTO classifications (
         id, message_id, category, importance, recommended_action, confidence, reason, source, created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(message_id, source) DO UPDATE SET
         category = excluded.category,
         importance = excluded.importance,
         recommended_action = excluded.recommended_action,
         confidence = excluded.confidence,
         reason = excluded.reason,
         created_at = excluded.created_at`
    ).run(
      classification.id,
      classification.messageId,
      classification.category,
      classification.importance,
      classification.recommendedAction,
      classification.confidence,
      classification.reason,
      classification.source,
      classification.createdAt
    );
  }

  listClassifications(): ClassificationRecord[] {
    return this.prepare('SELECT * FROM classifications ORDER BY created_at ASC')
      .all()
      .map((row) => mapClassificationRow(row as ClassificationRow));
  }

  upsertAction(action: ActionRecord): void {
    this.prepare(
      `INSERT INTO actions (id, message_id, action, status, automatic, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(message_id, action) DO UPDATE SET
         status = excluded.status,
         automatic = excluded.automatic,
         reason = excluded.reason,
         created_at = excluded.created_at`
    ).run(action.id, action.messageId, action.action, action.status, action.automatic ? 1 : 0, action.reason, action.createdAt);
  }

  listActions(): ActionRecord[] {
    return this.prepare('SELECT * FROM actions ORDER BY created_at ASC')
      .all()
      .map((row) => mapActionRow(row as ActionRow));
  }

  updateActionStatus(id: string, status: ActionRecord['status'], updatedAt: string): void {
    this.prepare('UPDATE actions SET status = ?, created_at = ? WHERE id = ?').run(status, updatedAt, id);
  }

  listDecisionRows(): MessageDecision[] {
    return this.prepare(
      `SELECT
         messages.id,
         accounts.email AS account_email,
         messages.sender,
         messages.subject,
         COALESCE(classifications.category, 'unknown') AS category,
         COALESCE(classifications.confidence, 0) AS confidence,
         COALESCE(classifications.recommended_action, 'review') AS recommended_action,
         actions.status AS action_status,
         COALESCE(classifications.reason, 'No classification available.') AS reason,
         messages.received_at
       FROM messages
       JOIN accounts ON accounts.id = messages.account_id
       LEFT JOIN classifications ON classifications.message_id = messages.id AND classifications.source = 'rules'
       LEFT JOIN actions ON actions.message_id = messages.id
       ORDER BY messages.received_at DESC
       LIMIT 100`
    )
      .all()
      .map((row) => mapDecisionRow(row as DecisionRow));
  }

  appendAuditLog(entry: AuditLogRecord): void {
    this.prepare(
      `INSERT INTO audit_log (id, account_id, message_id, action, automatic, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(entry.id, entry.accountId, entry.messageId, entry.action, entry.automatic ? 1 : 0, entry.reason, entry.createdAt);
  }

  listAuditLog(): AuditLogRecord[] {
    return this.prepare('SELECT * FROM audit_log ORDER BY created_at ASC')
      .all()
      .map((row) => mapAuditLogRow(row as AuditLogRow));
  }

  upsertSetting(key: string, value: unknown): void {
    this.prepare(
      `INSERT INTO settings (key, value_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value_json = excluded.value_json,
         updated_at = excluded.updated_at`
    ).run(key, JSON.stringify(value), new Date().toISOString());
  }

  getSetting<T>(key: string): T | null {
    const row = this.prepare('SELECT value_json FROM settings WHERE key = ?').get(key) as { value_json: string } | undefined;
    return row ? (JSON.parse(row.value_json) as T) : null;
  }

  private prepare(sql: string): StatementSync {
    return this.database.prepare(sql);
  }
}

function mapAccountRow(row: AccountRow): AccountRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    syncState: row.sync_state,
    connectedAt: row.connected_at,
    lastSyncAt: row.last_sync_at
  };
}

function mapMessageRow(row: MessageRow): StoredMessage {
  return {
    id: row.id,
    accountId: row.account_id,
    gmailMessageId: row.gmail_message_id,
    gmailThreadId: row.gmail_thread_id,
    sender: row.sender,
    recipients: row.recipients,
    subject: row.subject,
    snippet: row.snippet,
    receivedAt: row.received_at,
    labels: JSON.parse(row.labels_json) as string[],
    headers: JSON.parse(row.headers_json) as StoredMessage['headers'],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAuditLogRow(row: AuditLogRow): AuditLogRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    messageId: row.message_id,
    action: row.action,
    automatic: row.automatic === 1,
    reason: row.reason,
    createdAt: row.created_at
  };
}

function mapClassificationRow(row: ClassificationRow): ClassificationRecord {
  return {
    id: row.id,
    messageId: row.message_id,
    category: row.category,
    importance: row.importance,
    recommendedAction: row.recommended_action,
    confidence: row.confidence,
    reason: row.reason,
    source: row.source,
    createdAt: row.created_at
  };
}

function mapActionRow(row: ActionRow): ActionRecord {
  return {
    id: row.id,
    messageId: row.message_id,
    action: row.action,
    status: row.status,
    automatic: row.automatic === 1,
    reason: row.reason,
    createdAt: row.created_at
  };
}

function mapDecisionRow(row: DecisionRow): MessageDecision {
  return {
    id: row.id,
    account: row.account_email,
    sender: row.sender,
    subject: row.subject,
    category: row.category,
    confidence: row.confidence,
    recommendedAction: row.recommended_action,
    actionStatus: row.action_status ?? undefined,
    reason: row.reason,
    receivedAt: row.received_at
  };
}
