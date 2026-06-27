import keytar from 'keytar';
import type { SecretStore } from './secretStore.js';

const SERVICE_NAME = 'Signalbox Settings';

export class KeychainSecretStore implements SecretStore {
  async saveSecret(key: string, value: string): Promise<void> {
    await keytar.setPassword(SERVICE_NAME, key, value);
  }

  async getSecret(key: string): Promise<string | null> {
    return keytar.getPassword(SERVICE_NAME, key);
  }

  async deleteSecret(key: string): Promise<void> {
    await keytar.deletePassword(SERVICE_NAME, key);
  }
}
