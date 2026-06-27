import type { GmailOAuthTokens, TokenStore } from './tokenStore.js';

export class InMemoryTokenStore implements TokenStore {
  private readonly tokensByEmail = new Map<string, GmailOAuthTokens>();

  async saveTokens(email: string, tokens: GmailOAuthTokens): Promise<void> {
    this.tokensByEmail.set(email, tokens);
  }

  async getTokens(email: string): Promise<GmailOAuthTokens | null> {
    return this.tokensByEmail.get(email) ?? null;
  }

  async deleteTokens(email: string): Promise<void> {
    this.tokensByEmail.delete(email);
  }
}
