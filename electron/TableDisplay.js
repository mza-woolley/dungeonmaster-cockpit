const { BrowserWindow, screen } = require('electron');
const path = require('path');
const fs   = require('fs');
const tv   = require('./tvDisplay');

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

  const target = displays.find(d => d.id !== primary.id && (!tvDisplay || d.id !== tvDisplay.id))
    || displays.find(d => d.id !== primary.id)
    || primary;

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
    tableWindow.setBounds(target.bounds);
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

function getTableHtml() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Table Display</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body {
    width:100%; height:100%;
    overflow:hidden;
    font-family: 'Cinzel', 'Trajan Pro', Georgia, 'Times New Roman', serif;
    color:#e8e0d0;
    background:
      radial-gradient(ellipse at center, #1d160d 0%, #0c0a08 65%, #040302 100%);
  }
  #stage {
    position: relative;
    width: 100vw; height: 100vh;
    overflow: hidden;
  }
  #map-canvas {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: -1;
  }
  #stage::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      repeating-linear-gradient(45deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 5px),
      repeating-linear-gradient(-45deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 5px);
    mix-blend-mode: overlay;
  }
  #center-emblem {
    position: absolute;
    top: 50%; left: 51%;
    transform: translate(-50%, -50%);
    width: 26vw; height: 26vw;
    max-width: 380px; max-height: 380px;
    min-width: 180px; min-height: 180px;
    border-radius: 50%;
    border: 1px solid rgba(201,168,76,0.22);
    background: radial-gradient(circle, rgba(201,168,76,0.07) 0%, rgba(201,168,76,0.015) 55%, transparent 75%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    pointer-events: none;
    z-index: 0;
  }
  #center-emblem::before {
    content: '';
    position: absolute;
    inset: 14%;
    border-radius: 50%;
    border: 1px dashed rgba(201,168,76,0.16);
  }
  #center-emblem::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 50%;
    background:
      linear-gradient(0deg, transparent 49.3%, rgba(201,168,76,0.18) 49.3%, rgba(201,168,76,0.18) 50.7%, transparent 50.7%),
      linear-gradient(90deg, transparent 49.3%, rgba(201,168,76,0.18) 49.3%, rgba(201,168,76,0.18) 50.7%, transparent 50.7%),
      linear-gradient(45deg, transparent 49.3%, rgba(201,168,76,0.1) 49.3%, rgba(201,168,76,0.1) 50.7%, transparent 50.7%),
      linear-gradient(135deg, transparent 49.3%, rgba(201,168,76,0.1) 49.3%, rgba(201,168,76,0.1) 50.7%, transparent 50.7%);
    -webkit-mask: radial-gradient(circle, transparent 60%, #000 61%);
            mask: radial-gradient(circle, transparent 60%, #000 61%);
  }
  .emblem-round-label {
    font-size: 12px;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: #8a7c64;
  }
  .emblem-round-num {
    font-size: 4.5vw;
    font-weight: bold;
    color: #c9a84c;
    line-height: 1.1;
    text-shadow: 0 0 20px rgba(201,168,76,0.45);
  }
  .emblem-turn-label {
    margin-top: 6px;
    font-size: 12px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #b9ad97;
    max-width: 80%;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #grid {
    position: relative;
    z-index: 1;
    width:100%; height:100%;
    display:grid;
    grid-template-columns: 1.5fr 2.6fr 1.5fr 2.6fr 1fr;
    grid-template-rows: 1fr 1fr;
    grid-template-areas:
      "top1 left1 . right1 ."
      "top2 left2 . right2 .";
    gap: 10px;
    padding: 10px;
  }
  .seat {
    grid-area: var(--area);
    transform: rotate(var(--rotate));
    border: 1px solid #3a3024;
    border-radius: 10px;
    background: linear-gradient(160deg, rgba(255,255,255,0.05), rgba(0,0,0,0.18));
    display:flex; flex-direction:column;
    justify-content:flex-start;
    align-items:center;
    text-align:center;
    padding: 6px 10px;
    position: relative;
    transition: box-shadow 0.3s, border-color 0.3s;
    overflow: hidden;
  }
  /* Far L/R and DM L/R: same "thickness" as the Top L/R strips (5vw),
     centered in their (taller) grid cell so the rest shows the map. */
  .seat:not(.vertical) {
    height: 5vw;
    align-self: var(--edge, center);
  }
  .seat::before, .seat::after {
    content: '';
    position: absolute;
    width: 12px; height: 12px;
    border: 2px solid rgba(201,168,76,0.3);
    pointer-events: none;
  }
  .seat::before {
    top: 5px; left: 5px;
    border-right: none; border-bottom: none;
    border-top-left-radius: 6px;
  }
  .seat::after {
    bottom: 5px; right: 5px;
    border-left: none; border-top: none;
    border-bottom-right-radius: 6px;
  }
  .seat.active {
    border-color: #e0c068;
    animation: seat-pulse 2.4s ease-in-out infinite;
  }
  @keyframes seat-pulse {
    0%, 100% { box-shadow: 0 0 22px rgba(201,168,76,0.4), inset 0 0 22px rgba(201,168,76,0.1); }
    50%      { box-shadow: 0 0 42px rgba(201,168,76,0.8), inset 0 0 34px rgba(201,168,76,0.22); }
  }
  /* Tall/narrow seats (Top Left/Right): the seat itself becomes the
     wide-short (landscape) box, rotated 90deg and pinned to the left
     edge of its grid cell - same thin-strip footprint as Far/DM L/R,
     just rotated to fit the vertical column. */
  .seat.vertical {
    position: absolute;
    top: 50%; left: 2.5vw;
    width: 48vh;
    height: 5vw;
    transform: translate(-50%, -50%) rotate(90deg);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    text-align: center;
    padding: 6px 10px;
  }
  .seat.empty {
    align-items: center;
    color: #4a4338;
    font-style: italic;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-size: 11px;
  }
  .seat.idle {
    align-items: center;
    text-align: center;
  }
  .seat.idle .seat-name { font-size: 17px; }
  .seat.idle .seat-sub { font-size: 11px; }
  .seat-turn-banner {
    display: none;
    align-self: flex-start;
    background: #c9a84c;
    color: #1a140a;
    font-weight: bold;
    font-size: 8px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 1px 6px;
    border-radius: 4px;
    margin-bottom: 3px;
  }
  .seat.active .seat-turn-banner { display: inline-block; }
  .seat-name {
    font-size: 15px;
    font-weight: bold;
    line-height: 1.1;
  }
  .seat-sub {
    font-size: 10px;
    color: #b9ad97;
    margin-top: 1px;
    letter-spacing: 0.05em;
  }
  .seat-stats {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
    margin-top: 3px;
    width: 100%;
    font-size: 11px;
    color: #d8cdb8;
  }
  .seat-init-row {
    display: flex;
    justify-content: flex-end;
  }
  .seat-init {
    flex-shrink: 0;
    display: flex;
    align-items: baseline;
    gap: 4px;
    text-align: center;
    border: 1px solid #3a3024;
    border-radius: 6px;
    padding: 1px 6px;
    background: rgba(0,0,0,0.22);
  }
  .seat-init-num {
    font-size: 13px;
    font-weight: bold;
    line-height: 1;
    color: #c9a84c;
  }
  .seat-init-label {
    font-size: 8px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #b9ad97;
  }
  .seat-hp-wrap {
    width: 100%;
    min-width: 0;
  }
  .seat-hp-bar-bg {
    width: 100%;
    height: 8px;
    border-radius: 4px;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.08);
    overflow: hidden;
  }
  .seat-hp-bar {
    height: 100%;
    border-radius: 4px;
    transition: width 0.4s ease, background 0.4s ease, box-shadow 0.4s ease;
  }
  .seat-hp-label {
    font-size: 9px;
    margin-top: 1px;
    color: #b9ad97;
  }
  .seat-conditions {
    margin-top: 3px;
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .seat-condition {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0px 4px;
    border-radius: 8px;
    border: 1px solid #6b3a3a;
    color: #e0a0a0;
    background: rgba(107,58,58,0.2);
  }

</style>
</head>
<body>
<div id="stage">
<canvas id="map-canvas"></canvas>
<div id="center-emblem">
  <div class="emblem-round-label">Round</div>
  <div class="emblem-round-num" id="emblem-round-num">—</div>
  <div class="emblem-turn-label" id="emblem-turn-label"></div>
</div>
<div id="grid">
  <div id="seat-top-1"   class="seat vertical empty" style="--area:top1; --rotate:0deg"></div>
  <div id="seat-top-2"   class="seat vertical empty" style="--area:top2; --rotate:0deg"></div>
  <div id="seat-left-1"  class="seat empty" style="--area:left1; --rotate:180deg; --edge:flex-start"></div>
  <div id="seat-left-2"  class="seat empty" style="--area:left2; --rotate:0deg; --edge:flex-end"></div>
  <div id="seat-right-1" class="seat empty" style="--area:right1; --rotate:180deg; --edge:flex-start"></div>
  <div id="seat-right-2" class="seat empty" style="--area:right2; --rotate:0deg; --edge:flex-end"></div>
</div>
</div>
<script>
(function() {
  const SEAT_IDS = ['top-1','top-2','left-1','left-2','right-1','right-2'];

  // ── Map background (ported from TV Display) ──
  const mapCanvas = document.getElementById('map-canvas');
  const mapCtx    = mapCanvas.getContext('2d');

  let mapImg      = null;
  let fogCanvas   = null;
  let pins        = [];
  let hideAllNpcs = false;
  let hideAllMons = false;
  let gridEnabled = false;
  let gridSize    = 'medium';
  let pinSize     = 18;

  const GRID_PX = { tiny: 20, small: 40, medium: 60, large: 80 };

  function resizeMapCanvas() {
    mapCanvas.width  = window.innerWidth;
    mapCanvas.height = window.innerHeight;
    renderMap();
  }
  window.addEventListener('resize', resizeMapCanvas);

  function initFog(w, h) {
    fogCanvas        = document.createElement('canvas');
    fogCanvas.width  = w;
    fogCanvas.height = h;
    const fc = fogCanvas.getContext('2d');
    fc.fillStyle = '#000';
    fc.fillRect(0, 0, w, h);
  }

  function isFogged(nx, ny) {
    if (!fogCanvas) return false;
    const px = Math.round(nx * fogCanvas.width);
    const py = Math.round(ny * fogCanvas.height);
    const fc = fogCanvas.getContext('2d');
    const pixel = fc.getImageData(px, py, 1, 1).data;
    return pixel[3] > 30;
  }

  function renderMap() {
    const cw = mapCanvas.width, ch = mapCanvas.height;
    mapCtx.clearRect(0, 0, cw, ch);
    if (!mapImg) return;
    const iw = mapImg.naturalWidth, ih = mapImg.naturalHeight;

    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;

    mapCtx.drawImage(mapImg, dx, dy, dw, dh);
    if (fogCanvas) mapCtx.drawImage(fogCanvas, dx, dy, dw, dh);
    if (gridEnabled) drawMapGrid(dx, dy, dw, dh);
    drawMapPins(dx, dy, dw, dh);
  }

  function drawMapGrid(dx, dy, dw, dh) {
    const step = GRID_PX[gridSize] || 60;
    mapCtx.save();
    mapCtx.strokeStyle = 'rgba(255,255,255,0.18)';
    mapCtx.lineWidth   = 0.8;
    mapCtx.beginPath();
    for (let x = dx; x <= dx + dw; x += step) {
      mapCtx.moveTo(x, dy); mapCtx.lineTo(x, dy + dh);
    }
    for (let y = dy; y <= dy + dh; y += step) {
      mapCtx.moveTo(dx, y); mapCtx.lineTo(dx + dw, y);
    }
    mapCtx.stroke();
    mapCtx.restore();
  }

  const PIN_COLORS = { pc: '#4a8fd4', npc: '#c9a84c', monster: '#c94a4a' };

  function drawMapPins(dx, dy, dw, dh) {
    if (!pins.length) return;
    mapCtx.save();

    pins.forEach(pin => {
      if (pin.hidden) return;
      if (pin.type === 'npc'     && hideAllNpcs) return;
      if (pin.type === 'monster' && hideAllMons) return;
      if (isFogged(pin.x, pin.y)) return;

      const px = dx + pin.x * dw;
      const py = dy + pin.y * dh;
      const r  = pinSize;
      const color = PIN_COLORS[pin.type] || '#888';

      mapCtx.shadowColor = 'rgba(0,0,0,0.7)';
      mapCtx.shadowBlur  = 8;

      mapCtx.beginPath();
      mapCtx.arc(px, py, r, 0, Math.PI * 2);
      mapCtx.fillStyle = color;
      mapCtx.fill();
      mapCtx.strokeStyle = 'rgba(255,255,255,0.6)';
      mapCtx.lineWidth   = 1.5;
      mapCtx.stroke();

      mapCtx.shadowBlur = 0;

      mapCtx.fillStyle    = '#fff';
      mapCtx.font         = 'bold 11px system-ui,sans-serif';
      mapCtx.textAlign    = 'center';
      mapCtx.textBaseline = 'middle';
      mapCtx.fillText(pin.initials || '?', px, py);

      mapCtx.font         = '11px system-ui,sans-serif';
      mapCtx.textBaseline = 'top';
      mapCtx.fillStyle    = '#fff';
      mapCtx.shadowColor  = 'rgba(0,0,0,0.9)';
      mapCtx.shadowBlur   = 4;
      mapCtx.fillText(pin.name, px, py + r + 4);
      mapCtx.shadowBlur   = 0;
    });

    mapCtx.textAlign    = 'left';
    mapCtx.textBaseline = 'alphabetic';
    mapCtx.restore();
  }

  window.setMap = function(dataUrl) {
    if (!dataUrl) {
      mapImg = null;
      fogCanvas = null; pins = [];
      renderMap();
      return;
    }
    const img = new Image();
    img.onload = () => {
      mapImg = img;
      if (!fogCanvas) initFog(img.naturalWidth, img.naturalHeight);
      renderMap();
    };
    img.src = dataUrl;
  };

  window.applyBrushStroke = function(nx, ny, radius) {
    if (!fogCanvas) return;
    const fc = fogCanvas.getContext('2d');
    fc.globalCompositeOperation = 'destination-out';
    fc.beginPath();
    fc.arc(nx * fogCanvas.width, ny * fogCanvas.height, radius * fogCanvas.width, 0, Math.PI * 2);
    fc.fill();
    fc.globalCompositeOperation = 'source-over';
    renderMap();
  };

  window.applyFogMask = function(dataUrl) {
    if (!dataUrl || !mapImg) return;
    const img = new Image();
    img.onload = () => {
      if (!fogCanvas) initFog(mapImg.naturalWidth, mapImg.naturalHeight);
      const fc = fogCanvas.getContext('2d');
      fc.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
      fc.drawImage(img, 0, 0, fogCanvas.width, fogCanvas.height);
      renderMap();
    };
    img.src = dataUrl;
  };

  window.setPins = function({ pins: p, hideAllNpcs: hn, hideAllMonsters: hm, pinSize: ps }) {
    pins        = p || [];
    hideAllNpcs = !!hn;
    hideAllMons = !!hm;
    if (ps != null) pinSize = ps;
    renderMap();
  };

  window.setGrid = function({ enabled, size }) {
    gridEnabled = !!enabled;
    gridSize    = size || 'medium';
    renderMap();
  };

  window.applyOverlayState = function(state) {
    gridEnabled = !!state.gridEnabled;
    gridSize    = state.gridSize || 'medium';
    pins        = state.pins || [];
    if (state.pinSize != null) pinSize = state.pinSize;
    hideAllNpcs = !!state.hideAllNpcs;
    hideAllMons = !!state.hideAllMonsters;
    if (state.fogMask && mapImg) {
      const img = new Image();
      img.onload = () => {
        if (!fogCanvas) initFog(mapImg.naturalWidth, mapImg.naturalHeight);
        const fc = fogCanvas.getContext('2d');
        fc.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
        fc.drawImage(img, 0, 0, fogCanvas.width, fogCanvas.height);
        renderMap();
      };
      img.src = state.fogMask;
    } else {
      renderMap();
    }
  };

  resizeMapCanvas();

  const CONDITION_ICONS = {
    poisoned: '☠', stunned: '✦', prone: '⤵', grappled: '✊', restrained: '⛓',
    blinded: '⚫', deafened: '🔇', frightened: '😨', paralyzed: '⚡', charmed: '💗',
    unconscious: '💤', invisible: '👻', exhaustion: '🥱', incapacitated: '⏸'
  };
  function conditionIcon(c) {
    const key = String(c).toLowerCase().split(' ')[0];
    return CONDITION_ICONS[key] || '◆';
  }

  function hpColor(hp, maxHp) {
    if (!maxHp) return '#4caf50';
    const ratio = hp / maxHp;
    if (ratio > 0.5) return '#4caf50';
    if (ratio > 0.25) return '#ff9800';
    return '#f44336';
  }

  function renderSeat(el, seat) {
    const isVertical = el.classList.contains('vertical');
    const verticalClass = isVertical ? ' vertical' : '';
    if (!seat) {
      el.className = 'seat' + verticalClass + ' empty';
      el.innerHTML = '— empty seat —';
      return;
    }
    const sub = [seat.species, seat.class].filter(Boolean).join(' ');
    let inner;
    if (!seat.inCombat) {
      inner =
        '<div class="seat-name">' + seat.name + '</div>' +
        (sub ? '<div class="seat-sub">' + sub + '</div>' : '');
    } else {
      const conditions = (seat.conditions || []).map(c =>
        '<span class="seat-condition">' + conditionIcon(c) + ' ' + c + '</span>'
      ).join('');
      const ratio = seat.maxHp ? Math.round((seat.hp / seat.maxHp) * 100) : 0;
      const color = hpColor(seat.hp, seat.maxHp);
      inner =
        '<div class="seat-turn-banner">Your Turn</div>' +
        '<div class="seat-name">' + seat.name + '</div>' +
        (sub ? '<div class="seat-sub">' + sub + (seat.ac != null ? ' &middot; AC ' + seat.ac : '') + '</div>' : '') +
        '<div class="seat-stats">' +
          '<div class="seat-init-row">' +
            '<div class="seat-init">' +
              '<div class="seat-init-num">' + seat.initiative + '</div>' +
              '<div class="seat-init-label">Init</div>' +
            '</div>' +
          '</div>' +
          '<div class="seat-hp-wrap">' +
            '<div class="seat-hp-bar-bg"><div class="seat-hp-bar" style="width:' + ratio + '%; background:linear-gradient(90deg, ' + color + 'aa, ' + color + '); box-shadow: 0 0 14px ' + color + '99"></div></div>' +
            '<div class="seat-hp-label">HP ' + seat.hp + ' / ' + seat.maxHp + '</div>' +
          '</div>' +
        '</div>' +
        (conditions ? '<div class="seat-conditions">' + conditions + '</div>' : '');
    }
    const stateClass = !seat.inCombat ? ' idle' : (seat.active ? ' active' : '');
    el.className = 'seat' + verticalClass + stateClass;
    el.innerHTML = inner;
  }

  window.applyState = function(state) {
    const seats = (state && state.seats) || {};
    SEAT_IDS.forEach(id => {
      const el = document.getElementById('seat-' + id);
      if (el) renderSeat(el, seats[id]);
    });

    const roundEl = document.getElementById('emblem-round-num');
    const turnEl  = document.getElementById('emblem-turn-label');
    if (roundEl) roundEl.textContent = (state && state.round != null) ? state.round : '—';
    if (turnEl) {
      const activeSeat = Object.values(seats).find(s => s && s.inCombat && s.active);
      turnEl.textContent = activeSeat ? activeSeat.name + "'s Turn" : '';
    }
  };
})();
</script>
</body>
</html>`;
}

module.exports = {
  openTableWindow, closeTableWindow, getTableWindow, syncState,
  syncMapImage, clearMap, syncMapFog, syncMapBrushStroke, syncMapPins, syncMapGrid, syncMapOverlay,
};
