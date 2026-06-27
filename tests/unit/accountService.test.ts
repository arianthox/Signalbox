import { afterEach, describe, expect, it } from 'vitest';
import { AccountService } from '../../src/worker/accounts/accountService';
import { InMemoryTokenStore } from '../../src/worker/accounts/inMemoryTokenStore';
import { createInMemoryDatabase, initializeSchema } from '../../src/worker/storage/db';
import { SignalboxRepository } from '../../src/worker/storage/repositories';

const openDatabases: ReturnType<typeof createInMemoryDatabase>[] = [];

function createService() {
  const db = createInMemoryDatabase();
  openDatabases.push(db);
  initializeSchema(db);
  const repository = new SignalboxRepository(db);
  const tokenStore = new InMemoryTokenStore();
  const service = new AccountService(repository, tokenStore);
  return { repository, service, tokenStore };
}

afterEach(() => {
  for (const db of openDatabases.splice(0)) {
    db.close();
  }
});

describe('AccountService', () => {
  it('stores Gmail tokens separately from account metadata', async () => {
    const { repository, service, tokenStore } = createService();

    await service.connectAccount({
      id: 'acct_personal',
      email: 'personal@gmail.com',
      displayName: 'Personal Gmail',
      connectedAt: '2026-06-26T14:00:00.000Z',
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiryDate: 1782486000000,
        scope: 'https://www.googleapis.com/auth/gmail.modify',
        tokenType: 'Bearer'
      }
    });

    expect(repository.listAccounts()).toEqual([
      {
        id: 'acct_personal',
        email: 'personal@gmail.com',
        displayName: 'Personal Gmail',
        syncState: 'idle',
        connectedAt: '2026-06-26T14:00:00.000Z',
        lastSyncAt: null
      }
    ]);
    await expect(tokenStore.getTokens('personal@gmail.com')).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiryDate: 1782486000000,
      scope: 'https://www.googleapis.com/auth/gmail.modify',
      tokenType: 'Bearer'
    });
  });

  it('removes account metadata and stored tokens together', async () => {
    const { repository, service, tokenStore } = createService();

    await service.connectAccount({
      id: 'acct_personal',
      email: 'personal@gmail.com',
      displayName: 'Personal Gmail',
      connectedAt: '2026-06-26T14:00:00.000Z',
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiryDate: 1782486000000,
        scope: 'https://www.googleapis.com/auth/gmail.modify',
        tokenType: 'Bearer'
      }
    });

    await service.removeAccount('personal@gmail.com');

    expect(repository.listAccounts()).toEqual([]);
    await expect(tokenStore.getTokens('personal@gmail.com')).resolves.toBeNull();
  });
});
