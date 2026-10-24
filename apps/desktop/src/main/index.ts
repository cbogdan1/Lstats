import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { DEFAULT_LOCKFILE, LcuConnector } from './lcu';
import { LiveClientPoller } from './liveClient';

const lcu = new LcuConnector(process.env.LOL_LOCKFILE ?? DEFAULT_LOCKFILE);
const live = new LiveClientPoller();

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: { preload: join(__dirname, '../preload/index.js') },
  });
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void win.loadFile(join(__dirname, '../renderer/index.html'));
}

lcu.on('phase', (phase) => {
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send('lcu:phase', phase);
  live.syncWithPhase(phase);
});

live.on('data', (data) => console.log(`[live] ${data.allPlayers.length} players in game`));

ipcMain.handle('lcu:getPhase', () => lcu.phase);

void app.whenReady().then(() => {
  createWindow();
  lcu.start();
});

app.on('window-all-closed', () => app.quit());
