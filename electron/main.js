/**
 * Killing for Pie! — desktop shell
 *
 * Packaged builds load the live GitHub Pages site so friends never chase a URL
 * and every Pages deploy updates the game without a new .exe.
 *
 * Dev: ELECTRON_START_URL / localhost:3000
 * Override live URL: KFP_GAME_URL=https://...
 */
const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');

const COOP_PORT = Number(process.env.COOP_PORT || 27541);
const LIVE_URL =
  process.env.KFP_GAME_URL || 'https://showuptoscene98.github.io/killing-for-pie';
const isDev = !app.isPackaged;

let mainWindow = null;
let coopStarted = false;

function gameUrl() {
  if (process.env.ELECTRON_START_URL) return process.env.ELECTRON_START_URL;
  if (isDev) return 'http://127.0.0.1:3000';
  return LIVE_URL.replace(/\/$/, '');
}

function offlinePath() {
  return path.join(__dirname, 'offline.html');
}

function startCoopRelay() {
  if (coopStarted) return;
  process.env.COOP_PORT = String(COOP_PORT);
  try {
    require(path.join(__dirname, '..', 'scripts', 'coop-server.js'));
    coopStarted = true;
    console.log(`[desktop] LAN coop relay on port ${COOP_PORT}`);
  } catch (err) {
    console.error('[desktop] Failed to start coop relay:', err);
  }
}

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#0a0806',
    show: false,
    autoHideMenuBar: true,
    title: 'Killing for Pie!',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Needed so PeerJS / WebGL behave like a normal browser
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Keep invite / external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const url = gameUrl();
  console.log(`[desktop] Loading ${url}`);

  // Packaged builds cache index.html aggressively — bust so Pages deploys show up.
  const loadGame = async () => {
    try {
      if (app.isPackaged) {
        await mainWindow.webContents.session.clearCache();
      }
      const bust = app.isPackaged ? `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}` : url;
      await mainWindow.loadURL(bust);
    } catch {
      await mainWindow.loadFile(offlinePath());
    }
  };
  loadGame();

  mainWindow.webContents.on(
    'did-fail-load',
    (_e, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) return;
      // Ignore aborts from navigation
      if (errorCode === -3) return;
      console.error('[desktop] load failed', errorCode, errorDescription, validatedURL);
      mainWindow.loadFile(offlinePath());
    }
  );

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpc() {
  ipcMain.handle('desktop:getInfo', () => ({
    platform: process.platform,
    packaged: app.isPackaged,
    version: app.getVersion(),
    gameUrl: gameUrl(),
    netBackend: 'lan-ws',
    coopPort: COOP_PORT,
    steamReady: false,
  }));

  ipcMain.handle('desktop:reloadGame', async () => {
    if (!mainWindow) return { ok: false };
    const url = gameUrl();
    try {
      await mainWindow.webContents.session.clearCache();
    } catch {
      /* ignore */
    }
    const bust = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
    await mainWindow.loadURL(bust);
    return { ok: true, url: bust };
  });

  ipcMain.handle('desktop:openInBrowser', async () => {
    await shell.openExternal(gameUrl());
    return { ok: true };
  });

  ipcMain.handle('steam:isAvailable', () => false);
  ipcMain.handle('steam:createLobby', async () => {
    throw new Error('Steam Networking not wired yet — use Online co-op on GitHub Pages');
  });
  ipcMain.handle('steam:joinLobby', async () => {
    throw new Error('Steam Networking not wired yet — use Online co-op on GitHub Pages');
  });
  ipcMain.handle('steam:leaveLobby', async () => ({ ok: true }));
  ipcMain.handle('steam:sendP2P', async () => {
    throw new Error('Steam Networking not wired yet');
  });
}

app.whenReady().then(() => {
  registerIpc();
  // Packaged app = GitHub Pages + PeerJS online coop (needs internet).
  // LAN relay only in unpackaged/dev, or force with KFP_LAN_RELAY=1.
  if (!app.isPackaged || process.env.KFP_LAN_RELAY === '1') {
    startCoopRelay();
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
