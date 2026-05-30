/**
 * electron/wizard.js
 * DM Cockpit — DND Wizard back-end (main process)
 *
 * IPC channels exposed:
 *   wizard:chat  ({ messages, question }) → { success, answer, verified, sources, matchType }
 *   wizard:ready ()                       → { ready, srdReady, reason? }
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── Paths ─────────────────────────────────────────────────────────────────────

const PROJECT_ROOT = path.join(__dirname, '..');
const SRD_DIR      = path.join(PROJECT_ROOT, 'srd-library');

// ── Config ────────────────────────────────────────────────────────────────────

function loadApiKey() {
  return process.env.ANTHROPIC_API_KEY || null;
}

// ── SRD Loader ────────────────────────────────────────────────────────────────

let _index = null;
const _cache = {};

function loadIndex() {
  if (_index) return _index;
  const p = path.join(SRD_DIR, 'index.json');
  if (!fs.existsSync(p)) return null;
  try { _index = JSON.parse(fs.readFileSync(p, 'utf8')); return _index; }
  catch (_) { return null; }
}

function loadCategory(category) {
  if (_cache[category]) return _cache[category];
  const p = path.join(SRD_DIR, `${category}.json`);
  if (!fs.existsSync(p)) return [];
  try { _cache[category] = JSON.parse(fs.readFileSync(p, 'utf8')); return _cache[category]; }
  catch (_) { return []; }
}

// ── Keyword → Category Map ────────────────────────────────────────────────────
//
// When no named entity matches, we check for rules-concept keywords and pull
// the most relevant section records by keyword search within the category.
// Keeps context targeted (1–2 records max) rather than dumping whole files.

const KEYWORD_MAP = [
  // Ability scores & modifiers
  { keywords: ['ability score','ability scores','ability check','ability checks',
                'strength score','dexterity score','constitution score',
                'intelligence score','wisdom score','charisma score',
                'stat','stats','attribute','attributes','modifier','modifiers',
                'ability modifier','saving throw modifier'],
    category: 'sections', search: ['ability scores','using ability scores'] },

  // Saving throws
  { keywords: ['saving throw','saving throws','save','saves','death save','death saving throw'],
    category: 'sections', search: ['saving throws','using ability scores'] },

  // Proficiency
  { keywords: ['proficiency','proficiency bonus','proficient','proficiencies'],
    category: 'sections', search: ['proficiency bonus','using ability scores'] },

  // Skills
  { keywords: ['skill','skills','skill check','athletics','acrobatics','stealth',
                'perception','insight','persuasion','deception','intimidation',
                'arcana','history','nature','religion','investigation',
                'animal handling','medicine','survival','sleight of hand','performance'],
    category: 'sections', search: ['skills','using ability scores'] },

  // Advantage / disadvantage
  { keywords: ['advantage','disadvantage','roll with advantage','roll with disadvantage'],
    category: 'sections', search: ['advantage and disadvantage'] },

  // Inspiration
  { keywords: ['inspiration','inspired'],
    category: 'sections', search: ['inspiration'] },

  // Combat core
  { keywords: ['attack','attack roll','attack rolls','hit','miss','melee attack',
                'ranged attack','spell attack','critical hit','crit','fumble',
                'attack of opportunity','opportunity attack','two-weapon fighting',
                'dual wield','offhand','bonus action attack'],
    category: 'sections', search: ['making an attack','combat'] },

  // Actions in combat
  { keywords: ['action','actions','bonus action','reaction','free action',
                'dash','disengage','dodge','help action','hide action','ready action',
                'search action','use an object','shove','grapple action'],
    category: 'sections', search: ['actions in combat'] },

  // Initiative / turn order
  { keywords: ['initiative','turn order','surprise','surprised','combat order',
                'roll initiative','initiative roll'],
    category: 'sections', search: ['the order of combat','initiative'] },

  // Movement
  { keywords: ['movement','move','speed','difficult terrain','crawl','crawling',
                'jump','jumping','climb','climbing','swim','swimming','fly','flying',
                'prone','stand up','standing up','forced movement','push','pull'],
    category: 'sections', search: ['movement and position'] },

  // Cover
  { keywords: ['cover','half cover','three-quarters cover','full cover','total cover'],
    category: 'sections', search: ['cover'] },

  // Hit points & healing
  { keywords: ['hit point','hit points','hp','max hp','maximum hit points',
                'healing','heal','regain hit points','temporary hit points','temp hp',
                'damage','take damage','damage type','damage types','resistance',
                'immunity','vulnerability','nonlethal','instant death','death'],
    category: 'sections', search: ['hit points','damage and healing'] },

  // Conditions (generic — named conditions hit the index directly)
  { keywords: ['condition','conditions','status effect','status effects'],
    category: 'conditions', search: null },  // null = return all conditions (they're small)

  // Spellcasting general
  { keywords: ['spellcasting','cast a spell','casting a spell','spell slot','spell slots',
                'cantrip','cantrips','ritual','ritual casting','verbal component',
                'somatic component','material component','component','components',
                'concentration','concentrating','lose concentration','maintain concentration',
                'spell save dc','spell attack bonus','prepared spells','known spells',
                'spell list','multiclass spellcasting','arcane focus','holy symbol'],
    category: 'sections', search: ['spellcasting','the weave of magic'] },

  // Resting
  { keywords: ['short rest','long rest','rest','resting','hit dice','spend hit dice',
                'exhaustion','recover','recovery'],
    category: 'sections', search: ['resting'] },

  // Multiclassing
  { keywords: ['multiclass','multiclassing','multiclassed','multiclassing prerequisites'],
    category: 'sections', search: ['multiclassing'] },

  // Carrying / encumbrance
  { keywords: ['carry','carrying','encumbrance','encumbered','heavily encumbered',
                'carrying capacity','lift','drag','push weight'],
    category: 'sections', search: ['lifting and carrying'] },

  // Vision & light
  { keywords: ['darkvision','blindsight','tremorsense','truesight','darkvision range',
                'dim light','darkness','bright light','lightly obscured','heavily obscured',
                'invisible','invisibility','vision'],
    category: 'sections', search: ['vision and light'] },

  // Social / exploration
  { keywords: ['passive perception','passive check','passive','downtime','travel pace',
                'foraging','navigation','encounter distance','random encounter'],
    category: 'sections', search: ['exploration'] },

  // Equipment / items general
  { keywords: ['equipment','gear','item','items','adventuring gear','tools','tool','kit',
                'trade goods','treasure','coin','gold','silver','copper','platinum',
                'electrum','currency','weight','lb','pound'],
    category: 'sections', search: ['equipment'] },

  // Weapons general
  { keywords: ['weapon','weapons','simple weapon','martial weapon','finesse','thrown',
                'reach','two-handed','versatile','light weapon','heavy weapon',
                'loading','ammunition','silvered'],
    category: 'weapons', search: null },

  // Armor general
  { keywords: ['armor','armour','light armor','medium armor','heavy armor','shield',
                'ac','armor class','stealth disadvantage','don','doff','wearing armor'],
    category: 'armor', search: null },
];

// ── Keyword Triage ────────────────────────────────────────────────────────────

const MAX_KEYWORD_RECORDS = 2;   // max section records per keyword hit
const MAX_NAMED_RECORDS   = 8;   // max named-entity records

/**
 * Check question against KEYWORD_MAP.
 * Returns array of { category, records[] } — only the most relevant.
 */
function keywordTriage(lower) {
  const hits = [];
  const seenCategories = new Set();

  for (const entry of KEYWORD_MAP) {
    if (seenCategories.has(entry.category)) continue;
    const matched = entry.keywords.some(kw => lower.includes(kw));
    if (!matched) continue;

    seenCategories.add(entry.category);
    const allRecords = loadCategory(entry.category);

    let records;
    if (!entry.search) {
      // Return up to MAX_KEYWORD_RECORDS records from top of category (e.g. all conditions)
      records = allRecords.slice(0, entry.category === 'conditions' ? 999 : MAX_KEYWORD_RECORDS);
    } else {
      // Find specific records by searching names/desc for the search terms
      records = [];
      for (const term of entry.search) {
        const found = allRecords.find(r =>
          r.name && r.name.toLowerCase().includes(term.toLowerCase())
        );
        if (found && !records.find(r => r.name === found.name)) {
          records.push(found);
        }
        if (records.length >= MAX_KEYWORD_RECORDS) break;
      }
    }

    if (records.length > 0) {
      hits.push({ category: entry.category, records });
    }
  }

  return hits;
}

// ── Named Entity Triage ───────────────────────────────────────────────────────

function namedEntityTriage(lower) {
  const index = loadIndex();
  if (!index) return { records: [], categories: new Set() };

  const words  = lower.replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter(Boolean);
  const ngrams = new Set();
  for (let n = 1; n <= 4; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.add(words.slice(i, i + n).join(' '));
    }
  }

  const hits = new Map();
  for (const gram of ngrams) {
    const category = index[gram];
    if (category) {
      if (!hits.has(category)) hits.set(category, new Set());
      hits.get(category).add(gram);
    }
  }

  const records    = [];
  const categories = new Set(hits.keys());

  for (const [category, names] of hits.entries()) {
    const allRecords = loadCategory(category);
    for (const name of names) {
      const record = allRecords.find(r => r.name && r.name.toLowerCase() === name);
      if (record && records.length < MAX_NAMED_RECORDS) {
        records.push({ category, ...record });
      }
    }
  }

  return { records, categories };
}

// ── Combined Triage ───────────────────────────────────────────────────────────

/**
 * matchType:
 *   'named'    — exact SRD entity found (e.g. Fireball, Beholder, Poisoned)
 *   'keyword'  — rules concept matched via keyword map
 *   'both'     — named entity + keyword context
 *   'none'     — no match, general knowledge answer
 */
function triageQuestion(question) {
  const lower = question.toLowerCase();

  const named   = namedEntityTriage(lower);
  const keyword = keywordTriage(lower);

  const hasNamed   = named.records.length > 0;
  const hasKeyword = keyword.length > 0;

  if (!hasNamed && !hasKeyword) {
    return { records: [], categories: new Set(), verified: false, matchType: 'none' };
  }

  // Merge records; keyword records go after named so named take priority in context
  const allRecords   = [...named.records];
  const allCategories = new Set(named.categories);

  for (const { category, records } of keyword) {
    allCategories.add(category);
    for (const r of records) {
      // Don't duplicate if named entity already pulled this record
      if (!allRecords.find(x => x.name === r.name)) {
        allRecords.push({ category, ...r });
      }
    }
  }

  const matchType = hasNamed && hasKeyword ? 'both'
    : hasNamed   ? 'named'
    : 'keyword';

  return {
    records:    allRecords,
    categories: allCategories,
    verified:   true,
    matchType,
  };
}

// ── Context Serialiser ────────────────────────────────────────────────────────

const KEEP_FIELDS = [
  'name','category','cr','challenge_rating_text','size','type','alignment',
  'armor_class','hit_points','speed','strength','dexterity','constitution',
  'intelligence','wisdom','charisma','saving_throws','skills',
  'damage_immunities','damage_resistances','damage_vulnerabilities',
  'condition_immunities','senses','languages','special_abilities',
  'actions','legendary_actions','reactions','desc','higher_level',
  'school','level','casting_time','range','components','duration',
  'concentration','ritual','classes','damage','dc','heal_at_slot_level',
  'effect_desc','radius','rolls_with_advantage','attack_bonus',
  'saving_throw_ability','damage_type','cost','weight','properties',
  'armor_class_description','str_minimum','stealth_disadvantage',
];

function serialiseRecords(records) {
  if (!records.length) return '';
  return records.map(r => {
    const keep = {};
    for (const f of KEEP_FIELDS) {
      if (r[f] !== undefined && r[f] !== null && r[f] !== '') keep[f] = r[f];
    }
    return JSON.stringify(keep);
  }).join('\n---\n');
}

// ── Anthropic API ─────────────────────────────────────────────────────────────

function callAnthropic(apiKey, systemPrompt, messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     systemPrompt,
      messages,
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const text = (parsed.content || [])
            .filter(b => b.type === 'text')
            .map(b => b.text)
            .join('');
          resolve(text);
        } catch (e) {
          reject(new Error('Bad response from Anthropic: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── System Prompt Builder ─────────────────────────────────────────────────────

function buildSystemPrompt(srdContext, matchType) {
  const base = `You are the DND Wizard, an expert D&D 5th Edition rules assistant built into DM Cockpit. You help Dungeon Masters run sessions confidently with fast, accurate rulings.

Tone: sharp and knowledgeable — like a trusted player who has memorised every rulebook. Be concise. Use bullet points or short paragraphs. No padding, no unnecessary preamble.

Format responses using **bold** for key terms, rule names, and important numbers. Use bullet points for lists of effects, steps, or options.`;

  if (matchType === 'none') {
    return `${base}

No SRD entry was matched for this question. Answer from your general D&D 5e knowledge. Be accurate but note if something varies by edition or sourcebook.`;
  }

  const sourceNote = matchType === 'named'
    ? 'exact SRD entries'
    : matchType === 'keyword'
    ? 'relevant SRD rules sections'
    : 'SRD entries and rules sections';

  return `${base}

The following ${sourceNote} are relevant. Use them as your primary source of truth:

${srdContext}

Answer using the SRD data above. If the question goes beyond what the data covers, supplement from general D&D 5e knowledge and note when you do so.`;
}

// ── IPC Registration ──────────────────────────────────────────────────────────

function register(ipcMain) {
  ipcMain.handle('wizard:ready', () => {
    const apiKey = loadApiKey();
    if (!apiKey) {
      return { ready: false, reason: 'anthro.json not found or ANTHROPIC_API_KEY missing' };
    }
    const srdBuilt = fs.existsSync(path.join(SRD_DIR, 'index.json'));
    return { ready: true, srdReady: srdBuilt,
      reason: srdBuilt ? null : 'SRD library not built — run: node scripts/build-srd-library.js' };
  });

  ipcMain.handle('wizard:chat', async (_, { messages, question }) => {
    const apiKey = loadApiKey();
    if (!apiKey) {
      return { success: false, error: 'Anthropic API key not configured. Add anthro.json to the project root.' };
    }

    try {
      const { records, categories, verified, matchType } = triageQuestion(question);
      const srdContext   = serialiseRecords(records);
      const systemPrompt = buildSystemPrompt(srdContext, matchType);

      // Cap history at 10 turns to protect token budget
      const trimmedHistory = (messages || []).slice(-10);
      const apiMessages = [
        ...trimmedHistory,
        { role: 'user', content: question },
      ];

      const answer = await callAnthropic(apiKey, systemPrompt, apiMessages);

      return { success: true, answer, verified, matchType, sources: [...categories] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { register };
