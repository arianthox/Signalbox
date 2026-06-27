import keytar from 'keytar';
import type { GmailOAuthTokens, TokenStore } from './tokenStore.js';

const SERVICE_NAME = 'Signalbox Gmail OAuth';

export class KeychainTokenStore implements TokenStore {
  async saveTokens(email: string, tokens: GmailOAuthTokens): Promise<void> {
    await keytar.setPassword(SERVICE_NAME, email, JSON.stringify(tokens));
  }

  async getTokens(email: string): Promise<GmailOAuthTokens | null> {
    const rawTokens = await keytar.getPassword(SERVICE_NAME, email);
    if (!rawTokens) {
      return null;
    }

    return JSON.parse(rawTokens) as GmailOAuthTokens;
  }

  async deleteTokens(email: string): Promise<void> {
    await keytar.deletePassword(SERVICE_NAME, email);
  }
}
