const { BrowserWindow, screen } = require('electron');
const path = require('path');
const fs   = require('fs');
const tv   = require('./tvDisplay');
const { getDisplayHtml } = require('./displayHtml');

let tableWindow = null;

function getTableWindow() { return tableWindow; }

function openTableWindow() {
  if (tableWindow && !tableWindow.isDestroyed()) {
    tableWindow.focus();
    return tableWindow;
  }

  // Prefer a secondary display that isn't already hosting the map TV window.
  const displays  = screen.getAllDisplays();
  const primary   = screen.getPrimaryDisplay();
  const tvWindow  = tv.getTvWindow();
  const tvDisplay = tvWindow && !tvWindow.isDestroyed()
    ? screen.getDisplayMatching(tvWindow.getBounds())
    : null;

  const target = displays.find(d => d.id !== primary.id && (!tvDisplay || d.id !== tvDisplay.id));

  if (!target) {
    // No display free for a dedicated Table Display — the Map/TV Display
    // already shows the seat HUD, so don't open a duplicate window that
    // would just cover it on the same screen.
    return null;
  }

  tableWindow = new BrowserWindow({
    title: 'Table Display',
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

  tableWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getTableHtml())}`);
  tableWindow.setMenuBarVisibility(false);
  tableWindow.once('ready-to-show', () => {
    tableWindow.show();
    if (process.platform === 'darwin') {
      tableWindow.setSimpleFullScreen(true);
    } else {
      tableWindow.setFullScreen(true);
    }
  });
  tableWindow.on('closed', () => { tableWindow = null; });
  return tableWindow;
}

function closeTableWindow() {
  if (tableWindow && !tableWindow.isDestroyed()) tableWindow.close();
  tableWindow = null;
}

function syncState(state) {
  if (!tableWindow || tableWindow.isDestroyed()) return;
  tableWindow.webContents.executeJavaScript(`applyState(${JSON.stringify(state)})`).catch(() => {});
}

function exec(js) {
  if (!tableWindow || tableWindow.isDestroyed()) return;
  tableWindow.webContents.executeJavaScript(js).catch(() => {});
}

function syncMapImage(imagePath) {
  if (!tableWindow || tableWindow.isDestroyed()) return;
  const ext  = path.extname(imagePath).toLowerCase().replace('.', '');
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
             : ext === 'png' ? 'image/png'
             : ext === 'webp' ? 'image/webp'
             : ext === 'gif' ? 'image/gif'
             : 'image/jpeg';
  const dataUrl = `data:${mime};base64,${fs.readFileSync(imagePath).toString('base64')}`;
  exec(`setMap(${JSON.stringify(dataUrl)})`);
}

function clearMap() { exec(`setMap(null)`); }

function syncMapFog(fogDataUrl) {
  exec(`applyFogMask(${JSON.stringify(fogDataUrl)})`);
}

function syncMapBrushStroke(nx, ny, radius) {
  if (!tableWindow || tableWindow.isDestroyed()) return;
  tableWindow.webContents.executeJavaScript(`applyBrushStroke(${nx},${ny},${radius})`).catch(() => {});
}

function syncMapPins(pins, hideAllNpcs, hideMons, pinSize) {
  exec(`setPins(${JSON.stringify({ pins, hideAllNpcs, hideAllMonsters: hideMons, pinSize })})`);
}

function syncMapGrid(enabled, size) {
  exec(`setGrid(${JSON.stringify({ enabled, size })})`);
}

function syncMapOverlay(state) {
  exec(`applyOverlayState(${JSON.stringify(state)})`);
}

function replayMapState(state) {
  if (!tableWindow || tableWindow.isDestroyed() || !state) return;
  const apply = () => {
    if (state.imagePath) {
      try { syncMapImage(state.imagePath); } catch (_e) {}
    }
    syncMapOverlay(state);
  };
  if (tableWindow.webContents.isLoading()) {
    tableWindow.webContents.once('did-finish-load', apply);
  } else {
    apply();
  }
}

function replaySeatState(state) {
  if (!tableWindow || tableWindow.isDestroyed() || !state) return;
  const apply = () => syncState(state);
  if (tableWindow.webContents.isLoading()) {
    tableWindow.webContents.once('did-finish-load', apply);
  } else {
    apply();
  }
}

function getTableHtml() {
  return getDisplayHtml('Table Display');
}

module.exports = {
  openTableWindow, closeTableWindow, getTableWindow, syncState,
  syncMapImage, clearMap, syncMapFog, syncMapBrushStroke, syncMapPins, syncMapGrid, syncMapOverlay,
  replayMapState, replaySeatState,
};
