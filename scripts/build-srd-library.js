#!/usr/bin/env node
/**
 * DM Cockpit — SRD Library Builder
 * Run once (or to refresh): node scripts/build-srd-library.js
 *
 * Pulls every paginated endpoint from Open5e v1 and writes the data
 * to srd-library/ in the project root, one JSON file per category.
 *
 * Output structure:
 *   srd-library/
 *     spells.json
 *     monsters.json
 *     conditions.json
 *     rules.json
 *     items.json       (magic items)
 *     weapons.json
 *     armor.json
 *     classes.json
 *     races.json
 *     backgrounds.json
 *     feats.json
 *     planes.json
 *     sections.json    (rule sections / chapters)
 *     index.json       (name → category lookup table for fast triage)
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT_DIR  = path.join(__dirname, '..', 'srd-library');
const API_BASE = 'https://api.open5e.com/v1';

// Each entry: [localFilename, apiPath]
const ENDPOINTS = [
  ['spells',      '/spells'],
  ['monsters',    '/monsters'],
  ['conditions',  '/conditions'],
  ['rules',       '/rules'],
  ['items',       '/magicitems'],
  ['weapons',     '/weapons'],
  ['armor',       '/armor'],
  ['classes',     '/classes'],
  ['races',       '/races'],
  ['backgrounds', '/backgrounds'],
  ['feats',       '/feats'],
  ['planes',      '/planes'],
  ['sections',    '/sections'],
];

// ── HTTP helper ───────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

// Follows Open5e pagination — each page is { count, next, results }
async function fetchAll(apiPath) {
  let url     = `${API_BASE}${apiPath}/?limit=100&format=json`;
  let results = [];
  let page    = 1;

  while (url) {
    process.stdout.write(`  page ${page}… `);
    const data = await get(url);
    results = results.concat(data.results || []);
    url = data.next || null;
    page++;
  }
  process.stdout.write(`done (${results.length} records)\n`);
  return results;
}

// ── Index builder ─────────────────────────────────────────────────────────────

/**
 * Build a flat name→category lookup so the wizard can quickly triage
 * which SRD files are relevant to a question.
 *
 * Format: { "fireball": "spells", "beholder": "monsters", … }
 * Keys are lowercased for case-insensitive matching.
 */
function buildIndex(allData) {
  const index = {};
  for (const [category, records] of Object.entries(allData)) {
    for (const record of records) {
      if (record.name) {
        index[record.name.toLowerCase()] = category;
      }
    }
  }
  return index;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('⚔  DM Cockpit — SRD Library Builder\n');

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log(`Created ${OUT_DIR}\n`);
  }

  const allData = {};

  for (const [filename, apiPath] of ENDPOINTS) {
    console.log(`Fetching ${filename}…`);
    try {
      const records = await fetchAll(apiPath);
      allData[filename] = records;
      const outPath = path.join(OUT_DIR, `${filename}.json`);
      fs.writeFileSync(outPath, JSON.stringify(records, null, 2));
      console.log(`  ✓ Saved ${outPath}\n`);
    } catch (err) {
      console.error(`  ✗ Failed to fetch ${filename}: ${err.message}\n`);
      allData[filename] = [];
    }
  }

  // Write index last
  console.log('Building index…');
  const index = buildIndex(allData);
  const indexPath = path.join(OUT_DIR, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  const entryCount = Object.keys(index).length;
  console.log(`  ✓ Saved ${indexPath} (${entryCount} entries)\n`);

  console.log('✔  SRD library build complete.');
  console.log(`   Files written to: ${OUT_DIR}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
