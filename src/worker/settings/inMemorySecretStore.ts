import type { SecretStore } from './secretStore.js';

export class InMemorySecretStore implements SecretStore {
  private readonly secrets = new Map<string, string>();

  async saveSecret(key: string, value: string): Promise<void> {
    this.secrets.set(key, value);
  }

  async getSecret(key: string): Promise<string | null> {
    return this.secrets.get(key) ?? null;
  }

  async deleteSecret(key: string): Promise<void> {
    this.secrets.delete(key);
  }
}
