import type { GmailOAuthTokens, TokenStore } from '../accounts/tokenStore.js';
import type { SignalboxRepository } from '../storage/repositories.js';
import type { ActionRecord, StoredMessage } from '../storage/schema.js';

export interface GmailActionGateway {
  archiveMessage(input: { accountEmail: string; gmailMessageId: string; tokens: GmailOAuthTokens }): Promise<void>;
}

export interface NotificationGateway {
  notifyImportantMessage(input: { sender: string; subject: string; message: StoredMessage }): Promise<void>;
}

export type ActionApplyResult = {
  applied: number;
  skipped: number;
  failed: number;
};

export type ActionApplierOptions = {
  now?: () => string;
};

export class ActionApplier {
  private readonly now: () => string;

  constructor(
    private readonly repository: SignalboxRepository,
    private readonly tokenStore: TokenStore,
    private readonly gmailGateway: GmailActionGateway,
    private readonly notificationGateway: NotificationGateway,
    options: ActionApplierOptions = {}
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async applyPlannedActions(): Promise<ActionApplyResult> {
    const actions = this.repository.listActions();
    const result: ActionApplyResult = {
      applied: 0,
      skipped: 0,
      failed: 0
    };

    for (const action of actions) {
      if (action.status !== 'planned' || !action.automatic) {
        result.skipped += 1;
        continue;
      }

      try {
        const applied = await this.applyAction(action);
        if (applied) {
          result.applied += 1;
        } else {
          result.skipped += 1;
        }
      } catch {
        this.repository.updateActionStatus(action.id, 'failed', this.now());
        result.failed += 1;
      }
    }

    return result;
  }

  private async applyAction(action: ActionRecord): Promise<boolean> {
    const message = this.repository.getMessageById(action.messageId);
    if (!message) {
      return false;
    }

    const account = this.repository.getAccountById(message.accountId);
    if (!account) {
      return false;
    }

    if (action.action === 'alert') {
      await this.notificationGateway.notifyImportantMessage({
        sender: message.sender,
        subject: message.subject,
        message
      });
    } else if (action.action === 'archive') {
      const tokens = await this.tokenStore.getTokens(account.email);
      if (!tokens) {
        return false;
      }

      await this.gmailGateway.archiveMessage({
        accountEmail: account.email,
        gmailMessageId: message.gmailMessageId,
        tokens
      });
    } else {
      return false;
    }

    const appliedAt = this.now();
    this.repository.updateActionStatus(action.id, 'applied', appliedAt);
    this.repository.appendAuditLog({
      id: `audit_${action.id}`,
      accountId: message.accountId,
      messageId: message.id,
      action: action.action,
      automatic: action.automatic,
      reason: action.reason,
      createdAt: appliedAt
    });
    return true;
  }
}
