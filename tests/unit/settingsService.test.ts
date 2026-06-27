import { afterEach, describe, expect, it } from 'vitest';
import { InMemorySecretStore } from '../../src/worker/settings/inMemorySecretStore';
import { SettingsService } from '../../src/worker/settings/settingsService';
import { createInMemoryDatabase, initializeSchema } from '../../src/worker/storage/db';
import { SignalboxRepository } from '../../src/worker/storage/repositories';

const openDatabases: ReturnType<typeof createInMemoryDatabase>[] = [];

function createService() {
  const db = createInMemoryDatabase();
  openDatabases.push(db);
  initializeSchema(db);
  const repository = new SignalboxRepository(db);
  const secretStore = new InMemorySecretStore();
  const service = new SettingsService(repository, secretStore);
  return { secretStore, service };
}

afterEach(() => {
  for (const db of openDatabases.splice(0)) {
    db.close();
  }
});

describe('SettingsService', () => {
  it('returns conservative default settings', async () => {
    const { service } = createService();

    await expect(service.getSettings()).resolves.toEqual({
      googleOAuth: {
        clientId: '',
        redirectUri: 'http://127.0.0.1:49327/oauth/google/callback',
        hasClientSecret: false
      },
      ollama: {
        enabled: false,
        baseUrl: 'http://127.0.0.1:11434',
        model: 'llama3.1'
      }
    });
  });

  it('saves non-secret settings and stores Google client secret separately', async () => {
    const { secretStore, service } = createService();

    await service.saveSettings({
      googleOAuth: {
        clientId: 'google-client-id',
        clientSecret: 'google-client-secret',
        redirectUri: 'http://127.0.0.1:49327/oauth/google/callback'
      },
      ollama: {
        enabled: true,
        baseUrl: 'http://localhost:11434',
        model: 'mistral'
      }
    });

    await expect(service.getSettings()).resolves.toEqual({
      googleOAuth: {
        clientId: 'google-client-id',
        redirectUri: 'http://127.0.0.1:49327/oauth/google/callback',
        hasClientSecret: true
      },
      ollama: {
        enabled: true,
        baseUrl: 'http://localhost:11434',
        model: 'mistral'
      }
    });
    await expect(secretStore.getSecret('googleOAuth.clientSecret')).resolves.toBe('google-client-secret');
  });

  it('preserves existing Google client secret when save omits it', async () => {
    const { secretStore, service } = createService();
    await secretStore.saveSecret('googleOAuth.clientSecret', 'existing-secret');

    await service.saveSettings({
      googleOAuth: {
        clientId: 'updated-client-id',
        redirectUri: 'http://127.0.0.1:49327/oauth/google/callback'
      },
      ollama: {
        enabled: false,
        baseUrl: 'http://127.0.0.1:11434',
        model: 'llama3.1'
      }
    });

    await expect(secretStore.getSecret('googleOAuth.clientSecret')).resolves.toBe('existing-secret');
    await expect(service.getGoogleOAuthConfig()).resolves.toEqual({
      clientId: 'updated-client-id',
      clientSecret: 'existing-secret',
      redirectUri: 'http://127.0.0.1:49327/oauth/google/callback',
      port: 49327
    });
  });
});
