import { ipcMain } from 'electron';
import { DEFAULT_STATUS } from '../shared/constants.js';
import type { ConnectAccountResult, SaveSettingsInput, SignalboxStatus } from '../shared/types.js';
import { showImportantNotification } from './notifications.js';
import type { SignalboxRuntime } from './runtime.js';

let status: SignalboxStatus = { ...DEFAULT_STATUS };

export function getStatus(): SignalboxStatus {
  return status;
}

export function registerIpc(getWindow: () => Electron.BrowserWindow | null, onStatusChanged: () => void, runtime: SignalboxRuntime): void {
  ipcMain.handle('status:get', () => status);
  ipcMain.handle('accounts:list', () => runtime.listAccounts());
  ipcMain.handle('dashboard:get', () => runtime.getDashboard());
  ipcMain.handle('settings:get', () => runtime.getSettings());
  ipcMain.handle('settings:save', (_event, input: SaveSettingsInput) => runtime.saveSettings(input));

  ipcMain.handle('accounts:connect-google', async (): Promise<ConnectAccountResult> => {
    try {
      const account = await runtime.connectGoogleAccount();
      status = {
        ...status,
        connectedAccounts: runtime.listAccounts().length
      };
      onStatusChanged();
      return {
        ok: true,
        account
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to connect Gmail account.'
      };
    }
  });

  ipcMain.handle('sync:now', () => {
    void runtime
      .syncRecentMessages()
      .then(() => runtime.applyPlannedActions())
      .catch((error) => {
      console.error('Signalbox sync failed:', error);
      });
    status = {
      ...status,
      lastSyncLabel: 'just now'
    };
    onStatusChanged();
    return status;
  });

  ipcMain.handle('automation:toggle', () => {
    status = {
      ...status,
      automationState: status.automationState === 'running' ? 'paused' : 'running'
    };
    onStatusChanged();
    return status;
  });

  ipcMain.handle('notification:test', () => {
    showImportantNotification(getWindow(), 'Signalbox test notification');
  });
}
