require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { app, BrowserWindow, globalShortcut, ipcMain, dialog, nativeImage } = require('electron');

app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

const spotify  = require('./spotify');
const nanoleaf = require('./nanoleaf');
const pixie     = require('./pixie');
const colorLoop = require('./colorLoop');
const tv        = require('./tvDisplay');
const table     = require('./tableDisplay');
const statblock = require('./statblock');
const wizard   = require('./wizard');
const docs     = require('./docs');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow;

// Wraps an IPC handler in the standard { success, error } envelope.
// The handler returns extra payload fields as an object (or nothing);
// thrown errors become { success: false, error }. A handler may also
// return { success: false, ... } itself to signal a soft failure.
function handle(channel, fn) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      const extra = await fn(...args);
      return { success: true, ...(extra && typeof extra === 'object' ? extra : {}) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

// Writes JSON via a temp file + rename so a crash mid-write can't leave
// a half-written (corrupt) data file behind.
function writeJsonAtomic(filePath, data) {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

// Last-known map/overlay state from the Display tab, replayed onto the
// Table Display whenever it (re)opens so its map background isn't blank.
let currentMapState = {
  imagePath: null,
  fogMask: null,
  gridEnabled: false,
  gridSize: 'medium',
  pins: [],
  pinSize: 18,
  hideAllNpcs: false,
  hideAllMonsters: false,
};

// Last-known per-seat PC HUD state, replayed onto the Table/Map Display
// whenever either window (re)opens so the seat panels aren't blank.
let currentSeatState = null;

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
handle('spotify:authorize',    async () => { await spotify.authorize(); });
handle('spotify:getPlaylists', async () => ({ data: await spotify.getPlaylists() }));
handle('spotify:play',         async (uri) => { await spotify.playPlaylist(uri); });
handle('spotify:resume',       async () => { await spotify.resumePlayback(); });
handle('spotify:pause',        async () => { await spotify.pausePlayback(); });
handle('spotify:skip',         async () => { await spotify.skipTrack(); });
handle('spotify:previous',     async () => { await spotify.previousTrack(); });
handle('spotify:currentTrack', async () => ({ data: await spotify.getCurrentTrack() }));

// ── Nanoleaf IPC ──────────────────────────────────────────
ipcMain.handle('nanoleaf:isConfigured', () => nanoleaf.isConfigured());
ipcMain.handle('nanoleaf:getConfig',    () => nanoleaf.loadConfig());
ipcMain.handle('nanoleaf:getDevices',   () => nanoleaf.getDevices());

handle('nanoleaf:setup', async ({ ip, port, label }) =>
  ({ device: await nanoleaf.generateToken(ip, port, label) }));
handle('nanoleaf:removeDevice', (deviceId) => { nanoleaf.removeDevice(deviceId); });
handle('nanoleaf:updateLabel',  ({ deviceId, label }) => { nanoleaf.updateDeviceLabel(deviceId, label); });
handle('nanoleaf:verifyDevice', async (deviceId) => ({ data: await nanoleaf.verifyDevice(deviceId) }));
handle('nanoleaf:getScenes',    async () => ({ data: await nanoleaf.getScenes() }));
handle('nanoleaf:setScene', async (scene) => {
  const result = await nanoleaf.setScene(scene);
  return { partialErrors: result?.partialErrors || [] };
});
handle('nanoleaf:setBrightness', async (val) => { await nanoleaf.setBrightness(val); });
handle('nanoleaf:setPower',      async (on) => { await nanoleaf.setPower(on); });
handle('nanoleaf:getState',      async () => ({ data: await nanoleaf.getState() }));

// ── Pixie Table Light IPC ─────────────────────────────────
handle('pixie:setColor', async ({ r, g, b }) => { await pixie.setColor(r, g, b); });
handle('pixie:turnOn',   async () => { await pixie.turnOn(); });
handle('pixie:turnOff',  async () => { await pixie.turnOff(); });

// ── Colour Loop IPC ──────────────────────────────────────
handle('lights:startLoop', ({ stops }) => { colorLoop.startLoop(stops); });
handle('lights:stopLoop',  () => { colorLoop.stopLoop(); });

// ── Stat Block Window IPC ─────────────────────────────────
handle('statblock:open', (monster) => { statblock.openStatBlock(monster); });

// ── D&D Beyond character fetch (public characters only) ──
handle('dndbeyond:getCharacter', async (characterId) => {
  const id = String(characterId).replace(/\D/g, '');
  if (!id) return { success: false, error: 'Invalid character ID' };
  let res, text;
  try {
    res = await fetch(`https://character-service.dndbeyond.com/character/v5/character/${id}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    text = await res.text();
  } catch (err) {
    console.error('[dndbeyond:getCharacter] exception', err);
    return { success: false, error: `${err.name}: ${err.message}` };
  }
  if (!res.ok) {
    console.error('[dndbeyond:getCharacter] HTTP', res.status, text.slice(0, 500));
    return { success: false, error: `D&D Beyond returned HTTP ${res.status}: ${text.slice(0, 200)}` };
  }
  let json;
  try { json = JSON.parse(text); }
  catch (parseErr) {
    console.error('[dndbeyond:getCharacter] non-JSON response', text.slice(0, 500));
    return { success: false, error: `Unexpected response (not JSON): ${text.slice(0, 200)}` };
  }
  if (!json || !json.data) {
    console.error('[dndbeyond:getCharacter] no data field', JSON.stringify(json).slice(0, 500));
    return { success: false, error: `No character data in response: ${JSON.stringify(json).slice(0, 200)}` };
  }
  return { data: json.data };
});

// ── TV Display IPC ────────────────────────────────────────
handle('tv:open', () => {
  tv.openTvWindow();
  tv.replayMapState(currentMapState);
  tv.replaySeatState(currentSeatState);
});
handle('tv:close', () => { tv.closeTvWindow(); });
handle('tv:pushImage', (imagePath) => {
  tv.pushImage(imagePath);
  table.syncMapImage(imagePath);
  currentMapState.imagePath = imagePath;
  currentMapState.fogMask   = null;
  currentMapState.pins      = [];
});
handle('tv:clear', () => {
  tv.clearTvDisplay();
  table.clearMap();
  currentMapState.imagePath = null;
  currentMapState.fogMask   = null;
  currentMapState.pins      = [];
});
ipcMain.handle('tv:isOpen', () => {
  const w = tv.getTvWindow();
  return !!(w && !w.isDestroyed());
});
handle('tv:readImage', (imagePath) => {
  const ext  = path.extname(imagePath).toLowerCase().replace('.', '');
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
             : ext === 'png' ? 'image/png'
             : ext === 'webp' ? 'image/webp'
             : 'image/jpeg';
  const b64 = fs.readFileSync(imagePath).toString('base64');
  return { dataUrl: `data:${mime};base64,${b64}` };
});
handle('tv:syncFog', (fogDataUrl) => {
  tv.syncFog(fogDataUrl);
  table.syncMapFog(fogDataUrl);
  currentMapState.fogMask = fogDataUrl;
});
ipcMain.on('tv:brushStroke', (_, { nx, ny, radius }) => {
  try { tv.syncBrushStroke(nx, ny, radius); } catch (_e) {}
  try { table.syncMapBrushStroke(nx, ny, radius); } catch (_e) {}
});
handle('tv:syncPins', ({ pins, hideAllNpcs, hideAllMonsters, pinSize }) => {
  tv.syncPins(pins, hideAllNpcs, hideAllMonsters, pinSize);
  table.syncMapPins(pins, hideAllNpcs, hideAllMonsters, pinSize);
  currentMapState.pins            = pins;
  currentMapState.hideAllNpcs     = hideAllNpcs;
  currentMapState.hideAllMonsters = hideAllMonsters;
  currentMapState.pinSize         = pinSize;
});
handle('tv:syncGrid', ({ enabled, size }) => {
  tv.syncGrid(enabled, size);
  table.syncMapGrid(enabled, size);
  currentMapState.gridEnabled = enabled;
  currentMapState.gridSize    = size;
});
handle('tv:syncOverlay', (state) => {
  tv.syncOverlay(state);
  table.syncMapOverlay(state);
  currentMapState = { ...currentMapState, ...state };
});
handle('table:open', () => {
  const win = table.openTableWindow();
  if (win) {
    table.replayMapState(currentMapState);
    table.replaySeatState(currentSeatState);
  }
  return { opened: !!win };
});
handle('table:close', () => { table.closeTableWindow(); });
ipcMain.handle('table:isOpen', () => {
  const w = table.getTableWindow();
  return !!(w && !w.isDestroyed());
});
handle('table:sync', (state) => {
  table.syncState(state);
  currentSeatState = state;
});
handle('tv:syncState', (state) => {
  tv.syncState(state);
  currentSeatState = state;
});

handle('tv:setSeatsVisible', (visible) => { tv.setSeatsVisible(visible); });

handle('tv:pickFolder', async () => {
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
  return { folder, files };
});

handle('tv:thumbnail', async (imagePath) => {
  const cacheDir = path.join(app.getPath('userData'), 'thumb-cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const cacheKey  = crypto.createHash('md5').update(imagePath).digest('hex');
  const cachePath = path.join(cacheDir, `${cacheKey}.png`);

  if (fs.existsSync(cachePath)) {
    const dataUrl = 'data:image/png;base64,' + fs.readFileSync(cachePath).toString('base64');
    return { dataUrl };
  }

  const img = nativeImage.createFromPath(imagePath);
  if (img.isEmpty()) return { success: false, error: 'Could not load image' };
  const size  = img.getSize();
  const maxDim = 80;
  const scale = Math.min(maxDim / size.width, maxDim / size.height, 1);
  const thumb = img.resize({ width: Math.round(size.width * scale), height: Math.round(size.height * scale), quality: 'fast' });

  const pngBuffer = thumb.toPNG();
  fs.writeFileSync(cachePath, pngBuffer);

  return { dataUrl: 'data:image/png;base64,' + pngBuffer.toString('base64') };
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

handle('monsters:loadSrd', () => {
  if (!fs.existsSync(SRD_MONSTERS_PATH))
    return { success: false, error: 'srd-library/monsters.json not found' };
  return { data: JSON.parse(fs.readFileSync(SRD_MONSTERS_PATH, 'utf8')) };
});
ipcMain.handle('monsters:load', () => loadMonstersFile());
handle('monsters:saveCustom', (monster) => {
  const data = loadMonstersFile();
  const idx  = data.custom.findIndex(m => m.id === monster.id);
  if (idx >= 0) data.custom[idx] = monster;
  else data.custom.push(monster);
  writeJsonAtomic(MONSTERS_PATH, data);
});
handle('monsters:deleteCustom', (id) => {
  const data  = loadMonstersFile();
  data.custom = data.custom.filter(m => m.id !== id);
  writeJsonAtomic(MONSTERS_PATH, data);
});

// ── NPCs IPC ──────────────────────────────────────────────
const NPCS_PATH = path.join(__dirname, '..', 'npcs.json');

function loadNpcsFile() {
  try {
    if (fs.existsSync(NPCS_PATH)) return JSON.parse(fs.readFileSync(NPCS_PATH, 'utf8'));
  } catch (_) {}
  return { custom: [] };
}

ipcMain.handle('npcs:load', () => loadNpcsFile());
handle('npcs:saveCustom', (npc) => {
  const data = loadNpcsFile();
  const idx  = data.custom.findIndex(n => n.id === npc.id);
  if (idx >= 0) data.custom[idx] = npc;
  else data.custom.push(npc);
  writeJsonAtomic(NPCS_PATH, data);
});
handle('npcs:deleteCustom', (id) => {
  const data  = loadNpcsFile();
  data.custom = data.custom.filter(n => n.id !== id);
  writeJsonAtomic(NPCS_PATH, data);
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
handle('mapStates:save', (state) => {
  const states = loadMapStates();
  const idx    = states.findIndex(s => s.id === state.id);
  if (idx >= 0) states[idx] = state; else states.push(state);
  writeJsonAtomic(MAP_STATES_PATH, states);
});
handle('mapStates:delete', (id) => {
  const states = loadMapStates().filter(s => s.id !== id);
  writeJsonAtomic(MAP_STATES_PATH, states);
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
handle('presets:save', (presets) => { writeJsonAtomic(PRESETS_PATH, presets); });

// ── Karma IPC ─────────────────────────────────────────────
const KARMA_PATH = path.join(__dirname, '..', 'karma.json');

function loadKarmaFile() {
  try {
    if (fs.existsSync(KARMA_PATH)) return JSON.parse(fs.readFileSync(KARMA_PATH, 'utf8'));
  } catch (_) {}
  return { characters: [] };
}

ipcMain.handle('karma:load', () => loadKarmaFile());
handle('karma:save', (data) => { writeJsonAtomic(KARMA_PATH, data); });

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
