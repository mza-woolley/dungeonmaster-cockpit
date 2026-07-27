// One-shot visual audit: launch the built app, screenshot every panel.
// Usage: node scripts/audit-shots.js <output-dir>
const { _electron } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const APP_DIR = path.join(__dirname, '..');
const OUT = process.argv[2] || path.join(APP_DIR, 'audit-shots');
fs.mkdirSync(OUT, { recursive: true });

const PANEL_IDS = ['characters', 'encounters', 'tv', 'scene', 'generator',
                   'wizard', 'scribble', 'documentation', 'charsheet', 'miro'];

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

  for (let i = 0; i < PANEL_IDS.length; i++) {
    const id = PANEL_IDS[i];
    // Nav buttons are rendered in NAV_GROUPS order; find by label association:
    await page.evaluate((idx) => {
      const btns = [...document.querySelectorAll('.nav-btn')];
      btns[idx]?.click();
    }, i === 0 ? 0 : -1); // placeholder, real click below
    // Click by matching the shortcut position: simpler — use keyboard shortcut
    await page.keyboard.press(`Control+${(i + 1) % 10}`);
    await page.waitForTimeout(900); // panel slide animation + render
    await page.screenshot({ path: path.join(OUT, `${String(i).padStart(2, '0')}-${id}.png`) });
    console.log('shot:', id);
  }

  await app.close();
  console.log('done →', OUT);
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
