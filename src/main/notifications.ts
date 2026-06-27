import { BrowserWindow, Notification } from 'electron';

export function showImportantNotification(window: BrowserWindow | null, title = 'Important email detected'): void {
  if (!Notification.isSupported()) {
    return;
  }

  const notification = new Notification({
    title,
    body: 'Signalbox found a message that may need your attention.',
    silent: false
  });

  notification.on('click', () => {
    window?.show();
    window?.focus();
  });

  notification.show();
}
