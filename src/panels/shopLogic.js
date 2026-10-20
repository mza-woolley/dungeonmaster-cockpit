// Shop maths — what a vendor charges, what they have, and how far they'll bend.
//
// Three things stack onto a sticker price: the magic markup (a shop has to find
// the thing, hold it, and know what it is), the vendor's own greed, and how much
// they currently like the party. Haggling moves a fourth multiplier on one line
// only, and a vendor remembers being insulted for the rest of the visit.

import vendorData from '../data/random-tables/shop/vendors.json';
import magicItems from '../data/random-tables/loot/magic-item.json';
import { TIERS, RARITY_ORDER } from './lootRoll';

export const VENDORS = vendorData.vendors;

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const rand    = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick    = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Vendor things. You are not buying at hoard prices.
export const MAGIC_MARKUP = 2.5;

// Mood is the vendor's standing opinion of the party; it survives between visits.
export const MOODS = [
  { key: -2, label: 'Hostile', mult: 1.25 },
  { key: -1, label: 'Wary',    mult: 1.10 },
  { key:  0, label: 'Neutral', mult: 1.00 },
  { key:  1, label: 'Warm',    mult: 0.93 },
  { key:  2, label: 'Devoted', mult: 0.85 },
];

export const moodOf = (n) => MOODS.find(m => m.key === clamp(n, -2, 2)) || MOODS[2];

export const vendorById = (id) => VENDORS.find(v => v.id === id) || VENDORS[0];

/** Round to something a shopkeeper would actually say out loud. */
export function shopRound(n) {
  if (n >= 1000) return Math.round(n / 50) * 50;
  if (n >= 100)  return Math.round(n / 5) * 5;
  if (n >= 10)   return Math.round(n);
  if (n >= 1)    return Math.round(n * 10) / 10;
  return Math.round(n * 100) / 100;
}

/**
 * What this line costs right now, with every multiplier applied.
 * line.base is the sticker price; line.magic marks it for the 2.5x.
 */
export function priceOf(line, vendor, mood = 0) {
  const markup = line.magic ? MAGIC_MARKUP : 1;
  const haggle = 1 + (line.haggle?.delta || 0);
  return shopRound(line.base * markup * vendor.greed * moodOf(mood).mult * haggle);
}

/** What the vendor offers for something the party is selling. */
export const buybackOf = (base, vendor, mood = 0) =>
  shopRound(base * vendor.buyback * (2 - moodOf(mood).mult));

let seq = 0;
const uid = () => `shop_${Date.now().toString(36)}_${(seq++).toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

/** Turn a vendor's standing stock into live lines. qty 0 means they never run out. */
export const standingStock = (vendor) =>
  vendor.always.map(a => ({
    id: uid(),
    name: a.name,
    base: a.price,
    qty: a.qty,
    unlimited: a.qty === 0,
    magic: false,
    standing: true,
    notes: '',
    haggle: null,
  }));

/**
 * Roll what this vendor happens to have in the back today.
 * Tier 1-20 reuses the hoard rarity weights, so a tier-3 alchemist stocks cantrip
 * fare and a tier-18 one has something that frightens the guild.
 */
export function rollGear(vendor, tier = 5, taken = new Set()) {
  const T = TIERS[clamp(tier, 1, 20) - 1];
  const pool = magicItems.filter(m => vendor.categories.includes(m.category));
  if (!pool.length) return [];

  // A richer town supports a deeper shelf, but never a warehouse.
  const howMany = clamp(randInt(1, 2) + Math.floor(tier / 4), 1, 7);
  const out = [];
  const seen = new Set(taken);

  for (let i = 0; i < howMany; i++) {
    let idx = pickWeighted(T.weights);
    // A shop is a step more conservative than a dragon's hoard — stock has to sell.
    if (Math.random() < 0.35) idx = Math.max(0, idx - 1);
    const item = drawFrom(pool, idx, seen);
    if (!item) continue;
    seen.add(item.name);
    out.push({
      id: uid(),
      name: item.name,
      base: item.value,
      qty: item.rarity === 'Common' ? randInt(1, 3) : 1,
      unlimited: false,
      magic: true,
      standing: false,
      rarity: item.rarity,
      notes: `${item.category} — ${item.description}`,
      haggle: null,
    });
  }
  return out;
}

function drawFrom(pool, rarityIdx, seen) {
  for (const idx of [rarityIdx, rarityIdx - 1, rarityIdx + 1, rarityIdx - 2, rarityIdx + 2]) {
    const rarity = RARITY_ORDER[idx];
    if (!rarity) continue;
    const band = pool.filter(m => m.rarity === rarity && !seen.has(m.name));
    if (band.length) return pick(band);
  }
  return null;
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

/**
 * Resolve one haggle attempt against a line.
 * Pass the player's full check total. Returns { delta, mood, outcome, line }.
 * Margin against the vendor's DC decides both the discount and whether you've
 * just talked yourself into a worse price.
 */
export function haggle(total, vendor) {
  const margin = total - vendor.haggleDC;
  if (margin >= 10) return { delta: -0.20, mood:  1, outcome: 'won',     line: 'Named a price, got it. They shake on it before you reconsider.' };
  if (margin >= 5)  return { delta: -0.12, mood:  0, outcome: 'good',    line: 'A grudging nod. They knock something off to end the conversation.' };
  if (margin >= 0)  return { delta: -0.06, mood:  0, outcome: 'slight',  line: 'They meet you barely past halfway, and look pleased about it.' };
  if (margin >= -5) return { delta:  0,    mood:  0, outcome: 'held',    line: 'The price does not move. Neither do they.' };
  if (margin >= -10)return { delta:  0.10, mood: -1, outcome: 'offended',line: 'That was insulting. The price goes up and stays up.' };
  return              { delta:  0.25, mood: -1, outcome: 'disaster', line: 'They name a new number loudly enough for the street to hear.' };
}

export const HAGGLE_OUTCOMES = {
  won:      { label: 'Talked down',  tone: 'great' },
  good:     { label: 'Discount',     tone: 'good'  },
  slight:   { label: 'Slight give',  tone: 'good'  },
  held:     { label: 'No movement',  tone: 'flat'  },
  offended: { label: 'Offended',     tone: 'bad'   },
  disaster: { label: 'Insulted',     tone: 'bad'   },
};

export { uid as shopUid };
