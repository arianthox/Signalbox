import type { AppSettings, SaveSettingsInput } from '../../shared/types.js';
import type { SignalboxRepository } from '../storage/repositories.js';
import type { SecretStore } from './secretStore.js';

const GOOGLE_CLIENT_SECRET_KEY = 'googleOAuth.clientSecret';
const GOOGLE_OAUTH_KEY = 'settings.googleOAuth';
const OLLAMA_KEY = 'settings.ollama';

const DEFAULT_REDIRECT_URI = 'http://127.0.0.1:49327/oauth/google/callback';

const DEFAULT_SETTINGS: AppSettings = {
  googleOAuth: {
    clientId: '',
    redirectUri: DEFAULT_REDIRECT_URI,
    hasClientSecret: false
  },
  ollama: {
    enabled: false,
    baseUrl: 'http://127.0.0.1:11434',
    model: 'llama3.1'
  }
};

export class SettingsService {
  constructor(
    private readonly repository: SignalboxRepository,
    private readonly secretStore: SecretStore
  ) {}

  async getSettings(): Promise<AppSettings> {
    const googleOAuth = this.repository.getSetting<Omit<AppSettings['googleOAuth'], 'hasClientSecret'>>(GOOGLE_OAUTH_KEY) ?? {
      clientId: DEFAULT_SETTINGS.googleOAuth.clientId,
      redirectUri: DEFAULT_SETTINGS.googleOAuth.redirectUri
    };
    const ollama = this.repository.getSetting<AppSettings['ollama']>(OLLAMA_KEY) ?? DEFAULT_SETTINGS.ollama;
    const clientSecret = await this.secretStore.getSecret(GOOGLE_CLIENT_SECRET_KEY);

    return {
      googleOAuth: {
        clientId: googleOAuth.clientId,
        redirectUri: googleOAuth.redirectUri,
        hasClientSecret: Boolean(clientSecret)
      },
      ollama
    };
  }

  async saveSettings(input: SaveSettingsInput): Promise<AppSettings> {
    this.repository.upsertSetting(GOOGLE_OAUTH_KEY, {
      clientId: input.googleOAuth.clientId,
      redirectUri: input.googleOAuth.redirectUri
    });
    this.repository.upsertSetting(OLLAMA_KEY, input.ollama);

    if (input.googleOAuth.clientSecret && input.googleOAuth.clientSecret.trim().length > 0) {
      await this.secretStore.saveSecret(GOOGLE_CLIENT_SECRET_KEY, input.googleOAuth.clientSecret);
    }

    return this.getSettings();
  }

  async getGoogleOAuthConfig(): Promise<{ clientId: string; clientSecret: string; redirectUri: string; port: number } | null> {
    const settings = await this.getSettings();
    const clientSecret = await this.secretStore.getSecret(GOOGLE_CLIENT_SECRET_KEY);
    if (!settings.googleOAuth.clientId || !clientSecret) {
      return null;
    }

    return {
      clientId: settings.googleOAuth.clientId,
      clientSecret,
      redirectUri: settings.googleOAuth.redirectUri,
      port: Number(new URL(settings.googleOAuth.redirectUri).port || 49327)
    };
  }
}
