import type { AccountRecord } from '../storage/schema.js';
import type { SignalboxRepository } from '../storage/repositories.js';
import type { GmailOAuthTokens, TokenStore } from './tokenStore.js';

export type ConnectAccountInput = {
  id: string;
  email: string;
  displayName: string | null;
  connectedAt: string;
  tokens: GmailOAuthTokens;
};

export class AccountService {
  constructor(
    private readonly repository: SignalboxRepository,
    private readonly tokenStore: TokenStore
  ) {}

  async connectAccount(input: ConnectAccountInput): Promise<AccountRecord> {
    await this.tokenStore.saveTokens(input.email, input.tokens);

    const account: AccountRecord = {
      id: input.id,
      email: input.email,
      displayName: input.displayName,
      syncState: 'idle',
      connectedAt: input.connectedAt,
      lastSyncAt: null
    };

    this.repository.upsertAccount(account);
    return account;
  }

  async removeAccount(email: string): Promise<void> {
    this.repository.deleteAccountByEmail(email);
    await this.tokenStore.deleteTokens(email);
  }
}
