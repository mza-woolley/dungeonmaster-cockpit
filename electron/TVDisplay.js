const { BrowserWindow } = require('electron');
const path = require('path');
const fs   = require('fs');

let tvWindow = null;

function getTvWindow() { return tvWindow; }

function openTvWindow() {
  if (tvWindow && !tvWindow.isDestroyed()) {
    tvWindow.focus();
    return tvWindow;
  }

  tvWindow = new BrowserWindow({
    title: 'DM Display',
    backgroundColor: '#000000',
    // Start maximized — meant for a second screen
    fullscreen: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'tvPreload.js'),
    },
  });

  tvWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getTvHtml())}`);
  tvWindow.setMenuBarVisibility(false);

  tvWindow.on('closed', () => { tvWindow = null; });
  return tvWindow;
}

function closeTvWindow() {
  if (tvWindow && !tvWindow.isDestroyed()) tvWindow.close();
  tvWindow = null;
}

function pushImage(imagePath) {
  if (!tvWindow || tvWindow.isDestroyed()) openTvWindow();
  // Read file as base64 and push via executeJavaScript
  const ext  = path.extname(imagePath).toLowerCase().replace('.', '');
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
             : ext === 'png' ? 'image/png'
             : ext === 'webp' ? 'image/webp'
             : ext === 'gif' ? 'image/gif'
             : 'image/jpeg';
  const data = fs.readFileSync(imagePath);
  const b64  = data.toString('base64');
  const dataUrl = `data:${mime};base64,${b64}`;
  tvWindow.webContents.executeJavaScript(`showImage(${JSON.stringify(dataUrl)})`);
}

function clearTvDisplay() {
  if (tvWindow && !tvWindow.isDestroyed()) {
    tvWindow.webContents.executeJavaScript(`showImage(null)`);
  }
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
    display:flex; align-items:center; justify-content:center;
  }
  #img {
    max-width:100%; max-height:100%;
    object-fit:contain;
    opacity:0;
    transition:opacity 0.4s ease;
  }
  #img.visible { opacity:1; }
  #placeholder {
    display:flex; flex-direction:column;
    align-items:center; gap:16px;
    color:#2e2820;
    font-family:Georgia,serif;
    text-align:center;
  }
  #placeholder .sigil { font-size:64px; opacity:0.3; }
  #placeholder p { font-size:18px; letter-spacing:0.2em; text-transform:uppercase; }
</style>
</head>
<body>
  <div id="placeholder">
    <div class="sigil">⚔</div>
    <p>DM Display</p>
  </div>
  <img id="img" src="" alt=""/>
  <script>
    const img = document.getElementById('img');
    const placeholder = document.getElementById('placeholder');
    function showImage(dataUrl) {
      if (!dataUrl) {
        img.classList.remove('visible');
        placeholder.style.display = 'flex';
        return;
      }
      img.src = dataUrl;
      img.onload = () => {
        placeholder.style.display = 'none';
        img.classList.add('visible');
      };
    }
  </script>
</body>
</html>`;
}

module.exports = { openTvWindow, closeTvWindow, pushImage, clearTvDisplay, getTvWindow };
