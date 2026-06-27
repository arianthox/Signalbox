import { BrowserWindow } from 'electron';
import type { NotificationGateway } from '../worker/actions/actionApplier.js';
import type { StoredMessage } from '../worker/storage/schema.js';
import { showImportantNotification } from './notifications.js';

export class ElectronNotificationGateway implements NotificationGateway {
  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  async notifyImportantMessage(input: { message: StoredMessage }): Promise<void> {
    showImportantNotification(this.getWindow(), `Important: ${input.message.subject}`);
  }
}
