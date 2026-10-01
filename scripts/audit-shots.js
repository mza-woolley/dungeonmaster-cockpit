// One-shot visual audit: launch the built app, screenshot every panel.
// Usage: node scripts/audit-shots.js <output-dir>
const { _electron } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const APP_DIR = path.join(__dirname, '..');
const OUT = process.argv[2] || path.join(APP_DIR, 'audit-shots');
fs.mkdirSync(OUT, { recursive: true });

// Label as rendered in .nav-label, paired with the file-name slug.
const PANELS = [
  ['Characters',       'characters'],
  ['Encounters & Map', 'encounters'],
  ['Loot',             'loot'],
  ['Scene',            'scene'],
  ['Generator',        'generator'],
  ['Wizard',           'wizard'],
  ['Scribble',         'scribble'],
  ['Documentation',    'documentation'],
  ['Sheets',           'charsheet'],
  ['Miro',             'miro'],
];

(async () => {
  const app = await _electron.launch({
    executablePath: path.join(APP_DIR, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: [APP_DIR],
    timeout: 30000,
  });
  const page = await app.firstWindow();
  await page.waitForSelector('.panel-nav', { timeout: 20000 });
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForTimeout(2500); // let fonts/data settle

  // Click the nav button by its label rather than firing the keyboard
  // shortcut: panels with an autofocused input (Wizard) swallow the keypress
  // and every later shot silently comes out as the same stuck panel.
  for (let i = 0; i < PANELS.length; i++) {
    const [label, id] = PANELS[i];
    const clicked = await page.evaluate((want) => {
      const btn = [...document.querySelectorAll('.nav-btn')]
        .find(b => b.querySelector('.nav-label')?.textContent.trim() === want);
      if (!btn) return false;
      btn.click();
      return true;
    }, label);
    if (!clicked) { console.error('no nav button for:', label); process.exitCode = 1; continue; }

    await page.waitForTimeout(900); // panel slide animation + render

    const active = await page.evaluate(() =>
      document.querySelector('.nav-btn.active .nav-label')?.textContent.trim());
    if (active !== label) {
      console.error(`nav failed: wanted "${label}", landed on "${active}"`);
      process.exitCode = 1;
    }

    await page.screenshot({ path: path.join(OUT, `${String(i).padStart(2, '0')}-${id}.png`) });
    console.log('shot:', id, active === label ? '' : '(WRONG PANEL)');
  }

  await app.close();
  console.log('done →', OUT);
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
