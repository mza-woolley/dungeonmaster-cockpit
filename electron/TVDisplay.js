const { BrowserWindow, screen } = require('electron');
const path = require('path');
const fs   = require('fs');

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
    tvWindow.setBounds(target.bounds);
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
  tvWindow.webContents.executeJavaScript(js).catch(() => {});
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

function getTvHtml() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>DM Display</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body {
    width:100%; height:100%;
    background:#000;
    overflow:hidden;
  }
  #stage {
    position:relative;
    width:100%; height:100%;
    display:flex; align-items:center; justify-content:center;
  }
  #map-canvas {
    position:absolute;
    top:0; left:0;
    width:100%; height:100%;
  }
  #placeholder {
    display:flex; flex-direction:column;
    align-items:center; gap:16px;
    color:#2e2820;
    font-family:Georgia,serif;
    text-align:center;
    position:relative; z-index:1;
  }
  #placeholder .sigil { font-size:64px; opacity:0.3; }
  #placeholder p { font-size:18px; letter-spacing:0.2em; text-transform:uppercase; }
</style>
</head>
<body>
<div id="stage">
  <div id="placeholder">
    <div class="sigil">&#9876;</div>
    <p>DM Display</p>
  </div>
  <canvas id="map-canvas" style="display:none;"></canvas>
</div>
<script>
(function() {
  const canvas      = document.getElementById('map-canvas');
  const ctx         = canvas.getContext('2d');
  const placeholder = document.getElementById('placeholder');

  // ── State ──
  let mapImg      = null;
  let fogCanvas   = null;   // offscreen canvas holding the fog mask
  let pins        = [];
  let hideAllNpcs = false;
  let hideAllMons = false;
  let gridEnabled = false;
  let gridSize    = 'medium';
  let pinSize     = 18;

  const GRID_PX = { tiny: 20, small: 40, medium: 60, large: 80 };

  // ── Sizing ──
  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    render();
  }
  window.addEventListener('resize', resizeCanvas);

  // ── Fog helpers ──
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
    return pixel[3] > 30; // alpha > ~12% means still fogged
  }

  // ── Render ──
  function render() {
    if (!mapImg) return;
    const cw = canvas.width, ch = canvas.height;
    const iw = mapImg.naturalWidth, ih = mapImg.naturalHeight;

    // contain-fit
    const scale = Math.min(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;

    ctx.clearRect(0, 0, cw, ch);

    // 1. map
    ctx.drawImage(mapImg, dx, dy, dw, dh);

    // 2. fog — fully opaque
    if (fogCanvas) {
      ctx.drawImage(fogCanvas, dx, dy, dw, dh);
    }

    // 3. grid
    if (gridEnabled) drawGrid(dx, dy, dw, dh);

    // 4. pins (suppressed if under fog)
    drawPins(dx, dy, dw, dh);
  }

  function drawGrid(dx, dy, dw, dh) {
    const step = GRID_PX[gridSize] || 60;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    for (let x = dx; x <= dx + dw; x += step) {
      ctx.moveTo(x, dy); ctx.lineTo(x, dy + dh);
    }
    for (let y = dy; y <= dy + dh; y += step) {
      ctx.moveTo(dx, y); ctx.lineTo(dx + dw, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  const PIN_COLORS = { pc: '#4a8fd4', npc: '#c9a84c', monster: '#c94a4a' };

  function drawPins(dx, dy, dw, dh) {
    if (!pins.length) return;
    ctx.save();

    pins.forEach(pin => {
      if (pin.hidden) return;
      if (pin.type === 'npc'     && hideAllNpcs) return;
      if (pin.type === 'monster' && hideAllMons) return;

      // Check fog
      if (isFogged(pin.x, pin.y)) return;

      const px = dx + pin.x * dw;
      const py = dy + pin.y * dh;
      const r  = pinSize;
      const color = PIN_COLORS[pin.type] || '#888';

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur  = 8;

      // Circle
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Initials
      ctx.fillStyle   = '#fff';
      ctx.font        = 'bold 11px system-ui,sans-serif';
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pin.initials || '?', px, py);

      // Name label
      ctx.font        = '11px system-ui,sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillStyle   = '#fff';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur  = 4;
      ctx.fillText(pin.name, px, py + r + 4);
      ctx.shadowBlur  = 0;
    });

    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  // ── Public API called via executeJavaScript ──

  window.setMap = function(dataUrl) {
    if (!dataUrl) {
      mapImg = null;
      canvas.style.display = 'none';
      placeholder.style.display = 'flex';
      fogCanvas = null; pins = [];
      return;
    }
    const img = new Image();
    img.onload = () => {
      mapImg = img;
      if (!fogCanvas) initFog(img.naturalWidth, img.naturalHeight);
      resizeCanvas();
      canvas.style.display = 'block';
      placeholder.style.display = 'none';
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
    render();
  };

  window.applyFogMask = function(dataUrl) {
    if (!dataUrl || !mapImg) return;
    const img = new Image();
    img.onload = () => {
      if (!fogCanvas) initFog(mapImg.naturalWidth, mapImg.naturalHeight);
      const fc = fogCanvas.getContext('2d');
      fc.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
      fc.drawImage(img, 0, 0, fogCanvas.width, fogCanvas.height);
      render();
    };
    img.src = dataUrl;
  };

  window.setPins = function({ pins: p, hideAllNpcs: hn, hideAllMonsters: hm, pinSize: ps }) {
    pins        = p || [];
    hideAllNpcs = !!hn;
    hideAllMons = !!hm;
    if (ps != null) pinSize = ps;
    render();
  };

  window.setGrid = function({ enabled, size }) {
    gridEnabled = !!enabled;
    gridSize    = size || 'medium';
    render();
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
        render();
      };
      img.src = state.fogMask;
    } else {
      render();
    }
  };

  resizeCanvas();
})();
</script>
</body>
</html>`;
}

module.exports = { openTvWindow, closeTvWindow, pushImage, clearTvDisplay, syncFog, syncBrushStroke, syncPins, syncGrid, syncOverlay, getTvWindow };
