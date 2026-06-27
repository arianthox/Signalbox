import type { AccountRecord } from '../storage/schema.js';
import type { AccountService } from '../accounts/accountService.js';
import type { GmailOAuthTokens } from '../accounts/tokenStore.js';

export const GMAIL_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels'
] as const;

export type GmailProfile = {
  email: string;
  displayName: string | null;
};

export interface GoogleOAuthGateway {
  getAuthorizationUrl(input: { state: string; scopes: string[] }): string;
  exchangeCode(code: string): Promise<GmailOAuthTokens>;
  fetchProfile(tokens: GmailOAuthTokens): Promise<GmailProfile>;
}

export type GmailOAuthServiceOptions = {
  createAccountId?: (email: string) => string;
  now?: () => string;
};

export class GmailOAuthService {
  private readonly createAccountId: (email: string) => string;
  private readonly now: () => string;

  constructor(
    private readonly accountService: AccountService,
    private readonly gateway: GoogleOAuthGateway,
    options: GmailOAuthServiceOptions = {}
  ) {
    this.createAccountId = options.createAccountId ?? createDefaultAccountId;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  createAuthorizationRequest(state: string): { state: string; url: string } {
    return {
      state,
      url: this.gateway.getAuthorizationUrl({
        state,
        scopes: [...GMAIL_OAUTH_SCOPES]
      })
    };
  }

  async completeAuthorization(code: string): Promise<AccountRecord> {
    const tokens = await this.gateway.exchangeCode(code);
    const profile = await this.gateway.fetchProfile(tokens);

    return this.accountService.connectAccount({
      id: this.createAccountId(profile.email),
      email: profile.email,
      displayName: profile.displayName,
      connectedAt: this.now(),
      tokens
    });
  }
}

function createDefaultAccountId(email: string): string {
  return `acct_${email.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;
}
