import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStatus, registerIpc } from './ipc.js';
import { createSignalboxRuntime } from './runtime.js';
import { createSignalboxTray, updateTrayMenu } from './tray.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: 'Signalbox',
    backgroundColor: '#f8fafc',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.once('ready-to-show', () => window.show());

  window.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      window.hide();
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  return window;
}

app.whenReady().then(() => {
  mainWindow = createMainWindow();
  const runtime = createSignalboxRuntime(app.getPath('userData'), () => mainWindow);

  const trayOptions = {
    getWindow: () => mainWindow,
    getStatus,
    onSyncNow: () => {
      mainWindow?.webContents.send('sync:requested');
    },
    onToggleAutomation: () => {
      mainWindow?.webContents.send('automation:toggle-requested');
    }
  };

  createSignalboxTray(trayOptions);
  registerIpc(() => mainWindow, () => updateTrayMenu(trayOptions), runtime);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});
