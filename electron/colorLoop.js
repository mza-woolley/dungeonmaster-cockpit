const nanoleaf = require('./nanoleaf');
const pixie    = require('./pixie');

let _loopTimer   = null;
let _cancelToken = 0;
let _colorIndex  = 0;
let _currentRgb  = null;

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function stopLoop() {
  _cancelToken++;
  if (_loopTimer) { clearTimeout(_loopTimer); _loopTimer = null; }
  _currentRgb = null;
}

// stops = [{ color: '#hex', crossfade: 800, brightness: 100 }, ...]
function startLoop(stops) {
  stopLoop();
  if (!stops || stops.length === 0) return;

  if (stops.length === 1) {
    const { color, brightness = 100 } = stops[0];
    const rgb = hexToRgb(color);
    pixie.setColor(rgb.r, rgb.g, rgb.b, brightness).catch(() => {});
    nanoleaf.setColorDirect(color, 0, brightness).catch(() => {});
    return;
  }

  _colorIndex = 0;
  tick(stops, _cancelToken);
}

function tick(stops, token) {
  if (_cancelToken !== token) return;

  const { color: hex, crossfade, brightness = 100 } = stops[_colorIndex];
  const targetRgb = hexToRgb(hex);
  const duration  = Math.max(crossfade || 0, 0);

  nanoleaf.setColorDirect(hex, duration, brightness).catch(() => {});
  pixieFade(_currentRgb || targetRgb, targetRgb, duration, brightness, token);

  _colorIndex = (_colorIndex + 1) % stops.length;
  _loopTimer  = setTimeout(() => tick(stops, token), Math.max(duration, 100));
}

async function pixieFade(from, to, durationMs, brightness, token) {
  const br = brightness ?? 100;
  if (durationMs <= 0 || (from.r === to.r && from.g === to.g && from.b === to.b)) {
    if (_cancelToken === token) {
      await pixie.setColor(to.r, to.g, to.b, br).catch(() => {});
      _currentRgb = to;
    }
    return;
  }

  const steps        = Math.min(16, Math.max(1, Math.floor(durationMs / 50)));
  const stepInterval = Math.floor(durationMs / steps);

  for (let i = 1; i <= steps; i++) {
    if (_cancelToken !== token) return;
    const t = i / steps;
    const r = Math.round(from.r + (to.r - from.r) * t);
    const g = Math.round(from.g + (to.g - from.g) * t);
    const b = Math.round(from.b + (to.b - from.b) * t);
    await pixie.setColor(r, g, b, br).catch(() => {});
    _currentRgb = { r, g, b };
    if (i < steps) await new Promise(res => setTimeout(res, stepInterval));
  }
}

module.exports = { startLoop, stopLoop };
