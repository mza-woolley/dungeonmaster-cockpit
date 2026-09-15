// Shared HTML for the Map (TV) Display and Table Display windows.
// Both show the same map/fog/grid/pins background plus the per-seat
// combatant HUD (6 seats + center round/turn emblem).
function getDisplayHtml(title) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html {
    /* Seat text/spacing below is sized in rem off this root — scales with the
       window's actual resolution (calibrated at 1920px wide, same reference
       width the map grid uses) so 2K/4K windows don't render tiny fixed-px
       text in a box that itself already scales via vw/vh. */
    font-size: clamp(12px, calc(100vw / 1920 * 16px), 34px);
  }
  html, body {
    width:100%; height:100%;
    overflow:hidden;
    font-family: 'Vollkorn', Georgia, 'Times New Roman', serif;
    color:#e9ddc4;
    background:
      radial-gradient(ellipse at center, #17130b 0%, #100d08 65%, #040302 100%);
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
    background: rgba(10,8,5,0.55);
    border: 1px solid #312917;
    border-radius: 0.625rem;
    display:flex; flex-direction:column;
    justify-content:flex-start;
    align-items:center;
    text-align:center;
    padding: 0.375rem 0.625rem;
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
    width: 0.75rem; height: 0.75rem;
    border: 2px solid rgba(201,168,76,0.3);
    pointer-events: none;
  }
  .seat::before {
    top: 0.3125rem; left: 0.3125rem;
    border-right: none; border-bottom: none;
    border-top-left-radius: 0.375rem;
  }
  .seat::after {
    bottom: 0.3125rem; right: 0.3125rem;
    border-left: none; border-top: none;
    border-bottom-right-radius: 0.375rem;
  }
  .seat.active {
    border-color: #e6c883;
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
    padding: 0.375rem 0.625rem;
  }
  .seat.empty {
    align-items: center;
    color: #4d3f26;
    font-style: italic;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-size: 0.6875rem;
  }
  .seat.idle {
    align-items: center;
    text-align: center;
  }
  .seat.idle .seat-name { font-size: 1.0625rem; }
  .seat.idle .seat-sub { font-size: 0.6875rem; }
  .seat-turn-banner {
    display: none;
    align-self: flex-start;
    background: #b99a5b;
    color: #100d08;
    font-weight: bold;
    font-size: 0.5rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 0.0625rem 0.375rem;
    border-radius: 0.25rem;
    margin-bottom: 0.1875rem;
  }
  .seat.active .seat-turn-banner { display: inline-block; }
  .seat-name {
    font-size: 0.9375rem;
    font-weight: bold;
    line-height: 1.1;
  }
  .seat-sub {
    font-size: 0.625rem;
    color: #9a8a71;
    margin-top: 0.0625rem;
    letter-spacing: 0.05em;
  }
  .seat-stats {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.125rem;
    margin-top: 0.1875rem;
    width: 100%;
    font-size: 0.6875rem;
    color: #c9bda3;
  }
  .seat-init-row {
    display: flex;
    justify-content: flex-end;
  }
  .seat-init {
    flex-shrink: 0;
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
    text-align: center;
    border: 1px solid #312917;
    border-radius: 0.375rem;
    padding: 0.0625rem 0.375rem;
    background: rgba(0,0,0,0.22);
  }
  .seat-init-num {
    font-size: 0.8125rem;
    font-weight: bold;
    line-height: 1;
    color: #b99a5b;
  }
  .seat-init-label {
    font-size: 0.5rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #9a8a71;
  }
  .seat-hp-wrap {
    width: 100%;
    min-width: 0;
  }
  .seat-hp-bar-bg {
    width: 100%;
    height: 0.5rem;
    border-radius: 0.25rem;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.08);
    overflow: hidden;
  }
  .seat-hp-bar {
    height: 100%;
    border-radius: 0.25rem;
    transition: width 0.4s ease, background 0.4s ease, box-shadow 0.4s ease;
  }
  .seat-hp-label {
    font-size: 0.5625rem;
    margin-top: 0.0625rem;
    color: #9a8a71;
  }
  .seat-conditions {
    margin-top: 0.1875rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.1875rem;
  }
  .seat-condition {
    font-size: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0 0.25rem;
    border-radius: 0.5rem;
    border: 1px solid #7a2f1c;
    color: #d08d70;
    background: rgba(107,58,58,0.2);
  }
  .seat.dead {
    border-color: #7a2f1c;
    filter: grayscale(0.55) brightness(0.8);
  }
  .seat-dead-badge {
    font-size: 0.5625rem;
    font-weight: bold;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #d08d70;
    margin-top: 0.125rem;
  }

</style>
</head>
<body>
<div id="stage">
<canvas id="map-canvas"></canvas>
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
  // Scale seat-nameplate rem sizing off actual PHYSICAL pixel width, not the CSS
  // clamp(100vw...) this used to rely on alone — Windows' per-monitor DPI scaling
  // normalizes logical/CSS pixels specifically so apps look the same size across
  // displays, which silently cancels a vw-based scale on a 4K screen running at
  // 150-200% Windows scaling. screen.width * devicePixelRatio gives the true
  // native pixel count regardless of that OS-level setting. Overrides (and wins
  // over) the CSS clamp() fallback via higher specificity of an inline style.
  (function scaleRootFont() {
    const physicalWidth = (window.screen.width || window.innerWidth) * (window.devicePixelRatio || 1);
    const px = Math.min(40, Math.max(12, physicalWidth / 1920 * 16));
    document.documentElement.style.fontSize = px + 'px';
  })();

  const SEAT_IDS = ['top-1','top-2','left-1','left-2','right-1','right-2'];

  // ── Map background ──
  const mapCanvas = document.getElementById('map-canvas');
  const mapCtx    = mapCanvas.getContext('2d');

  let mapImg      = null;
  let fogCanvas   = null;
  let pins        = [];
  let hideAllNpcs = false;
  let hideAllMons = false;
  let gridEnabled = false;
  let gridSizePx  = 60;
  let feetPerSquare = 5;
  let pinSize     = 18;
  let currentMeasure = null; // { tool, startNx, startNy, curNx, curNy, gridSizePx, feetPerSquare } while a DM drag is live
  let pendingFogMask = null;
  let pulseRAF    = null; // keeps re-rendering while any pin is linked to the active turn (pulsing glow)

  function syncPulseLoop() {
    const hasActive = pins.some(p => p.active);
    if (hasActive && pulseRAF == null) {
      const tick = () => { renderMap(); pulseRAF = requestAnimationFrame(tick); };
      pulseRAF = requestAnimationFrame(tick);
    } else if (!hasActive && pulseRAF != null) {
      cancelAnimationFrame(pulseRAF);
      pulseRAF = null;
    }
  }

  const GRID_PX_LEGACY = { tiny: 20, small: 40, medium: 60, large: 80 }; // migrates old preset saves
  const GRID_REFERENCE_WIDTH = 1920; // grid sizes are calibrated at this rendered image width

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

    const scale = Math.min(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;

    mapCtx.drawImage(mapImg, dx, dy, dw, dh);
    if (fogCanvas) mapCtx.drawImage(fogCanvas, dx, dy, dw, dh);
    if (gridEnabled) drawMapGrid(dx, dy, dw, dh);
    drawMapPins(dx, dy, dw, dh);
    if (currentMeasure) drawMeasure(dx, dy, dw, dh);
  }

  // Mirrors drawMeasurementShape() in src/panels/TVDisplay.js — kept in sync by hand since
  // this script runs in a separate injected window context and can't share a module.
  function drawMeasure(dx, dy, dw, dh) {
    const m = currentMeasure;
    const sx = dx + m.startNx * dw, sy = dy + m.startNy * dh;
    const ex = dx + m.curNx * dw,   ey = dy + m.curNy * dh;
    const stepPx = (m.gridSizePx || gridSizePx) * (dw / GRID_REFERENCE_WIDTH);
    const fps    = m.feetPerSquare != null ? m.feetPerSquare : feetPerSquare;
    if (stepPx <= 0) return;

    const pxDist = Math.hypot(ex - sx, ey - sy);
    const toFeet = (px) => (px / stepPx) * fps;
    let label = '';

    mapCtx.save();
    mapCtx.lineWidth = 2;

    if (m.tool === 'ruler') {
      mapCtx.strokeStyle = 'rgba(255,255,255,0.9)';
      mapCtx.fillStyle   = 'rgba(255,255,255,0.9)';
      mapCtx.beginPath(); mapCtx.moveTo(sx, sy); mapCtx.lineTo(ex, ey); mapCtx.stroke();
      mapCtx.beginPath(); mapCtx.arc(sx, sy, 3, 0, Math.PI * 2); mapCtx.arc(ex, ey, 3, 0, Math.PI * 2); mapCtx.fill();
      label = toFeet(pxDist).toFixed(2) + ' ft';
    } else if (m.tool === 'sphere') {
      mapCtx.fillStyle   = 'rgba(120,170,255,0.18)';
      mapCtx.strokeStyle = 'rgba(120,170,255,0.9)';
      mapCtx.beginPath(); mapCtx.arc(sx, sy, pxDist, 0, Math.PI * 2); mapCtx.fill(); mapCtx.stroke();
      label = toFeet(pxDist).toFixed(2) + ' ft radius';
    } else if (m.tool === 'cone') {
      const angle = Math.atan2(ey - sy, ex - sx);
      const half  = Math.atan(0.5); // DMG rule: cone width at its end equals its length (53.13°)
      mapCtx.fillStyle   = 'rgba(255,150,100,0.18)';
      mapCtx.strokeStyle = 'rgba(255,150,100,0.9)';
      mapCtx.beginPath();
      mapCtx.moveTo(sx, sy);
      mapCtx.lineTo(sx + pxDist * Math.cos(angle - half), sy + pxDist * Math.sin(angle - half));
      mapCtx.lineTo(sx + pxDist * Math.cos(angle + half), sy + pxDist * Math.sin(angle + half));
      mapCtx.closePath(); mapCtx.fill(); mapCtx.stroke();
      label = toFeet(pxDist).toFixed(2) + ' ft';
    } else if (m.tool === 'line') {
      const angle   = Math.atan2(ey - sy, ex - sx);
      const halfWPx = (5 / fps) * stepPx / 2; // fixed 5ft width, standard for line spells
      const px_ = Math.cos(angle + Math.PI / 2) * halfWPx;
      const py_ = Math.sin(angle + Math.PI / 2) * halfWPx;
      mapCtx.fillStyle   = 'rgba(200,120,255,0.18)';
      mapCtx.strokeStyle = 'rgba(200,120,255,0.9)';
      mapCtx.beginPath();
      mapCtx.moveTo(sx + px_, sy + py_); mapCtx.lineTo(ex + px_, ey + py_);
      mapCtx.lineTo(ex - px_, ey - py_); mapCtx.lineTo(sx - px_, sy - py_);
      mapCtx.closePath(); mapCtx.fill(); mapCtx.stroke();
      label = toFeet(pxDist).toFixed(2) + ' ft (5ft wide)';
    } else if (m.tool === 'cube') {
      const side  = Math.max(Math.abs(ex - sx), Math.abs(ey - sy));
      const signX = ex >= sx ? 1 : -1;
      const signY = ey >= sy ? 1 : -1;
      mapCtx.fillStyle   = 'rgba(255,220,100,0.18)';
      mapCtx.strokeStyle = 'rgba(255,220,100,0.9)';
      mapCtx.fillRect(sx, sy, side * signX, side * signY);
      mapCtx.strokeRect(sx, sy, side * signX, side * signY);
      label = toFeet(side).toFixed(2) + ' ft cube';
    }

    if (label) {
      mapCtx.font         = 'bold 13px system-ui,sans-serif';
      mapCtx.textAlign    = 'center';
      mapCtx.shadowColor  = 'rgba(0,0,0,0.9)';
      mapCtx.shadowBlur   = 4;
      mapCtx.fillStyle    = '#fff';
      mapCtx.fillText(label, (sx + ex) / 2, (sy + ey) / 2 - 10);
      mapCtx.shadowBlur   = 0;
      mapCtx.textAlign    = 'left';
    }
    mapCtx.restore();
  }

  function drawMapGrid(dx, dy, dw, dh) {
    const step = gridSizePx * (dw / GRID_REFERENCE_WIDTH);
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

  const PIN_COLORS = { pc: '#5d8a7a', npc: '#b99a5b', monster: '#c65a28' };

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
      const isDead = !!pin.dead;
      const typeColor = PIN_COLORS[pin.type] || '#9a8a71';
      const color = isDead ? '#555' : typeColor;

      // Pulsing glow for the pin linked to the active turn — scales off pinSize.
      if (pin.active) {
        const pulse = (Math.sin(performance.now() / 450) + 1) / 2; // 0..1
        mapCtx.save();
        mapCtx.beginPath();
        mapCtx.arc(px, py, r + 3 + pulse * (r * 0.6 + 3), 0, Math.PI * 2);
        mapCtx.strokeStyle = 'rgba(255,255,255,' + (0.15 + pulse * 0.35).toFixed(2) + ')';
        mapCtx.lineWidth   = Math.max(1.5, r * 0.2);
        mapCtx.shadowColor = color;
        mapCtx.shadowBlur  = r * 0.8;
        mapCtx.stroke();
        mapCtx.restore();
      }

      mapCtx.globalAlpha = isDead ? 0.6 : 1;
      mapCtx.shadowColor = 'rgba(0,0,0,0.7)';
      mapCtx.shadowBlur  = 8;

      mapCtx.beginPath();
      mapCtx.arc(px, py, r, 0, Math.PI * 2);
      mapCtx.fillStyle = color;
      mapCtx.fill();
      mapCtx.strokeStyle = isDead ? typeColor : 'rgba(255,255,255,0.6)';
      mapCtx.lineWidth   = isDead ? 2.5 : 1.5;
      mapCtx.stroke();

      mapCtx.shadowBlur = 0;

      mapCtx.fillStyle    = '#fff';
      mapCtx.font         = 'bold ' + Math.max(10, Math.round(r * 0.65)) + 'px system-ui,sans-serif';
      mapCtx.textAlign    = 'center';
      mapCtx.textBaseline = 'middle';
      mapCtx.fillText(isDead ? '☠' : (pin.initials || '?'), px, py);

      mapCtx.font         = '11px system-ui,sans-serif';
      mapCtx.textBaseline = 'top';
      mapCtx.fillStyle    = isDead ? '#e08080' : '#fff';
      mapCtx.shadowColor  = 'rgba(0,0,0,0.9)';
      mapCtx.shadowBlur   = 4;
      mapCtx.fillText(isDead ? pin.name + ' (Dead)' : pin.name, px, py + r + 4);
      mapCtx.shadowBlur   = 0;
      mapCtx.globalAlpha  = 1;
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
      syncPulseLoop();
      return;
    }
    const img = new Image();
    img.onload = () => {
      mapImg = img;
      if (!fogCanvas) initFog(img.naturalWidth, img.naturalHeight);
      if (pendingFogMask) {
        const fogImg = new Image();
        fogImg.onload = () => {
          const fc = fogCanvas.getContext('2d');
          fc.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
          fc.drawImage(fogImg, 0, 0, fogCanvas.width, fogCanvas.height);
          pendingFogMask = null;
          renderMap();
        };
        fogImg.src = pendingFogMask;
      } else {
        renderMap();
      }
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

  window.applyMeasure = function(payload) {
    currentMeasure = payload || null;
    renderMap();
  };

  window.setPins = function({ pins: p, hideAllNpcs: hn, hideAllMonsters: hm, pinSize: ps }) {
    pins        = p || [];
    hideAllNpcs = !!hn;
    hideAllMons = !!hm;
    if (ps != null) pinSize = ps;
    renderMap();
    syncPulseLoop();
  };

  window.setGrid = function({ enabled, sizePx, feetPerSquare: fps }) {
    gridEnabled = !!enabled;
    if (sizePx != null) gridSizePx = typeof sizePx === 'string' ? (GRID_PX_LEGACY[sizePx] || 60) : sizePx;
    if (fps != null) feetPerSquare = fps;
    renderMap();
  };

  window.applyOverlayState = function(state) {
    gridEnabled = !!state.gridEnabled;
    if (state.gridSizePx != null) gridSizePx = state.gridSizePx;
    else if (state.gridSize) gridSizePx = GRID_PX_LEGACY[state.gridSize] || 60; // legacy preset save
    if (state.feetPerSquare != null) feetPerSquare = state.feetPerSquare;
    pins        = state.pins || [];
    if (state.pinSize != null) pinSize = state.pinSize;
    hideAllNpcs = !!state.hideAllNpcs;
    hideAllMons = !!state.hideAllMonsters;
    syncPulseLoop();
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
    } else if (state.fogMask && !mapImg) {
      // Map image hasn't finished loading yet — apply once it does.
      pendingFogMask = state.fogMask;
      renderMap();
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
    if (!maxHp) return '#8fae6f';
    const ratio = hp / maxHp;
    if (ratio > 0.5) return '#8fae6f';
    if (ratio > 0.25) return '#c9973f';
    return '#c65a28';
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
      const isDead = seat.hp === 0;
      const ratio = seat.maxHp ? Math.round((seat.hp / seat.maxHp) * 100) : 0;
      const color = hpColor(seat.hp, seat.maxHp);
      inner =
        '<div class="seat-turn-banner">Your Turn</div>' +
        '<div class="seat-name">' + seat.name + (isDead ? ' ☠' : '') + '</div>' +
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
        (isDead ? '<div class="seat-dead-badge">Dead</div>' : '') +
        (conditions ? '<div class="seat-conditions">' + conditions + '</div>' : '');
    }
    const stateClass = (!seat.inCombat ? ' idle' : (seat.active ? ' active' : '')) + (seat.inCombat && seat.hp === 0 ? ' dead' : '');
    el.className = 'seat' + verticalClass + stateClass;
    el.innerHTML = inner;
  }

  window.applyState = function(state) {
    const seats = (state && state.seats) || {};
    SEAT_IDS.forEach(id => {
      const el = document.getElementById('seat-' + id);
      if (el) renderSeat(el, seats[id]);
    });
  };

  window.setSeatsVisible = function(visible) {
    document.getElementById('grid').style.visibility = visible ? 'visible' : 'hidden';
  };
})();
</script>
</body>
</html>`;
}

module.exports = { getDisplayHtml };
