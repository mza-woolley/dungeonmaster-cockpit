import React, { useState, useEffect } from 'react';
import './Encounters.css';
import { ambienceEngine } from './SceneControl';

// ── Helpers ────────────────────────────────────────────────
const CR_OPTIONS = [
  '0','1/8','1/4','1/2',
  '1','2','3','4','5','6','7','8','9','10',
  '11','12','13','14','15','16','17','18','19','20',
];
const SIZES    = ['Tiny','Small','Medium','Large','Huge','Gargantuan'];
const TYPES    = ['Aberration','Beast','Celestial','Construct','Dragon','Elemental',
                  'Fey','Fiend','Giant','Humanoid','Monstrosity','Ooze','Plant','Undead'];
const ALIGNMENTS = ['Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral',
                    'True Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil',
                    'Chaotic Evil','Unaligned'];

function statMod(score) {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

function uid() {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function blankMonster() {
  return {
    id: uid(), name: '', source: 'custom',
    cr: '1', size: 'Medium', type: 'Humanoid', alignment: 'True Neutral',
    ac: 12, ac_desc: '', hp: 10, hp_dice: '2d8+1', speed: '30 ft.',
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    saving_throws: '', skills: '', damage_immunities: '',
    damage_resistances: '', damage_vulnerabilities: '',
    condition_immunities: '', senses: 'passive Perception 10', languages: '—',
    special_abilities: [], actions: [], legendary_actions: [],
    description: '',
  };
}

function blankNpc() {
  return {
    id: uid(), name: '', source: 'custom',
    cr: '—', size: 'Medium', type: 'Humanoid', alignment: 'True Neutral',
    ac: 10, ac_desc: '', hp: 10, hp_dice: '2d8+1', speed: '30 ft.',
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    saving_throws: '', skills: '', damage_immunities: '',
    damage_resistances: '', damage_vulnerabilities: '',
    condition_immunities: '', senses: 'passive Perception 10', languages: '—',
    special_abilities: [], actions: [], legendary_actions: [],
    description: '',
  };
}

function srdToCustom(srd) {
  return {
    id: uid(),
    name: srd.name + ' (Custom)',
    source: 'custom',
    cr: srd.cr || srd.challenge_rating_text || '1',
    size: srd.size || 'Medium',
    type: srd.type || 'Humanoid',
    alignment: srd.alignment || 'True Neutral',
    ac: srd.armor_class || 10,
    ac_desc: srd.armor_desc || '',
    hp: srd.hit_points || 10,
    hp_dice: srd.hit_dice || '',
    speed: srd.speed || '30 ft.',
    str: srd.strength || 10,      dex: srd.dexterity || 10,
    con: srd.constitution || 10,  int: srd.intelligence || 10,
    wis: srd.wisdom || 10,        cha: srd.charisma || 10,
    saving_throws:           srd.saving_throws || '',
    skills:                  srd.skills || '',
    damage_immunities:       srd.damage_immunities || '',
    damage_resistances:      srd.damage_resistances || '',
    damage_vulnerabilities:  srd.damage_vulnerabilities || '',
    condition_immunities:    srd.condition_immunities || '',
    senses:                  srd.senses || '',
    languages:               srd.languages || '—',
    special_abilities: (srd.special_abilities || []).map(a => ({ name: a.name, desc: a.desc })),
    actions:           (srd.actions          || []).map(a => ({ name: a.name, desc: a.desc })),
    legendary_actions: (srd.legendary_actions|| []).map(a => ({ name: a.name, desc: a.desc })),
    description: srd.desc || '',
  };
}

// ── Sub-components ─────────────────────────────────────────

function StatBlock({ monster, onClone, onEdit, onDelete, isCustom }) {
  const stats = [
    ['STR', monster.str || monster.strength],
    ['DEX', monster.dex || monster.dexterity],
    ['CON', monster.con || monster.constitution],
    ['INT', monster.int || monster.intelligence],
    ['WIS', monster.wis || monster.wisdom],
    ['CHA', monster.cha || monster.charisma],
  ];

  // v1 speed is a string, v2/custom speed may be object or string
  const speed = typeof monster.speed === 'object'
    ? Object.entries(monster.speed).filter(([k]) => k !== 'unit').map(([k,v]) => `${k} ${v} ft.`).join(', ')
    : monster.speed;

  // v1 type is a plain string; v2 is { name: '...' }
  const typeName = monster.type?.name || monster.type || '';
  const sizeName = monster.size?.name || monster.size || '';
  const crText   = monster.challenge_rating || monster.challenge_rating_text || monster.cr || '';

  const actions           = monster.actions           || [];
  const specialAbilities  = monster.special_abilities || [];
  const legendaryActions  = monster.legendary_actions || [];

  return (
    <div className="statblock">
      <div className="statblock-header">
        <h2 className="sb-name">{monster.name}</h2>
        <p className="sb-meta">
          {sizeName} {typeName}
          {monster.alignment ? `, ${monster.alignment}` : ''}
        </p>
        <div className="sb-actions-bar">
          {!isCustom && (
            <button className="sb-btn" onClick={() => onClone(monster)} title="Clone as custom">
              ⧉ Clone as Custom
            </button>
          )}
          {isCustom && (
            <>
              <button className="sb-btn" onClick={() => onEdit(monster)}>✏️ Edit</button>
              <button className="sb-btn danger" onClick={() => onDelete(monster)}>🗑 Delete</button>
            </>
          )}
        </div>
      </div>

      <div className="sb-divider" />

      <div className="sb-row"><span className="sb-label">Armour Class</span>
        {monster.ac || monster.armor_class} {monster.ac_desc || monster.armor_desc ? `(${monster.ac_desc || monster.armor_desc})` : ''}</div>
      <div className="sb-row"><span className="sb-label">Hit Points</span>
        {monster.hp || monster.hit_points} {monster.hp_dice || monster.hit_dice ? `(${monster.hp_dice || monster.hit_dice})` : ''}</div>
      <div className="sb-row"><span className="sb-label">Speed</span>{speed}</div>

      <div className="sb-divider" />

      <div className="sb-stats">
        {stats.map(([label, val]) => (
          <div key={label} className="sb-stat">
            <div className="sb-stat-label">{label}</div>
            <div className="sb-stat-val">{val}</div>
            <div className="sb-stat-mod">{statMod(val)}</div>
          </div>
        ))}
      </div>

      <div className="sb-divider" />

      {monster.saving_throws   && <div className="sb-row"><span className="sb-label">Saving Throws</span>{monster.saving_throws}</div>}
      {monster.skills && <div className="sb-row"><span className="sb-label">Skills</span>
        {typeof monster.skills === 'object'
          ? Object.entries(monster.skills).map(([k,v]) => `${k.charAt(0).toUpperCase()+k.slice(1)} +${v}`).join(', ')
          : monster.skills}
      </div>}
      {monster.damage_vulnerabilities && <div className="sb-row"><span className="sb-label">Vulnerabilities</span>{monster.damage_vulnerabilities}</div>}
      {monster.damage_resistances     && <div className="sb-row"><span className="sb-label">Resistances</span>{monster.damage_resistances}</div>}
      {monster.damage_immunities      && <div className="sb-row"><span className="sb-label">Immunities</span>{monster.damage_immunities}</div>}
      {monster.condition_immunities   && <div className="sb-row"><span className="sb-label">Condition Immunities</span>{monster.condition_immunities}</div>}
      {monster.senses    && <div className="sb-row"><span className="sb-label">Senses</span>{monster.senses}</div>}
      {monster.languages && <div className="sb-row"><span className="sb-label">Languages</span>{monster.languages}</div>}
      <div className="sb-row"><span className="sb-label">Challenge</span>{crText}</div>

      {specialAbilities.length > 0 && (
        <>
          <div className="sb-divider" />
          {specialAbilities.map((a, i) => (
            <div key={i} className="sb-ability">
              <span className="sb-ability-name">{a.name}.</span> {a.desc}
            </div>
          ))}
        </>
      )}

      {actions.length > 0 && (
        <>
          <div className="sb-divider" />
          <div className="sb-section-title">Actions</div>
          {actions.map((a, i) => (
            <div key={i} className="sb-ability">
              <span className="sb-ability-name">{a.name}.</span> {a.desc}
            </div>
          ))}
        </>
      )}

      {legendaryActions.length > 0 && (
        <>
          <div className="sb-divider" />
          <div className="sb-section-title">Legendary Actions</div>
          {legendaryActions.map((a, i) => (
            <div key={i} className="sb-ability">
              <span className="sb-ability-name">{a.name}.</span> {a.desc}
            </div>
          ))}
        </>
      )}

      {monster.description && (
        <>
          <div className="sb-divider" />
          <div className="sb-description">{monster.description}</div>
        </>
      )}
    </div>
  );
}

// ── Monster Editor ─────────────────────────────────────────
function MonsterEditor({ initial, onSave, onCancel }) {
  const [m, setM] = useState(initial);

  const set = (field, val) => setM(prev => ({ ...prev, [field]: val }));

  const updateAction = (list, idx, field, val) => {
    const next = [...m[list]];
    next[idx] = { ...next[idx], [field]: val };
    set(list, next);
  };
  const addAction    = (list) => set(list, [...m[list], { name: '', desc: '' }]);
  const removeAction = (list, idx) => set(list, m[list].filter((_, i) => i !== idx));

  return (
    <div className="editor">
      <div className="editor-header">
        <h3>{initial.name ? `Editing: ${initial.name}` : 'New Custom Monster'}</h3>
        <div className="editor-header-btns">
          <button className="sb-btn" onClick={onCancel}>Cancel</button>
          <button className="sb-btn primary" onClick={() => onSave(m)}>💾 Save</button>
        </div>
      </div>

      <div className="editor-body">
        {/* Identity */}
        <div className="editor-section">
          <div className="editor-section-title">Identity</div>
          <div className="editor-grid">
            <label>Name
              <input value={m.name} onChange={e => set('name', e.target.value)} />
            </label>
            <label>CR
              <select value={m.cr} onChange={e => set('cr', e.target.value)}>
                {CR_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Size
              <select value={m.size} onChange={e => set('size', e.target.value)}>
                {SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label>Type
              <select value={m.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label>Alignment
              <select value={m.alignment} onChange={e => set('alignment', e.target.value)}>
                {ALIGNMENTS.map(a => <option key={a}>{a}</option>)}
              </select>
            </label>
          </div>
        </div>

        {/* Defences */}
        <div className="editor-section">
          <div className="editor-section-title">Defences</div>
          <div className="editor-grid">
            <label>AC <input type="number" value={m.ac} onChange={e => set('ac', +e.target.value)} /></label>
            <label>AC Note <input value={m.ac_desc} onChange={e => set('ac_desc', e.target.value)} placeholder="e.g. natural armour" /></label>
            <label>HP <input type="number" value={m.hp} onChange={e => set('hp', +e.target.value)} /></label>
            <label>HP Dice <input value={m.hp_dice} onChange={e => set('hp_dice', e.target.value)} placeholder="e.g. 4d8+4" /></label>
            <label>Speed <input value={m.speed} onChange={e => set('speed', e.target.value)} placeholder="30 ft." /></label>
          </div>
        </div>

        {/* Ability Scores */}
        <div className="editor-section">
          <div className="editor-section-title">Ability Scores</div>
          <div className="editor-stats-grid">
            {[['str','STR'],['dex','DEX'],['con','CON'],['int','INT'],['wis','WIS'],['cha','CHA']].map(([k,l]) => (
              <label key={k}>{l}
                <input type="number" min="1" max="30" value={m[k]}
                  onChange={e => set(k, +e.target.value)} />
                <span className="stat-preview">{statMod(m[k])}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Proficiencies & Traits */}
        <div className="editor-section">
          <div className="editor-section-title">Proficiencies & Traits</div>
          <div className="editor-grid">
            <label>Saving Throws <input value={m.saving_throws} onChange={e => set('saving_throws', e.target.value)} placeholder="Str +4, Con +2" /></label>
            <label>Skills        <input value={m.skills}        onChange={e => set('skills', e.target.value)}        placeholder="Perception +3, Stealth +5" /></label>
            <label>Senses        <input value={m.senses}        onChange={e => set('senses', e.target.value)}        placeholder="darkvision 60 ft., passive Perception 13" /></label>
            <label>Languages     <input value={m.languages}     onChange={e => set('languages', e.target.value)}     placeholder="Common, Elvish" /></label>
          </div>
          <div className="editor-grid">
            <label>Damage Immunities    <input value={m.damage_immunities}      onChange={e => set('damage_immunities', e.target.value)} /></label>
            <label>Damage Resistances   <input value={m.damage_resistances}     onChange={e => set('damage_resistances', e.target.value)} /></label>
            <label>Damage Vulnerabilities <input value={m.damage_vulnerabilities} onChange={e => set('damage_vulnerabilities', e.target.value)} /></label>
            <label>Condition Immunities <input value={m.condition_immunities}   onChange={e => set('condition_immunities', e.target.value)} /></label>
          </div>
        </div>

        {/* Action lists */}
        {[
          ['special_abilities', 'Special Abilities'],
          ['actions',           'Actions'],
          ['legendary_actions', 'Legendary Actions'],
        ].map(([listKey, listLabel]) => (
          <div key={listKey} className="editor-section">
            <div className="editor-section-title">{listLabel}</div>
            {m[listKey].map((a, i) => (
              <div key={i} className="editor-action-row">
                <input
                  className="action-name-input"
                  value={a.name}
                  onChange={e => updateAction(listKey, i, 'name', e.target.value)}
                  placeholder="Name"
                />
                <textarea
                  value={a.desc}
                  onChange={e => updateAction(listKey, i, 'desc', e.target.value)}
                  placeholder="Description"
                  rows={2}
                />
                <button className="sb-btn danger small" onClick={() => removeAction(listKey, i)}>✕</button>
              </div>
            ))}
            <button className="sb-btn small" onClick={() => addAction(listKey)}>+ Add {listLabel.replace(/s$/, '')}</button>
          </div>
        ))}

        {/* Notes */}
        <div className="editor-section">
          <div className="editor-section-title">DM Notes</div>
          <textarea
            className="editor-notes"
            value={m.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Lore, tactics, campaign notes…"
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}

// ── Initiative Tracker ─────────────────────────────────────

const CONDITIONS = [
  { key: 'blinded',       label: 'Blinded',       icon: '👁' },
  { key: 'charmed',       label: 'Charmed',       icon: '💗' },
  { key: 'frightened',    label: 'Frightened',    icon: '😱' },
  { key: 'grappled',      label: 'Grappled',      icon: '🤝' },
  { key: 'poisoned',      label: 'Poisoned',      icon: '☠' },
  { key: 'prone',         label: 'Prone',         icon: '⬇' },
  { key: 'restrained',    label: 'Restrained',    icon: '🔗' },
  { key: 'stunned',       label: 'Stunned',       icon: '💫' },
  { key: 'paralyzed',     label: 'Paralyzed',     icon: '⚡' },
  { key: 'concentrating', label: 'Concentrating', icon: '🎯' },
];

const TABLE_SEATS_KEY = 'dm-cockpit:table-seats';
const TABLE_SEAT_IDS = ['top-1', 'top-2', 'left-1', 'left-2', 'right-1', 'right-2'];
const TABLE_SEAT_LABELS = {
  'top-1':   'Top Right',
  'top-2':   'Top Left',
  'left-1':  'Far Right',
  'left-2':  'Far Left',
  'right-1': 'DM Right',
  'right-2': 'DM Left',
};

function roll(mod = 0) {
  return Math.floor(Math.random() * 20) + 1 + mod;
}

function dexMod(monster) {
  return Math.floor(((monster.dexterity || 10) - 10) / 2);
}

function InitiativeTracker({ srdMonsters = [], npcs = [], pcQuick = [], presets = [], combatPresetId, endPresetId, onSaveCombatPreset, onSaveEndPreset, encounterActive, onStartEncounter, onEndEncounter, encounterFiring, encounterError }) {
  const [combatants, setCombatants] = useState([]);
  const [turn,    setTurn]          = useState(0);
  const [round,   setRound]         = useState(1);
  const [monSearch, setMonSearch]   = useState('');
  const [deltas, setDeltas]         = useState({});
  const [encPresets, setEncPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ENCOUNTER_PRESETS_KEY)) || []; } catch { return []; }
  });
  const [libraryPresetId, setLibraryPresetId] = useState('');
  const [savingPresetName, setSavingPresetName] = useState(null);
  const [seatAssignments, setSeatAssignments] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TABLE_SEATS_KEY)) || {}; } catch { return {}; }
  });
  const [tableOpen, setTableOpen] = useState(false);
  const [seatsExpanded, setSeatsExpanded] = useState(false);
  const isElectron = !!window.electronAPI;

  const persistEncPresets = (next) => {
    setEncPresets(next);
    localStorage.setItem(ENCOUNTER_PRESETS_KEY, JSON.stringify(next));
  };

  const startSavePreset = () => { if (combatants.length > 0) setSavingPresetName(''); };

  const confirmSavePreset = () => {
    const name = (savingPresetName || '').trim();
    if (!name) return;
    const preset = { id: uid(), name, combatants: combatants.map(({ id, ...rest }) => rest) };
    persistEncPresets([...encPresets, preset]);
    setSavingPresetName(null);
    setLibraryPresetId(preset.id);
  };

  const loadEncounterPreset = (id) => {
    const preset = encPresets.find(p => p.id === id);
    if (!preset) return;
    setCombatants(prev => [...prev, ...preset.combatants.map(c => ({ ...c, id: uid() }))]);
  };

  const deleteEncounterPreset = (id) => {
    persistEncPresets(encPresets.filter(p => p.id !== id));
    if (libraryPresetId === id) setLibraryPresetId('');
  };

  const openStatBlock = (c) => {
    if (!c.monsterData) return;
    if (isElectron) {
      window.electronAPI.statblock.open(c.monsterData);
    }
  };

  const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative);

  const addCombatant = (c) => setCombatants(prev => [...prev, c]);

  const addPC = (pc) => {
    if (combatants.some(c => c.name === pc.name)) return;
    addCombatant({ id: uid(), name: pc.name, initiative: 0, initMod: pc.initMod || 0, hp: pc.maxHp || 0, maxHp: pc.maxHp || 0, isPC: true });
  };

  const addAllPCs = () => pcQuick.forEach(pc => {
    if (!combatants.some(c => c.name === pc.name)) addCombatant({ id: uid(), name: pc.name, initiative: 0, initMod: pc.initMod || 0, hp: pc.maxHp || 0, maxHp: pc.maxHp || 0, isPC: true });
  });

  const addMonster = (m) => {
    const mod = dexMod(m);
    const hp = m.hit_points || m.hp || 0;
    addCombatant({ id: uid(), name: m.name, initiative: roll(mod), initMod: mod, hp, maxHp: hp, isPC: false, monsterData: m });
    setMonSearch('');
  };

  const duplicateCombatant = (c) => {
    const base = c.name.replace(/ \(\d+\)$/, '');
    const count = combatants.filter(x => x.name === base || x.name.startsWith(base + ' (')).length;
    addCombatant({ ...c, id: uid(), name: `${base} (${count + 1})` });
  };

  const remove = (id) => {
    const currentSorted = [...combatants].sort((a, b) => b.initiative - a.initiative);
    const removedIdx    = currentSorted.findIndex(c => c.id === id);
    const next          = combatants.filter(c => c.id !== id);
    setCombatants(next);
    if (next.length === 0) { setTurn(0); return; }
    if (removedIdx < turn)       setTurn(t => t - 1);
    else if (removedIdx === turn) setTurn(t => Math.min(t, next.length - 1));
  };

  const updateHp    = (id, delta) => setCombatants(prev => prev.map(c => c.id === id ? { ...c, hp: Math.max(0, c.hp + delta) } : c));
  const setHpDirect = (id, val)   => setCombatants(prev => prev.map(c => c.id === id ? { ...c, hp: Math.max(0, parseInt(val) || 0) } : c));
  const setDelta    = (id, val)   => setDeltas(prev => ({ ...prev, [id]: val }));

  const applyDelta = (id, sign) => {
    const val = parseInt(deltas[id]) || 0;
    if (val === 0) return;
    updateHp(id, sign * val);
    setDeltas(prev => ({ ...prev, [id]: '' }));
  };

  const nextTurn = () => {
    if (sorted.length === 0) return;
    const next = (turn + 1) % sorted.length;
    if (next === 0) setRound(r => r + 1);
    setTurn(next);
  };

  const reset   = () => { setCombatants([]); setTurn(0); setRound(1); };
  const [initInputs, setInitInputs] = useState({});
  const setInitInput  = (id, val) => setInitInputs(prev => ({ ...prev, [id]: val }));
  const commitInit    = (id, fallback) => {
    const raw = initInputs[id];
    if (raw === undefined) return;
    const parsed = parseInt(raw, 10);
    const value  = isNaN(parsed) ? fallback : parsed;
    setCombatants(prev => prev.map(c => c.id === id ? { ...c, initiative: value } : c));
    setInitInputs(prev => { const n = { ...prev }; delete n[id]; return n; });
  };
  const rollAll = () => { setCombatants(prev => prev.map(c => c.isPC ? c : { ...c, initiative: roll(c.initMod || 0) })); setTurn(0); };

  const assignSeat = (seatId, pcName) => {
    setSeatAssignments(prev => {
      const next = { ...prev };
      if (pcName) next[seatId] = pcName;
      else delete next[seatId];
      localStorage.setItem(TABLE_SEATS_KEY, JSON.stringify(next));
      return next;
    });
  };

  // ── Table Display (per-seat HUD) ──
  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.table.isOpen().then(setTableOpen);
  }, [isElectron]);

  const toggleTableDisplay = async () => {
    if (!isElectron) return;
    if (tableOpen) {
      await window.electronAPI.table.close();
      setTableOpen(false);
    } else {
      await window.electronAPI.table.open();
      setTableOpen(true);
    }
  };

  useEffect(() => {
    if (!isElectron || !tableOpen) return;
    const seats = {};
    TABLE_SEAT_IDS.forEach(seatId => {
      const pcName = seatAssignments[seatId];
      if (!pcName) return;
      const pc = pcQuick.find(p => p.name === pcName);
      const idx = sorted.findIndex(c => c.name === pcName);
      if (idx === -1) {
        // Not in the tracker yet — show the seat's PC by default, no combat info.
        seats[seatId] = {
          name: pcName,
          class: pc?.class,
          species: pc?.species,
          inCombat: false,
        };
        return;
      }
      const c = sorted[idx];
      seats[seatId] = {
        name: c.name,
        class: pc?.class,
        species: pc?.species,
        ac: c.monsterData?.ac,
        hp: c.hp,
        maxHp: c.maxHp,
        initiative: c.initiative,
        conditions: (c.conditions || []).map(key => CONDITIONS.find(cd => cd.key === key)?.label || key),
        active: idx === turn,
        inCombat: true,
      };
    });
    window.electronAPI.table.sync({ seats, round, turn });
  }, [combatants, turn, round, seatAssignments, tableOpen, isElectron]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCondition = (id, cond) => setCombatants(prev => prev.map(c => {
    if (c.id !== id) return c;
    const has = (c.conditions || []).includes(cond);
    return { ...c, conditions: has ? c.conditions.filter(x => x !== cond) : [...(c.conditions || []), cond] };
  }));

  const monResults = monSearch.trim().length >= 2
    ? srdMonsters.filter(m => m.name.toLowerCase().includes(monSearch.toLowerCase())).slice(0, 8)
    : [];

  const npcResults = monSearch.trim().length >= 2
    ? npcs.filter(n => n.name.toLowerCase().includes(monSearch.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="initiative">

      {/* ══ SECTION: Presets ══ */}
      <section className="init-section">
        <div className="init-section-title">Encounter Presets</div>
        <div className="init-row init-encounter-preset-row">
          <select
            className="encounter-preset-select"
            value={libraryPresetId}
            onChange={e => { setLibraryPresetId(e.target.value); if (e.target.value) loadEncounterPreset(e.target.value); }}
            title="Load a saved encounter preset into the tracker"
          >
            <option value="">— Load encounter preset —</option>
            {encPresets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.combatants.length})</option>)}
          </select>
          {libraryPresetId && (
            <button className="sb-btn danger small" title="Delete this preset" onClick={() => deleteEncounterPreset(libraryPresetId)}>✕</button>
          )}
          {savingPresetName === null ? (
            <button className="sb-btn" onClick={startSavePreset} disabled={combatants.length === 0} title="Save current combatants as a preset">💾 Save Preset</button>
          ) : (
            <>
              <input
                type="text"
                autoFocus
                className="initiative-name-input"
                placeholder="Preset name…"
                value={savingPresetName}
                onChange={e => setSavingPresetName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmSavePreset(); if (e.key === 'Escape') setSavingPresetName(null); }}
              />
              <button className="sb-btn primary small" onClick={confirmSavePreset}>Save</button>
              <button className="sb-btn small" onClick={() => setSavingPresetName(null)}>Cancel</button>
            </>
          )}
        </div>
      </section>

      {/* ══ SECTION: Build Encounter ══ */}
      <section className="init-section">
        <div className="init-section-title">Build Encounter</div>

        {/* PC quick-add */}
        <div className="init-row init-pc-row">
          {pcQuick.map(pc => (
            <button
              key={pc.name}
              className={`init-pc-btn ${combatants.some(c => c.name === pc.name) ? 'added' : ''}`}
              onClick={() => addPC(pc)}
              title={`${pc.name} (Init +${pc.initMod || 0}, HP ${pc.maxHp || 0})`}
              disabled={combatants.some(c => c.name === pc.name)}
            >
              {pc.shortName || pc.name.split(' ')[0]}
            </button>
          ))}
          <button className="init-pc-btn add-all" onClick={addAllPCs}>+ All PCs</button>
        </div>

        {/* Table seat assignments */}
        <div className="init-row table-seats-row">
          <button className="sb-btn small" onClick={() => setSeatsExpanded(e => !e)}>
            🪑 Table Seats {seatsExpanded ? '▲' : '▼'}
          </button>
          {isElectron && (
            <button
              className={`sb-btn small ${tableOpen ? 'primary' : ''}`}
              onClick={toggleTableDisplay}
              title="Pop out the per-seat HP/initiative display"
            >
              {tableOpen ? '📺 Close Table Display' : '📺 Open Table Display'}
            </button>
          )}
        </div>
        {seatsExpanded && (
          <div className="init-row table-seats-grid">
            {TABLE_SEAT_IDS.map(seatId => (
              <label key={seatId} className="table-seat-select">
                <span className="table-seat-label">{TABLE_SEAT_LABELS[seatId]}</span>
                <select
                  value={seatAssignments[seatId] || ''}
                  onChange={e => assignSeat(seatId, e.target.value)}
                >
                  <option value="">— none —</option>
                  {pcQuick.map(pc => <option key={pc.name} value={pc.name}>{pc.name}</option>)}
                </select>
              </label>
            ))}
          </div>
        )}

        {/* Monster search */}
        <div className="init-row init-mon-search-wrap">
          <input
            className="init-mon-search"
            placeholder="Search monsters or NPCs to add…"
            value={monSearch}
            onChange={e => setMonSearch(e.target.value)}
          />
          {(npcResults.length > 0 || monResults.length > 0) && (
            <div className="init-mon-results">
              {npcResults.map(n => {
                const mod = dexMod(n);
                const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                return (
                  <button key={`npc-${n.id}`} className="init-mon-result" onClick={() => addMonster(n)}>
                    <span className="imr-name">🎭 {n.name}</span>
                    <span className="imr-meta">NPC · HP {n.hp} · Init {modStr}</span>
                  </button>
                );
              })}
              {monResults.map(m => {
                const mod = dexMod(m);
                const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                return (
                  <button key={m.slug || m.id} className="init-mon-result" onClick={() => addMonster(m)}>
                    <span className="imr-name">{m.name}</span>
                    <span className="imr-meta">CR {m.cr || '?'} · HP {m.hit_points} · Init {modStr}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </section>

      {/* ══ SECTION: Combat Controls ══ */}
      <section className="init-section">
        <div className="init-section-title">Combat Controls</div>


        <div className="init-row initiative-header">
          <div className="round-badge">Round {round}</div>
          <div className="initiative-controls">
            <button className="sb-btn" onClick={rollAll} title="Re-roll all initiatives">🎲 Roll All</button>
            <button className="sb-btn primary" onClick={nextTurn} disabled={sorted.length === 0}>Next Turn ▶</button>
            <button className="sb-btn danger" onClick={reset}>✕ Reset</button>
          </div>
        </div>

        <div className="init-row encounter-start-row">
          {!encounterActive ? (
            <>
              <select
                className="encounter-preset-select"
                value={combatPresetId}
                onChange={e => onSaveCombatPreset(e.target.value)}
                title="Scene preset to fire on encounter start"
              >
                <option value="">— Start scene —</option>
                {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button
                className={`sb-btn encounter-start-btn${encounterFiring ? ' firing' : ''}`}
                onClick={onStartEncounter}
                disabled={encounterFiring}
                title="Start encounter and fire scene preset"
              >
                {encounterFiring ? 'Starting…' : '⚔ Start Encounter'}
              </button>
            </>
          ) : (
            <>
              <select
                className="encounter-preset-select"
                value={endPresetId}
                onChange={e => onSaveEndPreset(e.target.value)}
                title="Scene preset to fire on encounter end"
              >
                <option value="">— End scene —</option>
                {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button
                className={`sb-btn encounter-end-btn${encounterFiring ? ' firing' : ''}`}
                onClick={onEndEncounter}
                disabled={encounterFiring}
                title="End encounter and fire scene preset"
              >
                {encounterFiring ? 'Ending…' : '✓ End Encounter'}
              </button>
            </>
          )}
          {encounterError && <span className="encounter-start-error">{encounterError}</span>}
        </div>
      </section>

      {/* ── Combatant list ── */}
      <div className="combatant-list">
        {sorted.length === 0 && <div className="initiative-empty">Add combatants above to begin tracking.</div>}
        {sorted.map((c, i) => (
          <div key={c.id} className={`combatant ${i === turn ? 'active-turn' : ''} ${c.hp === 0 ? 'unconscious' : ''} ${c.isPC ? 'combatant-pc' : ''}`}>
            <div className="combatant-row-top">
              <div className="combatant-turn-marker">{i === turn ? '▶' : ''}</div>
              <input
                type="number"
                className={`combatant-init ${initInputs[c.id] !== undefined && initInputs[c.id] === '' ? 'init-invalid' : ''}`}
                value={initInputs[c.id] !== undefined ? initInputs[c.id] : c.initiative}
                onChange={e => setInitInput(c.id, e.target.value)}
                onBlur={() => commitInit(c.id, c.initiative)}
              />
              <div
                className={`combatant-name ${c.monsterData ? 'combatant-name--link' : ''}`}
                onClick={() => openStatBlock(c)}
                title={c.monsterData ? 'View stat block' : undefined}
              >
                {c.name}
                {c.isPC && <span className="combatant-pc-badge">PC</span>}
              </div>
              <button className="sb-btn small" onClick={() => duplicateCombatant(c)} title="Duplicate">⧉</button>
              <button className="sb-btn danger small" onClick={() => remove(c.id)}>✕</button>
            </div>

            <div className="combatant-row-hp">
              <button onClick={() => updateHp(c.id, -1)}>−</button>
              <div className="hp-bar-wrap">
                <div className="hp-bar" style={{
                  width: `${c.maxHp > 0 ? Math.round((c.hp / c.maxHp) * 100) : 0}%`,
                  background: c.hp / c.maxHp > 0.5 ? '#4caf50' : c.hp / c.maxHp > 0.25 ? '#ff9800' : '#f44336'
                }} />
                <div className="hp-bar-label">
                  <input type="number" value={c.hp} onChange={e => setHpDirect(c.id, e.target.value)} />
                  <span className="hp-max">/ {c.maxHp}</span>
                </div>
              </div>
              <button onClick={() => updateHp(c.id, 1)}>+</button>
              <div className="combatant-delta">
                <button onClick={() => applyDelta(c.id, -1)} title="Subtract">−</button>
                <input type="number" min="0" value={deltas[c.id] || ''} onChange={e => setDelta(c.id, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') applyDelta(c.id, -1); }} placeholder="dmg" style={{ width: 52 }} />
                <button onClick={() => applyDelta(c.id, 1)} title="Heal">+</button>
              </div>
            </div>

            <div className="combatant-row-conditions">
              {(c.conditions || []).map(key => {
                const cond = CONDITIONS.find(x => x.key === key);
                if (!cond) return null;
                return (
                  <button key={key} className="condition-chip active" onClick={() => toggleCondition(c.id, key)} title={`Remove ${cond.label}`}>
                    <span className="condition-icon">{cond.icon}</span>{cond.label}
                  </button>
                );
              })}
              <div className="condition-add-wrap">
                <select className="condition-add-select" value="" onChange={e => { if (e.target.value) toggleCondition(c.id, e.target.value); }}>
                  <option value="">+ Condition…</option>
                  {CONDITIONS.filter(cond => !(c.conditions || []).includes(cond.key)).map(cond => (
                    <option key={cond.key} value={cond.key}>{cond.icon} {cond.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Delete confirmation modal ──────────────────────────────
function DeleteConfirmModal({ name, onConfirm, onCancel }) {
  return (
    <div className="docs-overlay" onClick={onCancel}>
      <div className="docs-modal" onClick={e => e.stopPropagation()}>
        <h3>Delete Custom Monster?</h3>
        <p className="docs-modal-body">"{name}" will be permanently deleted.</p>
        <div className="docs-modal-actions">
          <button className="docs-btn secondary" onClick={onCancel}>Cancel</button>
          <button className="docs-btn danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

const ENCOUNTER_PRESETS_KEY = 'dm-cockpit:encounter-presets';
const COMBAT_PRESET_KEY = 'dm-cockpit:combat-preset-id';
const END_PRESET_KEY    = 'dm-cockpit:end-preset-id';
const ENCOUNTER_ACTIVE_KEY = 'dm-cockpit:encounter-active';

// ── Main Encounters Panel ──────────────────────────────────
export default function Encounters() {
  const [tab, setTab]               = useState('initiative');
  const [search, setSearch]         = useState('');
  const [filterCr, setFilterCr]     = useState('');
  const [filterType, setFilterType] = useState('');
  const [allSrd, setAllSrd]         = useState([]);   // full list, loaded once
  const [customMonsters, setCustomMonsters] = useState([]);
  const [npcs, setNpcs]             = useState([]);
  const [npcSearch, setNpcSearch]   = useState('');
  const [selectedNpc, setSelectedNpc] = useState(null);
  const [editingNpc, setEditingNpc] = useState(null);
  const [deleteNpcConfirm, setDeleteNpcConfirm] = useState(null); // { id, name }
  const [selectedMonster, setSelectedMonster] = useState(null);
  const [selectedSource, setSelectedSource]   = useState(null);
  const [editing, setEditing]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [showCustomOnly, setShowCustomOnly] = useState(false);
  const [pcQuick, setPcQuick]       = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name }

  // Encounter state — lifted here so it survives tab switches
  const [presets,          setPresets]          = useState([]);
  const [combatPresetId,   setCombatPresetId]   = useState(() => localStorage.getItem(COMBAT_PRESET_KEY) || '');
  const [endPresetId,      setEndPresetId]      = useState(() => localStorage.getItem(END_PRESET_KEY) || '');
  const [encounterActive,  setEncounterActive]  = useState(() => localStorage.getItem(ENCOUNTER_ACTIVE_KEY) === 'true');
  const [encounterFiring,  setEncounterFiring]  = useState(false);
  const [encounterError,   setEncounterError]   = useState('');

  const isElectron = !!window.electronAPI;

  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.presets.load().then(saved => {
      setPresets(Array.isArray(saved) ? saved : []);
    });
  }, [isElectron]);

  const saveCombatPreset = (id) => { setCombatPresetId(id); localStorage.setItem(COMBAT_PRESET_KEY, id); };
  const saveEndPreset    = (id) => { setEndPresetId(id);    localStorage.setItem(END_PRESET_KEY, id);    };

  const firePresetById = async (id) => {
    const preset = presets.find(p => p.id === id);
    if (!preset) return;
    if (preset.ambience && Object.keys(preset.ambience).length > 0) {
      ambienceEngine.applyMix(preset.ambience);
    } else {
      ambienceEngine.applyMix({});
    }
    if (!isElectron) return;
    const actions = [];
    if (preset.playlistId === 'NONE_PLAYLIST_ID' || preset.playlistId === '__none__') actions.push(window.electronAPI.spotify.pause());
    else if (preset.playlistUri) actions.push(window.electronAPI.spotify.play(preset.playlistUri));
    if (preset.lightSequence?.stops?.length) {
      actions.push(window.electronAPI.lights.startLoop(preset.lightSequence));
    } else {
      window.electronAPI.lights.stopLoop();
    }
    if (actions.length) {
      const results = await Promise.all(actions);
      const fail = results.find(r => !r.success);
      if (fail) setEncounterError(fail.error);
    }
  };

  const startEncounter = async () => {
    setEncounterFiring(true);
    setEncounterError('');
    await firePresetById(combatPresetId);
    setEncounterActive(true);
    localStorage.setItem(ENCOUNTER_ACTIVE_KEY, 'true');
    setEncounterFiring(false);
  };

  const endEncounter = async () => {
    setEncounterFiring(true);
    setEncounterError('');
    await firePresetById(endPresetId);
    setEncounterActive(false);
    localStorage.setItem(ENCOUNTER_ACTIVE_KEY, 'false');
    setEncounterFiring(false);
  };

  // Load PC data from characters.json (single source of truth)
  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.characters.loadSeed().then(data => {
      const pcs = (data.characters || []).filter(c => c.type === 'pc');
      setPcQuick(pcs);
    });
  }, [isElectron]);

  // Load custom monsters on mount
  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.monsters.load().then(data => {
      setCustomMonsters(data.custom || []);
    });
  }, [isElectron]);

  // Load NPCs on mount
  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.npcs.load().then(data => {
      setNpcs(data.custom || []);
    });
  }, [isElectron]);

  // Load SRD monsters from local srd-library/monsters.json via IPC
  useEffect(() => {
    if (!isElectron) return;
    setLoading(true);
    window.electronAPI.monsters.loadSrd().then(res => {
      if (res.success) setAllSrd(res.data);
      else setError(res.error);
      setLoading(false);
    });
  }, [isElectron]);

  // Filter locally — instant
  const srdResults = allSrd.filter(m => {
    if (showCustomOnly) return false;
    if (search   && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCr && String(m.challenge_rating ?? m.cr) !== filterCr) return false;
    if (filterType && m.type?.toLowerCase() !== filterType.toLowerCase()) return false;
    return true;
  });

  const filteredCustom = customMonsters.filter(m => {
    if (search     && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCr   && String(m.cr) !== String(filterCr)) return false;
    if (filterType && m.type?.toLowerCase() !== filterType.toLowerCase()) return false;
    return true;
  });

  const handleSelectSrd    = (m) => { setSelectedMonster(m); setSelectedSource('srd');    setEditing(null); };
  const handleSelectCustom = (m) => { setSelectedMonster(m); setSelectedSource('custom'); setEditing(null); };

  const handleClone = (srdMonster) => {
    const clone = srdToCustom(srdMonster);
    setEditing(clone);
    setSelectedMonster(null);
  };

  const handleNewCustom = () => {
    setEditing(blankMonster());
    setSelectedMonster(null);
  };

  const handleEditCustom = (monster) => {
    setEditing({ ...monster });
    setSelectedMonster(null);
  };

  const handleSave = async (monster) => {
    if (!isElectron) return;
    const res = await window.electronAPI.monsters.saveCustom(monster);
    if (res.success) {
      const data = await window.electronAPI.monsters.load();
      setCustomMonsters(data.custom || []);
      setEditing(null);
      setSelectedMonster(monster);
      setSelectedSource('custom');
    } else {
      setError(res.error);
    }
  };

  const handleDelete = (monster) => {
    setDeleteConfirm({ id: monster.id, name: monster.name });
  };

  const doDelete = async () => {
    if (!deleteConfirm) return;
    const res = await window.electronAPI.monsters.deleteCustom(deleteConfirm.id);
    if (!res?.success) { setError(res?.error || 'Delete failed'); setDeleteConfirm(null); return; }
    const data = await window.electronAPI.monsters.load();
    setCustomMonsters(data.custom || []);
    setSelectedMonster(null);
    setDeleteConfirm(null);
  };

  const filteredNpcs = npcs.filter(n =>
    !npcSearch || n.name.toLowerCase().includes(npcSearch.toLowerCase())
  );

  const handleSelectNpc = (n) => { setSelectedNpc(n); setEditingNpc(null); };
  const handleNewNpc    = () => { setEditingNpc(blankNpc()); setSelectedNpc(null); };
  const handleEditNpc   = (n) => { setEditingNpc({ ...n }); setSelectedNpc(null); };

  const handleSaveNpc = async (npc) => {
    if (!isElectron) return;
    const res = await window.electronAPI.npcs.saveCustom(npc);
    if (res.success) {
      const data = await window.electronAPI.npcs.load();
      setNpcs(data.custom || []);
      setEditingNpc(null);
      setSelectedNpc(npc);
    } else {
      setError(res.error);
    }
  };

  const handleDeleteNpc = (npc) => setDeleteNpcConfirm({ id: npc.id, name: npc.name });

  const doDeleteNpc = async () => {
    if (!deleteNpcConfirm) return;
    const res = await window.electronAPI.npcs.deleteCustom(deleteNpcConfirm.id);
    if (!res?.success) { setError(res?.error || 'Delete failed'); setDeleteNpcConfirm(null); return; }
    const data = await window.electronAPI.npcs.load();
    setNpcs(data.custom || []);
    setSelectedNpc(null);
    setDeleteNpcConfirm(null);
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="encounters-panel">

      {/* Tab switcher */}
      <div className="enc-tabs">
        <button className={`enc-tab ${tab === 'npcs'       ? 'active' : ''}`} onClick={() => setTab('npcs')}>
          🎭 NPCs
        </button>
        <button className={`enc-tab ${tab === 'initiative' ? 'active' : ''}`} onClick={() => setTab('initiative')}>
          ⚔️ Initiative
        </button>
        <button className={`enc-tab ${tab === 'monsters'   ? 'active' : ''}`} onClick={() => setTab('monsters')}>
          🐉 Monsters
        </button>
      </div>

      {/* ── NPCS TAB ── */}
      {tab === 'npcs' && (
        <div className="monsters-layout">

          {/* Left: search + list */}
          <div className="monsters-sidebar">
            <div className="monsters-search-bar">
              <input
                className="enc-search"
                value={npcSearch}
                onChange={e => setNpcSearch(e.target.value)}
                placeholder="Search NPCs…"
              />
            </div>

            <div className="monsters-list-controls">
              <button className="sb-btn primary small" onClick={handleNewNpc}>+ New NPC</button>
            </div>

            {error && <div className="enc-error">{error}</div>}

            <div className="monsters-list">
              <div className="list-group">
                {filteredNpcs.length === 0 && (
                  <div className="enc-empty">No NPCs yet. Create one with <strong>+ New NPC</strong>.</div>
                )}
                {filteredNpcs.map(n => (
                  <div
                    key={n.id}
                    className={`monster-row ${selectedNpc?.id === n.id ? 'selected' : ''}`}
                    onClick={() => handleSelectNpc(n)}
                  >
                    <span className="mr-name">{n.name}</span>
                    <span className="mr-cr">CR {n.cr}</span>
                    <span className="mr-type">{n.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: stat block or editor */}
          <div className="monsters-detail">
            {editingNpc && (
              <MonsterEditor
                initial={editingNpc}
                onSave={handleSaveNpc}
                onCancel={() => setEditingNpc(null)}
              />
            )}
            {!editingNpc && selectedNpc && (
              <StatBlock
                monster={selectedNpc}
                isCustom={true}
                onEdit={handleEditNpc}
                onDelete={handleDeleteNpc}
              />
            )}
            {deleteNpcConfirm && (
              <DeleteConfirmModal
                name={deleteNpcConfirm.name}
                onConfirm={doDeleteNpc}
                onCancel={() => setDeleteNpcConfirm(null)}
              />
            )}
            {!editingNpc && !selectedNpc && (
              <div className="detail-empty">
                <div className="detail-empty-icon">🎭</div>
                <p>Select an NPC to view its stat block.</p>
                <p className="detail-empty-hint">Or create one with <strong>+ New NPC</strong>.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MONSTERS TAB ── */}
      {tab === 'monsters' && (
        <div className="monsters-layout">

          {/* Left: search + list */}
          <div className="monsters-sidebar">
            <div className="monsters-search-bar">
              <input
                className="enc-search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search monsters…"
              />
              <select value={filterCr} onChange={e => setFilterCr(e.target.value)} className="enc-filter">
                <option value="">Any CR</option>
                {CR_OPTIONS.map(c => <option key={c} value={c}>CR {c}</option>)}
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="enc-filter">
                <option value="">Any Type</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="monsters-list-controls">
              <button
                className={`enc-toggle ${showCustomOnly ? 'active' : ''}`}
                onClick={() => setShowCustomOnly(p => !p)}
              >
                ★ Custom Only
              </button>
              <button className="sb-btn primary small" onClick={handleNewCustom}>+ New Custom</button>
            </div>

            {error && <div className="enc-error">{error}</div>}

            <div className="monsters-list">
              {/* Custom monsters */}
              {filteredCustom.length > 0 && (
                <div className="list-group">
                  <div className="list-group-label">Custom</div>
                  {filteredCustom.map(m => (
                    <div
                      key={m.id}
                      className={`monster-row ${selectedMonster?.id === m.id ? 'selected' : ''}`}
                      onClick={() => handleSelectCustom(m)}
                    >
                      <span className="mr-name">{m.name}</span>
                      <span className="mr-cr">CR {m.cr}</span>
                      <span className="mr-type">{m.type}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* SRD monsters */}
              {!showCustomOnly && (
                <div className="list-group">
                  {filteredCustom.length > 0 && <div className="list-group-label">SRD</div>}
                  {loading && <div className="enc-loading">Searching…</div>}
                  {!loading && srdResults.length === 0 && !error && (
                    <div className="enc-empty">No SRD results. Try a different search.</div>
                  )}
                  {srdResults.map(m => (
                    <div
                      key={m.slug}
                      className={`monster-row ${selectedMonster?.slug === m.slug ? 'selected' : ''}`}
                      onClick={() => handleSelectSrd(m)}
                    >
                      <span className="mr-name">{m.name}</span>
                      <span className="mr-cr">CR {m.challenge_rating || m.cr}</span>
                      <span className="mr-type">{m.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: stat block or editor */}
          <div className="monsters-detail">
            {editing && (
              <MonsterEditor
                initial={editing}
                onSave={handleSave}
                onCancel={() => setEditing(null)}
              />
            )}
            {!editing && selectedMonster && (
              <StatBlock
                monster={selectedMonster}
                isCustom={selectedSource === 'custom'}
                onClone={handleClone}
                onEdit={handleEditCustom}
                onDelete={handleDelete}
              />
            )}
            {deleteConfirm && (
              <DeleteConfirmModal
                name={deleteConfirm.name}
                onConfirm={doDelete}
                onCancel={() => setDeleteConfirm(null)}
              />
            )}
            {!editing && !selectedMonster && (
              <div className="detail-empty">
                <div className="detail-empty-icon">🐉</div>
                <p>Select a monster to view its stat block.</p>
                <p className="detail-empty-hint">Or create a custom monster with <strong>+ New Custom</strong>.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── INITIATIVE TAB ── */}
      {tab === 'initiative' && (
        <InitiativeTracker
          srdMonsters={[...customMonsters, ...allSrd]}
          npcs={npcs}
          pcQuick={pcQuick}
          presets={presets}
          combatPresetId={combatPresetId}
          endPresetId={endPresetId}
          onSaveCombatPreset={saveCombatPreset}
          onSaveEndPreset={saveEndPreset}
          encounterActive={encounterActive}
          onStartEncounter={startEncounter}
          onEndEncounter={endEncounter}
          encounterFiring={encounterFiring}
          encounterError={encounterError}
        />
      )}
    </div>
  );
}
