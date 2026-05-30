/**
 * electron/nanoleaf.js  —  v0.3 (multi-device + Essentials bulb support)
 *
 * Config schema (nanoleaf-config.json):
 *   { devices: [ { id, label, ip, port, token, model, isEssentials } ] }
 *
 * Backwards-compatible: old flat schema { ip, port, token } is migrated
 * automatically on first load.
 *
 * The Nanoleaf Essentials line (Matter/Thread A19/B22 bulbs, strips) uses a
 * different scene-set payload vs Shapes/Panels/Canvas. We detect the model
 * from the device info endpoint and pick the right method automatically.
 */

const http = require('http');
const path = require('path');
const fs   = require('fs');

const CONFIG_PATH = path.join(process.cwd(), 'nanoleaf-config.json');
let _config = null;

// ── Config ────────────────────────────────────────────────────────────────────

function loadConfig() {
  if (_config) return _config;
  if (!fs.existsSync(CONFIG_PATH)) return { devices: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    // Migrate old flat schema { ip, port, token } → { devices: [...] }
    if (raw.ip && raw.token && !raw.devices) {
      _config = {
        devices: [{
          id:    'device_1',
          label: 'Nanoleaf',
          ip:    raw.ip,
          port:  raw.port || 16021,
          token: raw.token,
          model: 'unknown',
          isEssentials: false,
        }],
      };
      saveConfig(_config);
      return _config;
    }
    _config = raw;
    return _config;
  } catch { return { devices: [] }; }
}

function saveConfig(cfg) {
  _config = cfg;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function isConfigured() {
  return loadConfig().devices.length > 0;
}

function getDevices() {
  return loadConfig().devices || [];
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function deviceRequest(device, method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req  = http.request({
      method,
      hostname: device.ip,
      port:     device.port || 16021,
      path:     `/api/v1/${device.token}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
      timeout: 5000,
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try   { resolve({ status: res.statusCode, data: raw ? JSON.parse(raw) : null }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error',   reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    if (data) req.write(data);
    req.end();
  });
}

// ── Essentials detection ──────────────────────────────────────────────────────
//
// Essentials (bulbs, strips) need a different effect payload than panels.
// We identify them by model string from the device info endpoint.

function isEssentialsModel(modelStr) {
  const m = (modelStr || '').toLowerCase();
  return (
    m.includes('essential') ||
    m.includes('nl45')  ||  // Essentials Lightstrip
    m.includes('nl42')  ||  // Essentials Bulb A19
    m.includes('nl52')  ||  // Essentials Bulb B22
    m.includes('a19')   ||
    m.includes('b22')   ||
    m.includes('bulb')  ||
    m.includes('strip')
  );
}

function isEssentialsDevice(device) {
  return device.isEssentials === true || isEssentialsModel(device.model);
}

async function detectModel(device) {
  try {
    const res = await deviceRequest(device, 'GET', '/', null);
    if (res.status === 200 && res.data) {
      return res.data.model || res.data.name || 'unknown';
    }
  } catch (_) {}
  return 'unknown';
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function generateToken(ip, port, label) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      method:   'POST',
      hostname: ip,
      port:     port || 16021,
      path:     '/api/v1/new',
      headers:  { 'Content-Length': 0 },
      timeout:  8000,
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', async () => {
        try {
          const parsed = JSON.parse(raw);
          if (!parsed.auth_token) {
            return reject(new Error('No token returned — hold the power button for 5 seconds first'));
          }
          const newDevice = {
            id:    `device_${Date.now()}`,
            label: label || `Nanoleaf ${getDevices().length + 1}`,
            ip,
            port:  port || 16021,
            token: parsed.auth_token,
            model: 'unknown',
            isEssentials: false,
          };
          // Auto-detect model and flag Essentials
          newDevice.model        = await detectModel(newDevice);
          newDevice.isEssentials = isEssentialsModel(newDevice.model);

          const cfg = loadConfig();
          cfg.devices.push(newDevice);
          saveConfig(cfg);
          resolve(newDevice);
        } catch (e) { reject(new Error('Bad response: ' + raw)); }
      });
    });
    req.on('error',   () => reject(new Error(`Could not reach ${ip} — check IP and network`)));
    req.on('timeout', () => { req.destroy(); reject(new Error('Timed out — is the device on?')); });
    req.end();
  });
}

function removeDevice(deviceId) {
  const cfg = loadConfig();
  cfg.devices = cfg.devices.filter(d => d.id !== deviceId);
  saveConfig(cfg);
  _config = cfg;
}

function updateDeviceLabel(deviceId, label) {
  const cfg = loadConfig();
  const d   = cfg.devices.find(d => d.id === deviceId);
  if (d) { d.label = label; saveConfig(cfg); }
}

// ── Scene control ─────────────────────────────────────────────────────────────
//
// Panels/Shapes/Canvas:  PUT /effects  { "select": "Scene Name" }
// Essentials bulbs/strips: PUT /effects { "write": { "command": "display", "animName": "Scene Name" } }

async function setSceneOnDevice(device, sceneName) {
  const body = isEssentialsDevice(device)
    ? { write: { command: 'display', animName: sceneName } }
    : { select: sceneName };

  const res = await deviceRequest(device, 'PUT', '/effects', body);
  if (res.status !== 204 && res.status !== 200) {
    throw new Error(`${device.label}: HTTP ${res.status}`);
  }
}

async function getScenes() {
  const devices = getDevices();
  if (!devices.length) throw new Error('No Nanoleaf devices configured');
  const results = await Promise.allSettled(
    devices.map(d => deviceRequest(d, 'GET', '/effects/effectsList', null))
  );
  const allScenes = new Set();
  results.forEach(r => {
    if (r.status === 'fulfilled' && r.value.status === 200 && Array.isArray(r.value.data)) {
      r.value.data.forEach(s => allScenes.add(s));
    }
  });
  return [...allScenes];
}

async function setScene(sceneName) {
  const devices = getDevices();
  if (!devices.length) throw new Error('No Nanoleaf devices configured');

  // Send sequentially with a small gap — some Essentials bulbs reject rapid
  // parallel PUT /effects calls with 422/500 and silently ignore the second.
  const errors = [];
  for (const device of devices) {
    try {
      await setSceneOnDevice(device, sceneName);
    } catch (err) {
      errors.push(`${device.label}: ${err.message}`);
    }
    // 80ms gap between commands — well within perceptible latency, prevents
    // the bulb firmware from dropping the second request
    if (devices.length > 1) await new Promise(r => setTimeout(r, 80));
  }

  // Only throw if ALL devices failed
  if (errors.length === devices.length) {
    throw new Error(errors.join(' | '));
  }
  // Return partial errors so the UI can surface them
  return errors.length > 0 ? { partialErrors: errors } : null;
}

async function setBrightness(value) {
  const devices = getDevices();
  await Promise.allSettled(devices.map(d =>
    deviceRequest(d, 'PUT', '/state', { brightness: { value: Math.max(0, Math.min(100, value)) } })
  ));
}

async function setPower(on) {
  const devices = getDevices();
  await Promise.allSettled(devices.map(d =>
    deviceRequest(d, 'PUT', '/state', { on: { value: on } })
  ));
}

async function getState() {
  const devices = getDevices();
  if (!devices.length) return [];
  const results = await Promise.allSettled(devices.map(async d => {
    const res = await deviceRequest(d, 'GET', '/', null);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return {
      id:           d.id,
      label:        d.label,
      model:        d.model,
      isEssentials: d.isEssentials,
      on:           res.data.state?.on?.value,
      brightness:   res.data.state?.brightness?.value,
      scene:        res.data.effects?.select,
    };
  }));
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { id: devices[i].id, label: devices[i].label, error: r.reason.message }
  );
}

async function verifyDevice(deviceId) {
  const device = getDevices().find(d => d.id === deviceId);
  if (!device) return { ok: false, error: 'Device not found' };
  try {
    const res = await deviceRequest(device, 'GET', '/', null);
    if (res.status === 200) {
      return {
        ok:           true,
        model:        res.data?.model,
        name:         res.data?.name,
        on:           res.data?.state?.on?.value,
        isEssentials: isEssentialsModel(res.data?.model || ''),
      };
    }
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = {
  isConfigured, loadConfig, getDevices,
  generateToken, removeDevice, updateDeviceLabel,
  getScenes, setScene, setBrightness, setPower, getState, verifyDevice,
};
