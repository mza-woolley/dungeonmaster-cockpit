const { BrowserWindow, screen } = require('electron');
const path = require('path');
const fs   = require('fs');
const { getDisplayHtml } = require('./displayHtml');

let tvWindow = null;

function getTvWindow() { return tvWindow; }

function openTvWindow() {
  if (tvWindow && !tvWindow.isDestroyed()) {
    tvWindow.focus();
    return tvWindow;
  }

  // Prefer a connected secondary display — pop straight onto it, full-screen.
  const displays = screen.getAllDisplays();
  const primary  = screen.getPrimaryDisplay();
  const target   = displays.find(d => d.id !== primary.id) || primary;

  tvWindow = new BrowserWindow({
    title: 'DM Display',
    backgroundColor: '#000000',
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    show: false,
    fullscreen: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'tvPreload.js'),
    },
  });

  tvWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getTvHtml())}`);
  tvWindow.setMenuBarVisibility(false);
  tvWindow.once('ready-to-show', () => {
    tvWindow.show();
    if (process.platform === 'darwin') {
      tvWindow.setSimpleFullScreen(true);
    } else {
      tvWindow.setFullScreen(true);
    }
  });
  tvWindow.on('closed', () => { tvWindow = null; });
  return tvWindow;
}

function closeTvWindow() {
  if (tvWindow && !tvWindow.isDestroyed()) tvWindow.close();
  tvWindow = null;
}

function exec(js) {
  if (!tvWindow || tvWindow.isDestroyed()) return;
  tvWindow.webContents.executeJavaScript(js).catch(err => console.error('[tvDisplay] exec failed:', err));
}

function pushImage(imagePath) {
  const win = tvWindow && !tvWindow.isDestroyed() ? tvWindow : openTvWindow();
  const ext  = path.extname(imagePath).toLowerCase().replace('.', '');
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
             : ext === 'png' ? 'image/png'
             : ext === 'webp' ? 'image/webp'
             : ext === 'gif' ? 'image/gif'
             : 'image/jpeg';
  const dataUrl = `data:${mime};base64,${fs.readFileSync(imagePath).toString('base64')}`;
  const js = `setMap(${JSON.stringify(dataUrl)})`;
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', () => exec(js));
  } else {
    exec(js);
  }
}

function clearTvDisplay() { exec(`setMap(null)`); }

function syncFog(fogDataUrl) {
  exec(`applyFogMask(${JSON.stringify(fogDataUrl)})`);
}

function syncBrushStroke(nx, ny, radius) {
  // Fire-and-forget — no await, no queue
  if (!tvWindow || tvWindow.isDestroyed()) return;
  tvWindow.webContents.executeJavaScript(`applyBrushStroke(${nx},${ny},${radius})`).catch(() => {});
}

function syncPins(pins, hideAllNpcs, hideMons, pinSize) {
  exec(`setPins(${JSON.stringify({ pins, hideAllNpcs, hideAllMonsters: hideMons, pinSize })})`);
}

function syncGrid(enabled, size) {
  exec(`setGrid(${JSON.stringify({ enabled, size })})`);
}

function syncOverlay(state) {
  exec(`applyOverlayState(${JSON.stringify(state)})`);
}

function syncState(state) {
  exec(`applyState(${JSON.stringify(state)})`);
}

function replayMapState(state) {
  if (!tvWindow || tvWindow.isDestroyed() || !state) return;
  const apply = () => {
    if (state.imagePath) {
      try { pushImage(state.imagePath); } catch (_e) {}
    }
    syncOverlay(state);
  };
  if (tvWindow.webContents.isLoading()) {
    tvWindow.webContents.once('did-finish-load', apply);
  } else {
    apply();
  }
}

function replaySeatState(state) {
  if (!tvWindow || tvWindow.isDestroyed() || !state) return;
  const apply = () => syncState(state);
  if (tvWindow.webContents.isLoading()) {
    tvWindow.webContents.once('did-finish-load', apply);
  } else {
    apply();
  }
}

function getTvHtml() {
  return getDisplayHtml('DM Display');
}

module.exports = {
  openTvWindow, closeTvWindow, pushImage, clearTvDisplay, syncFog, syncBrushStroke, syncPins, syncGrid, syncOverlay,
  syncState, replayMapState, replaySeatState, getTvWindow,
};
