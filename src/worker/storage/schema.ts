export type AccountRecord = {
  id: string;
  email: string;
  displayName: string | null;
  syncState: 'idle' | 'syncing' | 'error';
  connectedAt: string;
  lastSyncAt: string | null;
};

export type StoredMessage = {
  id: string;
  accountId: string;
  gmailMessageId: string;
  gmailThreadId: string;
  sender: string;
  recipients: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  labels: string[];
  headers: {
    autoSubmitted: boolean;
    listUnsubscribe: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type AuditLogRecord = {
  id: string;
  accountId: string;
  messageId: string | null;
  action: 'alert' | 'archive' | 'label' | 'review' | 'mark_read' | 'pending_delete';
  automatic: boolean;
  reason: string;
  createdAt: string;
};

export type ClassificationRecord = {
  id: string;
  messageId: string;
  category: 'important' | 'newsletter' | 'promotion' | 'notification' | 'security' | 'unknown';
  importance: 'low' | 'medium' | 'high';
  recommendedAction: 'alert' | 'archive' | 'label' | 'review';
  confidence: number;
  reason: string;
  source: 'rules' | 'ollama';
  createdAt: string;
};

export type ActionRecord = {
  id: string;
  messageId: string;
  action: 'alert' | 'archive' | 'label' | 'review' | 'mark_read' | 'pending_delete';
  status: 'planned' | 'pending_review' | 'applied' | 'failed';
  automatic: boolean;
  reason: string;
  createdAt: string;
};

export const schemaSql = `
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  sync_state TEXT NOT NULL,
  connected_at TEXT NOT NULL,
  last_sync_at TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  gmail_message_id TEXT NOT NULL,
  gmail_thread_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  recipients TEXT NOT NULL,
  subject TEXT NOT NULL,
  snippet TEXT NOT NULL,
  received_at TEXT NOT NULL,
  labels_json TEXT NOT NULL,
  headers_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(account_id, gmail_message_id)
);

CREATE TABLE IF NOT EXISTS classifications (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  category TEXT NOT NULL,
  importance TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  confidence REAL NOT NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(message_id, source)
);

CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  automatic INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(message_id, action)
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sender_preferences (
  id TEXT PRIMARY KEY,
  sender TEXT NOT NULL UNIQUE,
  preference TEXT NOT NULL,
  confidence_boost REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  message_id TEXT,
  action TEXT NOT NULL,
  automatic INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;
