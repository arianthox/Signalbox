import { shell } from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs';
import type { BrowserWindow } from 'electron';
import { ActionApplier, type ActionApplyResult } from '../worker/actions/actionApplier.js';
import { AccountService } from '../worker/accounts/accountService.js';
import { KeychainTokenStore } from '../worker/accounts/keychainTokenStore.js';
import { GoogleApisOAuthGateway } from '../worker/gmail/googleOAuthGateway.js';
import { GoogleApisGmailGateway } from '../worker/gmail/googleGmailGateway.js';
import { GmailOAuthService } from '../worker/gmail/oauthService.js';
import { GmailSyncService, type GmailSyncResult } from '../worker/gmail/sync.js';
import { DashboardService } from '../worker/dashboard/dashboardService.js';
import { KeychainSecretStore } from '../worker/settings/keychainSecretStore.js';
import { SettingsService } from '../worker/settings/settingsService.js';
import { initializeSchema, openSignalboxDatabase } from '../worker/storage/db.js';
import { SignalboxRepository } from '../worker/storage/repositories.js';
import type { AccountSummary, AppSettings, DashboardData, SaveSettingsInput } from '../shared/types.js';
import { waitForOAuthCode } from './oauthCallback.js';
import { ElectronNotificationGateway } from './notificationGateway.js';

const DEFAULT_OAUTH_PORT = 49327;
const DEFAULT_REDIRECT_URI = `http://127.0.0.1:${DEFAULT_OAUTH_PORT}/oauth/google/callback`;

export type SignalboxRuntime = {
  listAccounts: () => AccountSummary[];
  getDashboard: () => DashboardData;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (input: SaveSettingsInput) => Promise<AppSettings>;
  connectGoogleAccount: () => Promise<AccountSummary>;
  syncRecentMessages: () => Promise<GmailSyncResult>;
  applyPlannedActions: () => Promise<ActionApplyResult>;
};

export function createSignalboxRuntime(userDataPath: string, getWindow: () => BrowserWindow | null): SignalboxRuntime {
  fs.mkdirSync(userDataPath, { recursive: true });

  const database = openSignalboxDatabase(userDataPath);
  initializeSchema(database);
  const repository = new SignalboxRepository(database);
  const tokenStore = new KeychainTokenStore();
  const accountService = new AccountService(repository, tokenStore);
  const gmailGateway = new GoogleApisGmailGateway();
  const syncService = new GmailSyncService(repository, tokenStore, gmailGateway);
  const actionApplier = new ActionApplier(repository, tokenStore, gmailGateway, new ElectronNotificationGateway(getWindow));
  const dashboardService = new DashboardService(repository);
  const settingsService = new SettingsService(repository, new KeychainSecretStore());

  return {
    listAccounts: () => repository.listAccounts(),
    getDashboard: () => dashboardService.getDashboard(),
    getSettings: () => settingsService.getSettings(),
    saveSettings: (input) => settingsService.saveSettings(input),
    connectGoogleAccount: async () => {
      const oauthConfig = (await settingsService.getGoogleOAuthConfig()) ?? readGoogleOAuthConfig();
      if (!oauthConfig) {
        throw new Error(
          'Google OAuth is not configured. Add a client ID and client secret in Settings before connecting Gmail.'
        );
      }

      const gateway = new GoogleApisOAuthGateway(oauthConfig);
      const oauthService = new GmailOAuthService(accountService, gateway);
      const state = crypto.randomUUID();
      const codePromise = waitForOAuthCode({
        expectedState: state,
        port: oauthConfig.port,
        timeoutMs: 120_000
      });
      const authorization = oauthService.createAuthorizationRequest(state);

      await shell.openExternal(authorization.url);
      const code = await codePromise;
      return oauthService.completeAuthorization(code);
    },
    syncRecentMessages: () => syncService.syncRecentMessages(),
    applyPlannedActions: () => actionApplier.applyPlannedActions()
  };
}

function readGoogleOAuthConfig(): { clientId: string; clientSecret: string; redirectUri: string; port: number } | null {
  const clientId = process.env.SIGNALBOX_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.SIGNALBOX_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }

  const redirectUri = process.env.SIGNALBOX_GOOGLE_REDIRECT_URI ?? DEFAULT_REDIRECT_URI;
  const port = Number(new URL(redirectUri).port || DEFAULT_OAUTH_PORT);
  return {
    clientId,
    clientSecret,
    redirectUri,
    port
  };
}
