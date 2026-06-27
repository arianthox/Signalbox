import { afterEach, describe, expect, it } from 'vitest';
import { AccountService } from '../../src/worker/accounts/accountService';
import { InMemoryTokenStore } from '../../src/worker/accounts/inMemoryTokenStore';
import { GmailOAuthService, type GoogleOAuthGateway } from '../../src/worker/gmail/oauthService';
import { createInMemoryDatabase, initializeSchema } from '../../src/worker/storage/db';
import { SignalboxRepository } from '../../src/worker/storage/repositories';

const openDatabases: ReturnType<typeof createInMemoryDatabase>[] = [];

class FakeGoogleOAuthGateway implements GoogleOAuthGateway {
  lastAuthRequest: { state: string; scopes: string[] } | null = null;
  lastExchangeCode: string | null = null;

  getAuthorizationUrl(input: { state: string; scopes: string[] }): string {
    this.lastAuthRequest = input;
    return `https://accounts.google.com/o/oauth2/v2/auth?state=${input.state}`;
  }

  async exchangeCode(code: string) {
    this.lastExchangeCode = code;
    return {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiryDate: 1782486000000,
      scope: 'https://www.googleapis.com/auth/gmail.modify',
      tokenType: 'Bearer'
    };
  }

  async fetchProfile() {
    return {
      email: 'personal@gmail.com',
      displayName: 'Personal Gmail'
    };
  }
}

function createOAuthService() {
  const db = createInMemoryDatabase();
  openDatabases.push(db);
  initializeSchema(db);
  const repository = new SignalboxRepository(db);
  const tokenStore = new InMemoryTokenStore();
  const accountService = new AccountService(repository, tokenStore);
  const gateway = new FakeGoogleOAuthGateway();
  const service = new GmailOAuthService(accountService, gateway, {
    createAccountId: (email) => `acct_${email.replace(/[^a-z0-9]/gi, '_')}`,
    now: () => '2026-06-26T15:00:00.000Z'
  });

  return { gateway, repository, service, tokenStore };
}

afterEach(() => {
  for (const db of openDatabases.splice(0)) {
    db.close();
  }
});

describe('GmailOAuthService', () => {
  it('creates a Gmail consent URL with required scopes', () => {
    const { gateway, service } = createOAuthService();

    const authorization = service.createAuthorizationRequest('state_123');

    expect(authorization.url).toBe('https://accounts.google.com/o/oauth2/v2/auth?state=state_123');
    expect(authorization.state).toBe('state_123');
    expect(gateway.lastAuthRequest).toEqual({
      state: 'state_123',
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.labels'
      ]
    });
  });

  it('exchanges callback code and connects the Gmail account', async () => {
    const { gateway, repository, service, tokenStore } = createOAuthService();

    const account = await service.completeAuthorization('oauth-code');

    expect(gateway.lastExchangeCode).toBe('oauth-code');
    expect(account).toEqual({
      id: 'acct_personal_gmail_com',
      email: 'personal@gmail.com',
      displayName: 'Personal Gmail',
      syncState: 'idle',
      connectedAt: '2026-06-26T15:00:00.000Z',
      lastSyncAt: null
    });
    expect(repository.listAccounts()).toEqual([account]);
    await expect(tokenStore.getTokens('personal@gmail.com')).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiryDate: 1782486000000,
      scope: 'https://www.googleapis.com/auth/gmail.modify',
      tokenType: 'Bearer'
    });
  });
});
