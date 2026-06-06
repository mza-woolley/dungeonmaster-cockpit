require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { app, BrowserWindow, globalShortcut, ipcMain, dialog, nativeImage } = require('electron');

app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
const path = require('path');
const fs   = require('fs');

const spotify  = require('./spotify');
const nanoleaf = require('./nanoleaf');
const pixie    = require('./pixie');
const tv        = require('./tvDisplay');
const statblock = require('./statblock');
const wizard   = require('./wizard');
const docs     = require('./docs');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 820, minWidth: 800, minHeight: 600,
    backgroundColor: '#0a0906',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;
  mainWindow.loadURL(startUrl);
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Spotify IPC ───────────────────────────────────────────
ipcMain.handle('spotify:isAuthorized', () => spotify.isAuthorized());
ipcMain.handle('spotify:authorize', async () => {
  try { await spotify.authorize(); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('spotify:getPlaylists', async () => {
  try { return { success: true, data: await spotify.getPlaylists() }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('spotify:play', async (_, uri) => {
  try { await spotify.playPlaylist(uri); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('spotify:resume', async () => {
  try { await spotify.resumePlayback(); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('spotify:pause', async () => {
  try { await spotify.pausePlayback(); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('spotify:skip', async () => {
  try { await spotify.skipTrack(); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('spotify:previous', async () => {
  try { await spotify.previousTrack(); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('spotify:currentTrack', async () => {
  try { return { success: true, data: await spotify.getCurrentTrack() }; }
  catch (err) { return { success: false, error: err.message }; }
});

// ── Nanoleaf IPC ──────────────────────────────────────────
ipcMain.handle('nanoleaf:isConfigured', () => nanoleaf.isConfigured());
ipcMain.handle('nanoleaf:getConfig',    () => nanoleaf.loadConfig());
ipcMain.handle('nanoleaf:getDevices',   () => nanoleaf.getDevices());

ipcMain.handle('nanoleaf:setup', async (_, { ip, port, label }) => {
  try {
    const device = await nanoleaf.generateToken(ip, port, label);
    return { success: true, device };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('nanoleaf:removeDevice', (_, deviceId) => {
  try { nanoleaf.removeDevice(deviceId); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('nanoleaf:updateLabel', (_, { deviceId, label }) => {
  try { nanoleaf.updateDeviceLabel(deviceId, label); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('nanoleaf:verifyDevice', async (_, deviceId) => {
  try { return { success: true, data: await nanoleaf.verifyDevice(deviceId) }; }
  catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('nanoleaf:getScenes', async () => {
  try { return { success: true, data: await nanoleaf.getScenes() }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('nanoleaf:setScene', async (_, scene) => {
  try {
    const result = await nanoleaf.setScene(scene);
    return { success: true, partialErrors: result?.partialErrors || [] };
  } catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('nanoleaf:setBrightness', async (_, val) => {
  try { await nanoleaf.setBrightness(val); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('nanoleaf:setPower', async (_, on) => {
  try { await nanoleaf.setPower(on); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('nanoleaf:getState', async () => {
  try { return { success: true, data: await nanoleaf.getState() }; }
  catch (err) { return { success: false, error: err.message }; }
});

// ── Pixie Table Light IPC ─────────────────────────────────
ipcMain.handle('pixie:setColor', async (_, { r, g, b }) => {
  try { await pixie.setColor(r, g, b); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('pixie:turnOn', async () => {
  try { await pixie.turnOn(); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('pixie:turnOff', async () => {
  try { await pixie.turnOff(); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});

// ── Stat Block Window IPC ─────────────────────────────────
ipcMain.handle('statblock:open', (_, monster) => {
  try { statblock.openStatBlock(monster); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});

// ── TV Display IPC ────────────────────────────────────────
ipcMain.handle('tv:open', () => {
  try { tv.openTvWindow(); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('tv:close', () => {
  try { tv.closeTvWindow(); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('tv:pushImage', (_, imagePath) => {
  try { tv.pushImage(imagePath); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('tv:clear', () => {
  try { tv.clearTvDisplay(); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('tv:isOpen', () => {
  const w = tv.getTvWindow();
  return !!(w && !w.isDestroyed());
});
ipcMain.handle('tv:readImage', (_, imagePath) => {
  try {
    const ext  = path.extname(imagePath).toLowerCase().replace('.', '');
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
               : ext === 'png' ? 'image/png'
               : ext === 'webp' ? 'image/webp'
               : 'image/jpeg';
    const b64 = fs.readFileSync(imagePath).toString('base64');
    return { success: true, dataUrl: `data:${mime};base64,${b64}` };
  } catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('tv:syncFog', (_, fogDataUrl) => {
  try { tv.syncFog(fogDataUrl); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.on('tv:brushStroke', (_, { nx, ny, radius }) => {
  try { tv.syncBrushStroke(nx, ny, radius); } catch (_e) {}
});
ipcMain.handle('tv:syncPins', (_, { pins, hideAllNpcs, hideAllMonsters, pinSize }) => {
  try { tv.syncPins(pins, hideAllNpcs, hideAllMonsters, pinSize); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('tv:syncGrid', (_, { enabled, size }) => {
  try { tv.syncGrid(enabled, size); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('tv:syncOverlay', (_, state) => {
  try { tv.syncOverlay(state); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('tv:pickFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Map Image Folder',
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return { success: false };
  const folder = result.filePaths[0];
  const exts   = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const files  = fs.readdirSync(folder)
    .filter(f => exts.includes(path.extname(f).toLowerCase()))
    .map(f => ({ name: path.basename(f, path.extname(f)), path: path.join(folder, f) }));
  return { success: true, folder, files };
});
const crypto   = require('crypto');
const { app: _app } = require('electron');

ipcMain.handle('tv:thumbnail', async (_, imagePath) => {
  try {
    const cacheDir = path.join(_app.getPath('userData'), 'thumb-cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const cacheKey  = crypto.createHash('md5').update(imagePath).digest('hex');
    const cachePath = path.join(cacheDir, `${cacheKey}.png`);

    if (fs.existsSync(cachePath)) {
      const dataUrl = 'data:image/png;base64,' + fs.readFileSync(cachePath).toString('base64');
      return { success: true, dataUrl };
    }

    const img = nativeImage.createFromPath(imagePath);
    if (img.isEmpty()) return { success: false, error: 'Could not load image' };
    const size  = img.getSize();
    const maxDim = 80;
    const scale = Math.min(maxDim / size.width, maxDim / size.height, 1);
    const thumb = img.resize({ width: Math.round(size.width * scale), height: Math.round(size.height * scale), quality: 'fast' });

    const pngBuffer = thumb.toPNG();
    fs.writeFileSync(cachePath, pngBuffer);

    return { success: true, dataUrl: 'data:image/png;base64,' + pngBuffer.toString('base64') };
  } catch (err) { return { success: false, error: err.message }; }
});

// ── Monsters / Encounters IPC ─────────────────────────────
const MONSTERS_PATH     = path.join(__dirname, '..', 'monsters.json');
const SRD_MONSTERS_PATH = path.join(__dirname, '..', 'srd-library', 'monsters.json');

function loadMonstersFile() {
  try {
    if (fs.existsSync(MONSTERS_PATH)) return JSON.parse(fs.readFileSync(MONSTERS_PATH, 'utf8'));
  } catch (_) {}
  return { custom: [], srd_overrides: {} };
}

ipcMain.handle('monsters:loadSrd', () => {
  try {
    if (fs.existsSync(SRD_MONSTERS_PATH))
      return { success: true, data: JSON.parse(fs.readFileSync(SRD_MONSTERS_PATH, 'utf8')) };
    return { success: false, error: 'srd-library/monsters.json not found' };
  } catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('monsters:load', () => loadMonstersFile());
ipcMain.handle('monsters:saveCustom', (_, monster) => {
  try {
    const data = loadMonstersFile();
    const idx  = data.custom.findIndex(m => m.id === monster.id);
    if (idx >= 0) data.custom[idx] = monster;
    else data.custom.push(monster);
    fs.writeFileSync(MONSTERS_PATH, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('monsters:deleteCustom', (_, id) => {
  try {
    const data  = loadMonstersFile();
    data.custom = data.custom.filter(m => m.id !== id);
    fs.writeFileSync(MONSTERS_PATH, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

// ── Characters seed IPC ───────────────────────────────────
const CHARACTERS_PATH = path.join(__dirname, '..', 'characters.json');

ipcMain.handle('characters:loadSeed', () => {
  try {
    if (fs.existsSync(CHARACTERS_PATH)) return JSON.parse(fs.readFileSync(CHARACTERS_PATH, 'utf8'));
  } catch (_) {}
  return { characters: [] };
});

// ── Map States IPC ───────────────────────────────────────
const MAP_STATES_PATH = path.join(__dirname, '..', 'map-states.json');

function loadMapStates() {
  try {
    if (fs.existsSync(MAP_STATES_PATH)) return JSON.parse(fs.readFileSync(MAP_STATES_PATH, 'utf8'));
  } catch (_) {}
  return [];
}

ipcMain.handle('mapStates:load', () => loadMapStates());
ipcMain.handle('mapStates:save', (_, state) => {
  try {
    const states = loadMapStates();
    const idx    = states.findIndex(s => s.id === state.id);
    if (idx >= 0) states[idx] = state; else states.push(state);
    fs.writeFileSync(MAP_STATES_PATH, JSON.stringify(states, null, 2));
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});
ipcMain.handle('mapStates:delete', (_, id) => {
  try {
    const states = loadMapStates().filter(s => s.id !== id);
    fs.writeFileSync(MAP_STATES_PATH, JSON.stringify(states, null, 2));
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

// ── Presets IPC ───────────────────────────────────────────
const PRESETS_PATH = path.join(__dirname, '..', 'presets.json');

function loadPresetsFile() {
  try {
    if (fs.existsSync(PRESETS_PATH)) return JSON.parse(fs.readFileSync(PRESETS_PATH, 'utf8'));
  } catch (_) {}
  return [];
}

ipcMain.handle('presets:load', () => loadPresetsFile());
ipcMain.handle('presets:save', (_, presets) => {
  try {
    fs.writeFileSync(PRESETS_PATH, JSON.stringify(presets, null, 2));
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

// ── Karma IPC ─────────────────────────────────────────────
const KARMA_PATH = path.join(__dirname, '..', 'karma.json');

function loadKarmaFile() {
  try {
    if (fs.existsSync(KARMA_PATH)) return JSON.parse(fs.readFileSync(KARMA_PATH, 'utf8'));
  } catch (_) {}
  return { characters: [] };
}

ipcMain.handle('karma:load', () => loadKarmaFile());
ipcMain.handle('karma:save', (_, data) => {
  try {
    fs.writeFileSync(KARMA_PATH, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

// ── App Lifecycle ─────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  wizard.register(ipcMain);
  docs.register(ipcMain);
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (mainWindow === null) createWindow(); });
app.on('will-quit', () => globalShortcut.unregisterAll());
