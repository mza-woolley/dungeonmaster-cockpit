// Hoard roller — tier sets the band, a d100 luck roll decides where in it you land.
//
// Tier is chosen by the DM (1 = scraps, 20 = godlike). Luck is rolled fresh every
// time and is the swing: it slides the coin result across the band, opens or shuts
// the door on magic items, and at the extremes bends the rarity a step either way.

import tables from '../data/random-tables/loot/enemy-loot.json';
import magicItems from '../data/random-tables/loot/magic-item.json';
import cursedItems from '../data/random-tables/loot/cursed-item.json';

export const TYPES = tables.types;
export const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary'];

// coin: [min, max] gp for the whole encounter.  magic: base chance of any magic item.
// count: how many drop when they do.  weights: rarity spread, indexed by RARITY_ORDER.
export const TIERS = [
  { label: 'Scraps',    coin: [5, 25],          magic: 0.03, count: [1, 1], weights: [1, 0, 0, 0, 0] },
  { label: 'Meagre',    coin: [10, 60],         magic: 0.08, count: [1, 1], weights: [1, 0, 0, 0, 0] },
  { label: 'Paltry',    coin: [20, 110],        magic: 0.12, count: [1, 1], weights: [1, 0, 0, 0, 0] },
  { label: 'Modest',    coin: [40, 180],        magic: 0.18, count: [1, 1], weights: [0.85, 0.15, 0, 0, 0] },
  { label: 'Fair',      coin: [70, 280],        magic: 0.25, count: [1, 1], weights: [0.75, 0.25, 0, 0, 0] },
  { label: 'Decent',    coin: [110, 420],       magic: 0.32, count: [1, 1], weights: [0.6, 0.4, 0, 0, 0] },
  { label: 'Tidy',      coin: [160, 600],       magic: 0.40, count: [1, 1], weights: [0.45, 0.5, 0.05, 0, 0] },
  { label: 'Healthy',   coin: [230, 820],       magic: 0.48, count: [1, 2], weights: [0.3, 0.6, 0.1, 0, 0] },
  { label: 'Rich',      coin: [320, 1100],      magic: 0.56, count: [1, 2], weights: [0.2, 0.6, 0.2, 0, 0] },
  { label: 'Bountiful', coin: [450, 1450],      magic: 0.64, count: [1, 2], weights: [0.1, 0.55, 0.35, 0, 0] },
  { label: 'Lavish',    coin: [600, 1900],      magic: 0.70, count: [1, 2], weights: [0, 0.45, 0.5, 0.05, 0] },
  { label: 'Opulent',   coin: [800, 2500],      magic: 0.75, count: [1, 2], weights: [0, 0.35, 0.55, 0.1, 0] },
  { label: 'Splendid',  coin: [1100, 3300],     magic: 0.80, count: [1, 3], weights: [0, 0.25, 0.55, 0.2, 0] },
  { label: 'Princely',  coin: [1500, 4400],     magic: 0.85, count: [1, 3], weights: [0, 0.15, 0.5, 0.35, 0] },
  { label: 'Regal',     coin: [2000, 5800],     magic: 0.88, count: [1, 3], weights: [0, 0.05, 0.45, 0.45, 0.05] },
  { label: 'Kingly',    coin: [2800, 7600],     magic: 0.91, count: [2, 3], weights: [0, 0, 0.35, 0.55, 0.1] },
  { label: 'Fabled',    coin: [3800, 10000],    magic: 0.94, count: [2, 3], weights: [0, 0, 0.25, 0.55, 0.2] },
  { label: 'Mythic',    coin: [5000, 13000],    magic: 0.96, count: [2, 4], weights: [0, 0, 0.15, 0.5, 0.35] },
  { label: 'Divine',    coin: [6500, 20000],    magic: 0.98, count: [2, 4], weights: [0, 0, 0.05, 0.45, 0.5] },
  { label: 'Godlike',   coin: [8000, 30000],    magic: 1.00, count: [2, 4], weights: [0, 0, 0, 0.3, 0.7] },
];

const rand    = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick    = (arr)  => arr[Math.floor(Math.random() * arr.length)];
const clamp   = (n, a, b) => Math.min(b, Math.max(a, n));

export const rollLuck = () => randInt(1, 100);

export const luckLabel = (luck) =>
  luck <= 5  ? 'Cursed' :
  luck <= 20 ? 'Poor'   :
  luck <= 45 ? 'Lean'   :
  luck <= 70 ? 'Fair'   :
  luck <= 88 ? 'Good'   :
  luck <= 97 ? 'Blessed' : 'Miraculous';

// Big numbers shouldn't land on 7,431 gp — round them off the way a DM would.
function niceRound(n) {
  if (n >= 10000) return Math.round(n / 100) * 100;
  if (n >= 1000)  return Math.round(n / 25) * 25;
  if (n >= 100)   return Math.round(n / 5) * 5;
  return Math.round(n);
}

function pickWeighted(weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return 0;
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function drawMagic(rarityIdx, taken) {
  // Walk outwards from the wanted rarity until a band has something left to give.
  for (const idx of [rarityIdx, rarityIdx - 1, rarityIdx + 1, rarityIdx - 2, rarityIdx + 2]) {
    const rarity = RARITY_ORDER[idx];
    if (!rarity) continue;
    const pool = magicItems.filter(m => m.rarity === rarity && !taken.has(m.name));
    if (pool.length) return pick(pool);
  }
  return null;
}

/**
 * Roll a hoard. Pass a luck value to replay an exact roll, or leave it out to roll fresh.
 * Returns { tier, tierLabel, typeId, typeLabel, count, luck, luckLabel, gold, items[] }.
 */
export function rollHoard({ tier = 1, typeId = 'humanoid', count = 1, luck = rollLuck() } = {}) {
  const T    = TIERS[clamp(tier, 1, 20) - 1];
  const type = TYPES.find(t => t.id === typeId) || TYPES[0];
  const lp   = (luck - 1) / 99;                        // 0..1 position within the band
  const items = [];
  const taken = new Set();

  /* — Coin — */
  // pow(lp, 0.85) leans results slightly above the floor so a mid roll still feels like something.
  const inBand     = T.coin[0] + (T.coin[1] - T.coin[0]) * Math.pow(lp, 0.85);
  const countScale = Math.min(2.5, 1 + (count - 1) * 0.12);
  const gold = Math.max(0, niceRound(inBand * rand(0.88, 1.12) * countScale * type.coinBias));

  /* — Mundane drops — */
  const mundaneCount = clamp(1 + Math.floor(count / 3) + (lp > 0.6 ? 1 : 0), 1, 5);
  const pool = [...type.mundane];
  for (let i = 0; i < mundaneCount && pool.length; i++) {
    const [drop] = pool.splice(Math.floor(Math.random() * pool.length), 1);
    // Several of the same enemy means several of the same junk.
    const qty = count > 1 && drop.value <= 5 ? randInt(1, Math.min(count, 4)) : 1;
    items.push({ ...drop, qty, rarity: 'Common', source: 'mundane' });
  }

  /* — Gems and art — */
  const gemChance = clamp((tier / 20) * 0.85 * (0.35 + lp), 0, 0.9);
  if (Math.random() < gemChance) {
    const affordable = tables.gems.filter(g => g.value <= Math.max(50, gold * 0.9));
    const gem = pick(affordable.length ? affordable : tables.gems.slice(0, 4));
    items.push({ ...gem, qty: gem.value <= 50 ? randInt(1, 3) : 1, rarity: 'Common', source: 'gem' });
  }
  if (tier >= 8 && Math.random() < gemChance * 0.6) {
    const affordable = tables.art.filter(a => a.value <= Math.max(100, gold * 1.2));
    const piece = pick(affordable.length ? affordable : tables.art.slice(0, 3));
    items.push({ ...piece, qty: 1, rarity: 'Common', source: 'art' });
  }

  /* — Magic — */
  // Luck swings the base chance hard in both directions, then the extremes override.
  const chance = clamp(T.magic * type.magicBias * (0.45 + 1.15 * lp), 0, 1);
  let magicCount = Math.random() < chance ? randInt(T.count[0], T.count[1]) : 0;
  if (luck >= 96) magicCount += 1;
  if (luck <= 4)  magicCount = 0;

  for (let i = 0; i < magicCount; i++) {
    let idx = pickWeighted(T.weights);
    if (luck >= 90)      idx = Math.min(RARITY_ORDER.length - 1, idx + 1);
    else if (luck <= 20) idx = Math.max(0, idx - 1);
    const item = drawMagic(idx, taken);
    if (!item) continue;
    taken.add(item.name);
    items.push({
      name: item.name,
      value: '',
      qty: 1,
      rarity: item.rarity,
      notes: `${item.category} — ${item.description}`,
      source: 'magic',
    });
  }

  /* — A gift with strings attached — */
  if (luck <= 8 && tier >= 4 && Math.random() < 0.4) {
    const c = pick(cursedItems);
    items.push({ name: c.name, value: '', qty: 1, rarity: 'Rare', notes: c.curse, source: 'cursed' });
  }

  return {
    tier,
    tierLabel: T.label,
    typeId: type.id,
    typeLabel: type.label,
    count,
    luck,
    luckLabel: luckLabel(luck),
    gold,
    items,
  };
}

/** One-line summary of what a tier can do, for the dial readout. */
export function tierSummary(tier) {
  const T = TIERS[clamp(tier, 1, 20) - 1];
  const top = RARITY_ORDER.filter((_, i) => T.weights[i] > 0);
  const band = top.length > 1 ? `${top[0]}–${top[top.length - 1]}` : top[0] || '—';
  return `${T.coin[0].toLocaleString()}–${T.coin[1].toLocaleString()} gp · ${Math.round(T.magic * 100)}% magic · ${band}`;
}
