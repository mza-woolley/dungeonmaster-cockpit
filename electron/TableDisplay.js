const { BrowserWindow, screen } = require('electron');
const path = require('path');
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
    background:#0c0a08;
    overflow:hidden;
    font-family: Georgia, serif;
    color:#e8e0d0;
  }
  #stage {
    position: relative;
    width: 100vw; height: 100vh;
    overflow: hidden;
  }
  #grid {
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
    background: rgba(255,255,255,0.02);
    display:flex; flex-direction:column;
    justify-content:center;
    align-items:center;
    text-align:center;
    padding: 14px 18px;
    position: relative;
    transition: box-shadow 0.3s, border-color 0.3s;
    overflow: hidden;
  }
  .seat.active {
    border-color: #c9a84c;
    box-shadow: 0 0 24px rgba(201,168,76,0.55), inset 0 0 24px rgba(201,168,76,0.15);
  }
  /* Tall/narrow seats (Top Left/Right): the cell stays tall-narrow so it
     sits flush in the left column with no overlap, but its content lives
     in a "rotor" pre-sized to the SWAPPED (wide-short) dimensions and then
     rotated 90deg - lands back at the cell's tall-narrow footprint. */
  .seat.vertical {
    padding: 0;
  }
  .seat.vertical .rotor {
    position: absolute;
    top: 50%; left: 50%;
    width: 48vh;
    height: 16vw;
    transform: translate(-50%, -50%) rotate(90deg);
    display: flex; flex-direction: column;
    justify-content: center; align-items: center; text-align: center;
    padding: 14px 18px;
    box-sizing: border-box;
  }
  .seat.empty {
    align-items: center;
    color: #4a4338;
    font-style: italic;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-size: 14px;
  }
  .seat.idle {
    align-items: center;
    text-align: center;
  }
  .seat.idle .seat-name { font-size: 30px; }
  .seat.idle .seat-sub { font-size: 16px; }
  .seat-turn-banner {
    display: none;
    align-self: flex-start;
    background: #c9a84c;
    color: #1a140a;
    font-weight: bold;
    font-size: 12px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: 4px;
    margin-bottom: 8px;
  }
  .seat.active .seat-turn-banner { display: inline-block; }
  .seat-name {
    font-size: 26px;
    font-weight: bold;
    line-height: 1.1;
  }
  .seat-sub {
    font-size: 14px;
    color: #b9ad97;
    margin-top: 2px;
    letter-spacing: 0.05em;
  }
  .seat-stats {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 10px;
    font-size: 15px;
    color: #d8cdb8;
  }
  .seat-hp-wrap {
    flex: 1;
    min-width: 0;
  }
  .seat-hp-bar-bg {
    width: 100%;
    height: 14px;
    border-radius: 7px;
    background: rgba(255,255,255,0.08);
    overflow: hidden;
  }
  .seat-hp-bar {
    height: 100%;
    border-radius: 7px;
    transition: width 0.4s ease, background 0.4s ease;
  }
  .seat-hp-label {
    font-size: 13px;
    margin-top: 4px;
    color: #b9ad97;
  }
  .seat-init {
    flex-shrink: 0;
    text-align: center;
    border: 1px solid #3a3024;
    border-radius: 8px;
    padding: 4px 10px;
  }
  .seat-init-num {
    font-size: 22px;
    font-weight: bold;
    line-height: 1;
  }
  .seat-init-label {
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #b9ad97;
  }
  .seat-conditions {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .seat-condition {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 2px 8px;
    border-radius: 10px;
    border: 1px solid #6b3a3a;
    color: #e0a0a0;
    background: rgba(107,58,58,0.2);
  }

</style>
</head>
<body>
<div id="stage">
<div id="grid">
  <div id="seat-top-1"   class="seat vertical empty" style="--area:top1; --rotate:0deg"></div>
  <div id="seat-top-2"   class="seat vertical empty" style="--area:top2; --rotate:0deg"></div>
  <div id="seat-left-1"  class="seat empty" style="--area:left1; --rotate:180deg"></div>
  <div id="seat-left-2"  class="seat empty" style="--area:left2; --rotate:0deg"></div>
  <div id="seat-right-1" class="seat empty" style="--area:right1; --rotate:180deg"></div>
  <div id="seat-right-2" class="seat empty" style="--area:right2; --rotate:0deg"></div>
</div>
</div>
<script>
(function() {
  const SEAT_IDS = ['top-1','top-2','left-1','left-2','right-1','right-2'];

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
      el.innerHTML = isVertical ? '<div class="rotor">— empty seat —</div>' : '— empty seat —';
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
        '<span class="seat-condition">' + c + '</span>'
      ).join('');
      const ratio = seat.maxHp ? Math.round((seat.hp / seat.maxHp) * 100) : 0;
      inner =
        '<div class="seat-turn-banner">Your Turn</div>' +
        '<div class="seat-name">' + seat.name + '</div>' +
        (sub ? '<div class="seat-sub">' + sub + (seat.ac != null ? ' &middot; AC ' + seat.ac : '') + '</div>' : '') +
        '<div class="seat-stats">' +
          '<div class="seat-hp-wrap">' +
            '<div class="seat-hp-bar-bg"><div class="seat-hp-bar" style="width:' + ratio + '%; background:' + hpColor(seat.hp, seat.maxHp) + '"></div></div>' +
            '<div class="seat-hp-label">HP ' + seat.hp + ' / ' + seat.maxHp + '</div>' +
          '</div>' +
          '<div class="seat-init">' +
            '<div class="seat-init-num">' + seat.initiative + '</div>' +
            '<div class="seat-init-label">Init</div>' +
          '</div>' +
        '</div>' +
        (conditions ? '<div class="seat-conditions">' + conditions + '</div>' : '');
    }
    const stateClass = !seat.inCombat ? ' idle' : (seat.active ? ' active' : '');
    el.className = 'seat' + verticalClass + stateClass;
    el.innerHTML = isVertical ? '<div class="rotor">' + inner + '</div>' : inner;
  }

  window.applyState = function(state) {
    const seats = (state && state.seats) || {};
    SEAT_IDS.forEach(id => {
      const el = document.getElementById('seat-' + id);
      if (el) renderSeat(el, seats[id]);
    });
  };
})();
</script>
</body>
</html>`;
}

module.exports = { openTableWindow, closeTableWindow, getTableWindow, syncState };
