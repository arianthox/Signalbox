import { google } from 'googleapis';
import type { GmailOAuthTokens } from '../accounts/tokenStore.js';
import type { GmailActionGateway } from '../actions/actionApplier.js';
import type { RawGmailMessage } from './normalize.js';
import type { GmailGateway } from './sync.js';

export class GoogleApisGmailGateway implements GmailGateway, GmailActionGateway {
  async listRecentMessages(input: { tokens: GmailOAuthTokens; maxResults: number }): Promise<RawGmailMessage[]> {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: input.tokens.accessToken,
      refresh_token: input.tokens.refreshToken,
      expiry_date: input.tokens.expiryDate,
      scope: input.tokens.scope,
      token_type: input.tokens.tokenType
    });

    const gmail = google.gmail({ version: 'v1', auth });
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults: input.maxResults
    });

    const messageRefs = listResponse.data.messages ?? [];
    const messages = await Promise.all(
      messageRefs
        .filter((message): message is { id: string; threadId?: string | null } => Boolean(message.id))
        .map(async (message) => {
          const response = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'List-Unsubscribe', 'Auto-Submitted']
          });

          return response.data as RawGmailMessage;
        })
    );

    return messages;
  }

  async archiveMessage(input: { gmailMessageId: string; tokens: GmailOAuthTokens }): Promise<void> {
    const auth = createOAuthClient(input.tokens);
    const gmail = google.gmail({ version: 'v1', auth });
    await gmail.users.messages.modify({
      userId: 'me',
      id: input.gmailMessageId,
      requestBody: {
        removeLabelIds: ['INBOX']
      }
    });
  }
}

function createOAuthClient(tokens: GmailOAuthTokens) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
    scope: tokens.scope,
    token_type: tokens.tokenType
  });
  return auth;
}
