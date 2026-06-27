import type { GmailOAuthTokens, TokenStore } from '../accounts/tokenStore.js';
import { decidePolicy } from '../policy/policyEngine.js';
import type { SignalboxRepository } from '../storage/repositories.js';
import type { AccountRecord } from '../storage/schema.js';
import { classifyWithRules } from '../classifier/rules.js';
import { normalizeGmailMessage, type RawGmailMessage } from './normalize.js';

export interface GmailGateway {
  listRecentMessages(input: { accountEmail: string; tokens: GmailOAuthTokens; maxResults: number }): Promise<RawGmailMessage[]>;
}

export type GmailSyncResult = {
  accountsChecked: number;
  messagesStored: number;
  accountsSkipped: number;
};

export type GmailSyncOptions = {
  maxResults?: number;
  createMessageId?: (accountId: string, gmailMessageId: string) => string;
  now?: () => string;
};

export class GmailSyncService {
  private readonly maxResults: number;
  private readonly createMessageId: (accountId: string, gmailMessageId: string) => string;
  private readonly now: () => string;

  constructor(
    private readonly repository: SignalboxRepository,
    private readonly tokenStore: TokenStore,
    private readonly gmailGateway: GmailGateway,
    options: GmailSyncOptions = {}
  ) {
    this.maxResults = options.maxResults ?? 25;
    this.createMessageId = options.createMessageId ?? createDefaultMessageId;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async syncRecentMessages(): Promise<GmailSyncResult> {
    const accounts = this.repository.listAccounts();
    let messagesStored = 0;
    let accountsSkipped = 0;

    for (const account of accounts) {
      const tokens = await this.tokenStore.getTokens(account.email);
      if (!tokens) {
        accountsSkipped += 1;
        continue;
      }

      messagesStored += await this.syncAccount(account, tokens);
    }

    return {
      accountsChecked: accounts.length,
      messagesStored,
      accountsSkipped
    };
  }

  private async syncAccount(account: AccountRecord, tokens: GmailOAuthTokens): Promise<number> {
    const syncedAt = this.now();
    const rawMessages = await this.gmailGateway.listRecentMessages({
      accountEmail: account.email,
      tokens,
      maxResults: this.maxResults
    });

    for (const rawMessage of rawMessages) {
      const message = normalizeGmailMessage(rawMessage);
      const storedMessage = {
        id: this.createMessageId(account.id, message.gmailMessageId),
        accountId: account.id,
        gmailMessageId: message.gmailMessageId,
        gmailThreadId: message.gmailThreadId,
        sender: message.sender,
        recipients: message.recipients,
        subject: message.subject,
        snippet: message.snippet,
        receivedAt: message.receivedAt,
        labels: message.labels,
        headers: message.headers,
        createdAt: syncedAt,
        updatedAt: syncedAt
      };
      this.repository.upsertMessage(storedMessage);

      const classification = classifyWithRules(storedMessage);
      const storedClassification = {
        id: `class_${storedMessage.id}_${classification.source}`,
        messageId: storedMessage.id,
        ...classification,
        createdAt: syncedAt
      };
      this.repository.upsertClassification(storedClassification);

      const policyAction = decidePolicy(storedClassification);
      this.repository.upsertAction({
        id: `action_${storedMessage.id}_${policyAction.action}`,
        messageId: storedMessage.id,
        ...policyAction,
        createdAt: syncedAt
      });
    }

    this.repository.upsertAccount({
      ...account,
      syncState: 'idle',
      lastSyncAt: syncedAt
    });

    return rawMessages.length;
  }
}

function createDefaultMessageId(accountId: string, gmailMessageId: string): string {
  return `${accountId}_${gmailMessageId}`;
}
