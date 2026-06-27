export type GmailOAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  scope: string;
  tokenType: string;
};

export interface TokenStore {
  saveTokens(email: string, tokens: GmailOAuthTokens): Promise<void>;
  getTokens(email: string): Promise<GmailOAuthTokens | null>;
  deleteTokens(email: string): Promise<void>;
}
