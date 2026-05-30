import React, { useState, useEffect } from 'react';
import './Encounters.css';

// ── Helpers ────────────────────────────────────────────────
const API_V1 = 'https://api.open5e.com/v1';
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
  const crText   = monster.cr || monster.challenge_rating_text || monster.challenge_rating || '';

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
              <button className="sb-btn danger" onClick={() => onDelete(monster.id)}>🗑 Delete</button>
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
function InitiativeTracker() {
  const [combatants, setCombatants] = useState([]);
  const [newName, setNewName]       = useState('');
  const [newInit, setNewInit]       = useState('');
  const [newHp,   setNewHp]         = useState('');
  const [turn,    setTurn]          = useState(0);
  const [round,   setRound]         = useState(1);

  const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative);

  const add = () => {
    if (!newName.trim()) return;
    setCombatants(prev => [...prev, {
      id: uid(), name: newName.trim(),
      initiative: parseInt(newInit) || 0,
      hp: parseInt(newHp) || 0,
      maxHp: parseInt(newHp) || 0,
      conditions: [],
      active: false,
    }]);
    setNewName(''); setNewInit(''); setNewHp('');
  };

  const remove = (id) => {
    setCombatants(prev => {
      const next = prev.filter(c => c.id !== id);
      return next;
    });
    setTurn(0);
  };

  const updateHp = (id, delta) => {
    setCombatants(prev => prev.map(c =>
      c.id === id ? { ...c, hp: Math.max(0, c.hp + delta) } : c
    ));
  };

  const setHpDirect = (id, val) => {
    setCombatants(prev => prev.map(c =>
      c.id === id ? { ...c, hp: Math.max(0, parseInt(val) || 0) } : c
    ));
  };

  const [deltas, setDeltas] = useState({});  // id → string input value

  const setDelta = (id, val) => setDeltas(prev => ({ ...prev, [id]: val }));

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

  const reset = () => { setCombatants([]); setTurn(0); setRound(1); };

  const rollAll = () => {
    setCombatants(prev => prev.map(c => ({
      ...c,
      initiative: Math.floor(Math.random() * 20) + 1,
    })));
    setTurn(0);
  };

  return (
    <div className="initiative">
      <div className="initiative-header">
        <div className="round-badge">Round {round}</div>
        <div className="initiative-controls">
          <button className="sb-btn" onClick={rollAll} title="Re-roll all initiatives">🎲 Roll All</button>
          <button className="sb-btn primary" onClick={nextTurn} disabled={sorted.length === 0}>Next Turn ▶</button>
          <button className="sb-btn danger" onClick={reset}>✕ Reset</button>
        </div>
      </div>

      {/* Add combatant */}
      <div className="initiative-add">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Name"
          className="initiative-name-input"
        />
        <input
          type="number"
          value={newInit}
          onChange={e => setNewInit(e.target.value)}
          placeholder="Init"
          className="initiative-num-input"
        />
        <input
          type="number"
          value={newHp}
          onChange={e => setNewHp(e.target.value)}
          placeholder="HP"
          className="initiative-num-input"
        />
        <button className="sb-btn primary" onClick={add}>+ Add</button>
      </div>

      {/* Combatant list */}
      <div className="combatant-list">
        {sorted.length === 0 && (
          <div className="initiative-empty">Add combatants above to begin tracking.</div>
        )}
        {sorted.map((c, i) => (
          <div key={c.id} className={`combatant ${i === turn ? 'active-turn' : ''} ${c.hp === 0 ? 'unconscious' : ''}`}>
            <div className="combatant-turn-marker">{i === turn ? '▶' : ''}</div>
            <div className="combatant-init">{c.initiative}</div>
            <div className="combatant-name">{c.name}</div>
            <div className="combatant-hp">
              <button onClick={() => updateHp(c.id, -1)}>−</button>
              <input
                type="number"
                value={c.hp}
                onChange={e => setHpDirect(c.id, e.target.value)}
                style={{ width: 52 }}
              />
              <span className="hp-max">/ {c.maxHp}</span>
              <button onClick={() => updateHp(c.id, 1)}>+</button>
            </div>
            <div className="combatant-delta">
              <button onClick={() => applyDelta(c.id, -1)} title="Subtract">−</button>
              <input
                type="number"
                min="0"
                value={deltas[c.id] || ''}
                onChange={e => setDelta(c.id, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyDelta(c.id, -1); }}
                placeholder="dmg"
                style={{ width: 52 }}
              />
              <button onClick={() => applyDelta(c.id, 1)} title="Heal">+</button>
            </div>
            <div className={`hp-bar-wrap`}>
              <div
                className="hp-bar"
                style={{ width: `${c.maxHp > 0 ? Math.round((c.hp / c.maxHp) * 100) : 0}%`,
                         background: c.hp / c.maxHp > 0.5 ? '#4caf50' : c.hp / c.maxHp > 0.25 ? '#ff9800' : '#f44336' }}
              />
            </div>
            <button className="sb-btn danger small" onClick={() => remove(c.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Encounters Panel ──────────────────────────────────
export default function Encounters() {
  const [tab, setTab]               = useState('monsters');
  const [search, setSearch]         = useState('');
  const [filterCr, setFilterCr]     = useState('');
  const [filterType, setFilterType] = useState('');
  const [allSrd, setAllSrd]         = useState([]);   // full list, loaded once
  const [customMonsters, setCustomMonsters] = useState([]);
  const [selectedMonster, setSelectedMonster] = useState(null);
  const [selectedSource, setSelectedSource]   = useState(null);
  const [editing, setEditing]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [showCustomOnly, setShowCustomOnly] = useState(false);
  const isElectron = !!window.electronAPI;

  // Load custom monsters on mount
  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.monsters.load().then(data => {
      setCustomMonsters(data.custom || []);
    });
  }, [isElectron]);

  // Load ALL SRD monsters once on mount — paginate until done
  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true); setError('');
      try {
        let url = `${API_V1}/monsters/?limit=100`;
        let results = [];
        while (url) {
          const res  = await fetch(url);
          const data = await res.json();
          results = [...results, ...(data.results || [])];
          url = cancelled ? null : data.next;
        }
        if (!cancelled) setAllSrd(results);
      } catch {
        if (!cancelled) setError('Could not reach Open5e API. Check your connection.');
      }
      if (!cancelled) setLoading(false);
    }
    fetchAll();
    return () => { cancelled = true; };
  }, []);

  // Filter locally — instant
  const srdResults = allSrd.filter(m => {
    if (showCustomOnly) return false;
    if (search   && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCr && String(m.cr) !== String(filterCr)) return false;
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this custom monster?')) return;
    await window.electronAPI.monsters.deleteCustom(id);
    const data = await window.electronAPI.monsters.load();
    setCustomMonsters(data.custom || []);
    setSelectedMonster(null);
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="encounters-panel">

      {/* Tab switcher */}
      <div className="enc-tabs">
        <button className={`enc-tab ${tab === 'monsters'   ? 'active' : ''}`} onClick={() => setTab('monsters')}>
          🐉 Monsters
        </button>
        <button className={`enc-tab ${tab === 'initiative' ? 'active' : ''}`} onClick={() => setTab('initiative')}>
          ⚔️ Initiative
        </button>
      </div>

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
                      <span className="mr-cr">CR {m.cr || m.challenge_rating}</span>
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
      {tab === 'initiative' && <InitiativeTracker />}
    </div>
  );
}
