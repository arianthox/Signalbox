export type RawGmailMessage = {
  id?: string | null;
  threadId?: string | null;
  labelIds?: string[] | null;
  snippet?: string | null;
  internalDate?: string | null;
  payload?: {
    headers?: Array<{
      name?: string | null;
      value?: string | null;
    }> | null;
  } | null;
};

export type NormalizedGmailMessage = {
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
};

export function normalizeGmailMessage(message: RawGmailMessage): NormalizedGmailMessage {
  const headers = new Map(
    (message.payload?.headers ?? []).map((header) => [(header.name ?? '').toLowerCase(), header.value ?? ''])
  );

  return {
    gmailMessageId: message.id ?? '',
    gmailThreadId: message.threadId ?? '',
    sender: headers.get('from') ?? '',
    recipients: headers.get('to') ?? '',
    subject: headers.get('subject') ?? '',
    snippet: message.snippet ?? '',
    receivedAt: new Date(Number(message.internalDate ?? 0)).toISOString(),
    labels: message.labelIds ?? [],
    headers: {
      autoSubmitted: headers.has('auto-submitted') && (headers.get('auto-submitted') ?? '').toLowerCase() !== 'no',
      listUnsubscribe: headers.has('list-unsubscribe')
    }
  };
}
