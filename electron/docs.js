const { app, dialog, BrowserWindow, nativeImage } = require('electron');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

const DOCS_ROOT  = path.join(__dirname, '..', 'documentation');
const ASSETS_DIR = path.join(DOCS_ROOT, 'assets');

function ensureDirs() {
  if (!fs.existsSync(DOCS_ROOT))  fs.mkdirSync(DOCS_ROOT,  { recursive: true });
  if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

function buildTree(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const nodes = [];
  for (const e of entries) {
    if (e.name === 'assets' && dir === DOCS_ROOT) continue;
    if (e.name.startsWith('.')) continue;
    const fullPath = path.join(dir, e.name);
    if (e.isDirectory()) {
      nodes.push({ type: 'folder', name: e.name, path: fullPath, children: buildTree(fullPath) });
    } else if (e.name.endsWith('.md')) {
      nodes.push({ type: 'file', name: e.name, path: fullPath });
    }
  }
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function register(ipcMain) {
  ensureDirs();

  ipcMain.handle('docs:getTree', () => {
    try { ensureDirs(); return { success: true, data: buildTree(DOCS_ROOT) }; }
    catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('docs:getFile', (_, filePath) => {
    try {
      const content  = fs.readFileSync(filePath, 'utf8');
      const stat     = fs.statSync(filePath);
      const name     = path.basename(filePath, '.md');
      const title    = name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const modified = stat.mtime.toISOString().split('T')[0];
      return { success: true, data: { title, modified, content } };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('docs:saveFile', (_, { filePath, data }) => {
    try {
      fs.writeFileSync(filePath, data.content, 'utf8');
      const modified = new Date().toISOString().split('T')[0];
      return { success: true, modified };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('docs:createFile', (_, { folderPath, title }) => {
    try {
      ensureDirs();
      const base   = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
      const parent = folderPath || DOCS_ROOT;
      let   fileName = `${base}.md`;
      let   counter  = 1;
      while (fs.existsSync(path.join(parent, fileName))) {
        fileName = `${base}-${counter++}.md`;
      }
      const filePath = path.join(parent, fileName);
      fs.writeFileSync(filePath, `# ${title}\n\n`, 'utf8');
      return { success: true, filePath };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('docs:createFolder', (_, { parentPath, name }) => {
    try {
      const folderPath = path.join(parentPath || DOCS_ROOT, name);
      fs.mkdirSync(folderPath, { recursive: true });
      return { success: true, folderPath };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('docs:rename', (_, { oldPath, newName }) => {
    try {
      const dir    = path.dirname(oldPath);
      const ext    = path.extname(oldPath);
      const newPath = path.join(dir, ext ? `${newName}${ext}` : newName);
      fs.renameSync(oldPath, newPath);
      return { success: true, newPath };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('docs:delete', (_, targetPath) => {
    try {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) fs.rmSync(targetPath, { recursive: true, force: true });
      else fs.unlinkSync(targetPath);
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('docs:pickImage', async (event) => {
    try {
      const win    = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showOpenDialog(win, {
        title: 'Select Image',
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
        properties: ['openFile'],
      });
      if (result.canceled || !result.filePaths[0]) return { success: false };
      return { success: true, sourcePath: result.filePaths[0] };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('docs:importImage', (_, { sourcePath }) => {
    try {
      ensureDirs();
      const ext      = path.extname(sourcePath).toLowerCase();
      const hash     = crypto.createHash('md5').update(sourcePath + Date.now()).digest('hex').slice(0, 8);
      const fileName = `${hash}${ext}`;
      const destPath = path.join(ASSETS_DIR, fileName);
      fs.copyFileSync(sourcePath, destPath);
      return { success: true, relativePath: `assets/${fileName}`, fileName };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('docs:readImage', async (_, relativePath) => {
    try {
      const imagePath = path.join(DOCS_ROOT, relativePath);
      if (!fs.existsSync(imagePath)) return { success: false, error: 'File not found' };

      const cacheDir = path.join(app.getPath('userData'), 'docs-img-cache');
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const origStat = fs.statSync(imagePath);
      const cacheKey = crypto.createHash('md5').update(imagePath).digest('hex');
      const cachePath = path.join(cacheDir, `${cacheKey}.png`);

      if (fs.existsSync(cachePath) && fs.statSync(cachePath).mtimeMs > origStat.mtimeMs) {
        return { success: true, dataUrl: 'data:image/png;base64,' + fs.readFileSync(cachePath).toString('base64') };
      }

      // Small files served directly without resize
      if (origStat.size < 512 * 1024) {
        const ext  = path.extname(imagePath).toLowerCase().replace('.', '');
        const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext] || 'image/jpeg';
        return { success: true, dataUrl: `data:${mime};base64,` + fs.readFileSync(imagePath).toString('base64') };
      }

      // Large files — resize and cache (max 1600px on longest side)
      const img = nativeImage.createFromPath(imagePath);
      if (img.isEmpty()) return { success: false, error: 'Could not load image' };
      const { width, height } = img.getSize();
      const scale   = Math.min(1600 / width, 1600 / height, 1);
      const resized = scale < 1
        ? img.resize({ width: Math.round(width * scale), height: Math.round(height * scale), quality: 'good' })
        : img;
      const buf = resized.toPNG();
      fs.writeFileSync(cachePath, buf);
      return { success: true, dataUrl: 'data:image/png;base64,' + buf.toString('base64') };
    } catch (err) { return { success: false, error: err.message }; }
  });
}

module.exports = { register, DOCS_ROOT };
