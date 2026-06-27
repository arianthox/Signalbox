import { contextBridge, ipcRenderer } from 'electron';
import type { AccountSummary, AppSettings, ConnectAccountResult, DashboardData, SaveSettingsInput, SignalboxStatus } from '../shared/types.js';

const api = {
  getStatus: (): Promise<SignalboxStatus> => ipcRenderer.invoke('status:get'),
  getDashboard: (): Promise<DashboardData> => ipcRenderer.invoke('dashboard:get'),
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (input: SaveSettingsInput): Promise<AppSettings> => ipcRenderer.invoke('settings:save', input),
  listAccounts: (): Promise<AccountSummary[]> => ipcRenderer.invoke('accounts:list'),
  connectGoogleAccount: (): Promise<ConnectAccountResult> => ipcRenderer.invoke('accounts:connect-google'),
  syncNow: (): Promise<SignalboxStatus> => ipcRenderer.invoke('sync:now'),
  toggleAutomation: (): Promise<SignalboxStatus> => ipcRenderer.invoke('automation:toggle'),
  testNotification: (): Promise<void> => ipcRenderer.invoke('notification:test')
};

contextBridge.exposeInMainWorld('signalbox', api);

export type SignalboxApi = typeof api;
