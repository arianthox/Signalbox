import { google } from 'googleapis';
import type { GmailOAuthTokens } from '../accounts/tokenStore.js';
import type { GmailProfile, GoogleOAuthGateway } from './oauthService.js';

export type GoogleOAuthGatewayConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export class GoogleApisOAuthGateway implements GoogleOAuthGateway {
  private readonly client;

  constructor(config: GoogleOAuthGatewayConfig) {
    this.client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  }

  getAuthorizationUrl(input: { state: string; scopes: string[] }): string {
    return this.client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: input.scopes,
      state: input.state
    });
  }

  async exchangeCode(code: string): Promise<GmailOAuthTokens> {
    const { tokens } = await this.client.getToken(code);
    this.client.setCredentials(tokens);

    if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date || !tokens.scope || !tokens.token_type) {
      throw new Error('Google OAuth response did not include the required token fields.');
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      scope: tokens.scope,
      tokenType: tokens.token_type
    };
  }

  async fetchProfile(tokens: GmailOAuthTokens): Promise<GmailProfile> {
    this.client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiryDate,
      scope: tokens.scope,
      token_type: tokens.tokenType
    });

    const gmail = google.gmail({ version: 'v1', auth: this.client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const email = profile.data.emailAddress;

    if (!email) {
      throw new Error('Gmail profile did not include an email address.');
    }

    return {
      email,
      displayName: email
    };
  }
}
