import { describe, expect, it } from 'vitest';
import { parseOAuthCallbackUrl } from '../../src/main/oauthCallback';

describe('parseOAuthCallbackUrl', () => {
  it('extracts the authorization code when state matches', () => {
    expect(parseOAuthCallbackUrl('/oauth/google/callback?code=oauth-code&state=state_123', 'state_123')).toEqual({
      ok: true,
      code: 'oauth-code'
    });
  });

  it('rejects callbacks with the wrong state', () => {
    expect(parseOAuthCallbackUrl('/oauth/google/callback?code=oauth-code&state=wrong_state', 'state_123')).toEqual({
      ok: false,
      error: 'OAuth state did not match.'
    });
  });

  it('rejects callbacks without a code', () => {
    expect(parseOAuthCallbackUrl('/oauth/google/callback?state=state_123', 'state_123')).toEqual({
      ok: false,
      error: 'OAuth callback did not include a code.'
    });
  });
});
