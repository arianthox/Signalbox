import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron';
import { showImportantNotification } from './notifications.js';
import type { SignalboxStatus } from '../shared/types.js';

type TrayOptions = {
  getWindow: () => BrowserWindow | null;
  getStatus: () => SignalboxStatus;
  onSyncNow: () => void;
  onToggleAutomation: () => void;
};

let tray: Tray | null = null;

export function createSignalboxTray(options: TrayOptions): Tray {
  const icon = nativeImage.createFromDataURL(
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><rect x="2" y="3" width="14" height="12" rx="3" fill="%231f2937"/><path d="M4 6.2 9 10l5-3.8" fill="none" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  );

  tray = new Tray(icon);
  updateTrayMenu(options);
  return tray;
}

export function updateTrayMenu(options: TrayOptions): void {
  if (!tray) {
    return;
  }

  const status = options.getStatus();
  tray.setToolTip(`Signalbox - ${status.automationState} - ${status.reviewRequired} need review`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Open Dashboard',
        click: () => {
          const window = options.getWindow();
          window?.show();
          window?.focus();
        }
      },
      {
        label: 'Sync Now',
        click: options.onSyncNow
      },
      {
        label: status.automationState === 'running' ? 'Pause Automation' : 'Resume Automation',
        click: options.onToggleAutomation
      },
      { type: 'separator' },
      {
        label: 'Test Notification',
        click: () => showImportantNotification(options.getWindow(), 'Signalbox test notification')
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit()
      }
    ])
  );
}
