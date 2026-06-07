import React, { useState, useEffect, useCallback } from 'react';
import './CharacterSheet.css';

const SAVED_KEY = 'dm-cockpit-dndbeyond-ids';
const ABILITY_NAMES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const ABILITY_FULL = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
const SAVE_SUBTYPES = ['strength-saving-throws', 'dexterity-saving-throws', 'constitution-saving-throws', 'intelligence-saving-throws', 'wisdom-saving-throws', 'charisma-saving-throws'];

const SKILLS = [
  ['acrobatics', 'Acrobatics', 1],
  ['animal-handling', 'Animal Handling', 4],
  ['arcana', 'Arcana', 3],
  ['athletics', 'Athletics', 0],
  ['deception', 'Deception', 5],
  ['history', 'History', 3],
  ['insight', 'Insight', 4],
  ['intimidation', 'Intimidation', 5],
  ['investigation', 'Investigation', 3],
  ['medicine', 'Medicine', 4],
  ['nature', 'Nature', 3],
  ['perception', 'Perception', 4],
  ['performance', 'Performance', 5],
  ['persuasion', 'Persuasion', 5],
  ['religion', 'Religion', 3],
  ['sleight-of-hand', 'Sleight of Hand', 1],
  ['stealth', 'Stealth', 1],
  ['survival', 'Survival', 4],
];

function modifier(score) { return Math.floor((score - 10) / 2); }
function fmtMod(n) { return n >= 0 ? `+${n}` : `${n}`; }

function extractIdFromInput(input) {
  const trimmed = input.trim();
  const match = trimmed.match(/characters\/(\d+)/) || trimmed.match(/^(\d+)$/);
  return match ? match[1] : null;
}

function allModifiers(data) {
  const groups = data.modifiers || {};
  return Object.values(groups).flat().filter(Boolean);
}

function deriveSheet(data) {
  const baseStats = data.stats || [];
  const bonusStats = data.bonusStats || [];
  const overrideStats = data.overrideStats || [];
  const mods = allModifiers(data);

  const abilities = ABILITY_NAMES.map((name, i) => {
    const id = i + 1;
    const override = overrideStats.find(s => s.id === id)?.value;
    const base = baseStats.find(s => s.id === id)?.value || 10;
    const bonus = bonusStats.find(s => s.id === id)?.value || 0;
    const score = override != null ? override : base + bonus;
    return { name, full: ABILITY_FULL[i], score, mod: modifier(score) };
  });

  const totalLevel = (data.classes || []).reduce((sum, c) => sum + (c.level || 0), 0);
  const proficiencyBonus = Math.ceil(totalLevel / 4) + 1;

  const isProficient = (subType) => mods.some(m => m.type === 'proficiency' && m.subType === subType);
  const hasExpertise = (subType) => mods.some(m => m.type === 'expertise' && m.subType === subType);

  const saves = abilities.map((a, i) => {
    const proficient = isProficient(SAVE_SUBTYPES[i]);
    return { name: a.name, mod: a.mod + (proficient ? proficiencyBonus : 0), proficient };
  });

  const skills = SKILLS.map(([subType, label, abilityIdx]) => {
    const proficient = isProficient(subType);
    const expertise = hasExpertise(subType);
    const bonus = expertise ? proficiencyBonus * 2 : (proficient ? proficiencyBonus : 0);
    return { label, ability: ABILITY_NAMES[abilityIdx], mod: abilities[abilityIdx].mod + bonus, proficient, expertise };
  });

  const passivePerception = 10 + skills.find(s => s.label === 'Perception').mod;

  const hp = (data.baseHitPoints || 0) + (data.bonusHitPoints || 0) - (data.removedHitPoints || 0);
  const tempHp = data.temporaryHitPoints || 0;

  const inventory = (data.inventory || []).map(item => ({
    name: item.definition?.name || 'Item',
    quantity: item.quantity || 1,
    equipped: !!item.equipped,
    type: item.definition?.type || null,
    armorClass: item.definition?.armorClass ?? null,
  }));

  // AC: base 10 + dex (best-effort; uses equipped armor base AC where available)
  const dexMod = abilities[1].mod;
  const equippedArmor = inventory.find(i => i.equipped && i.armorClass != null && i.type !== 'Shield');
  const equippedShield = inventory.find(i => i.equipped && /shield/i.test(i.name));
  let ac;
  if (equippedArmor) {
    const isHeavy = /plate|chain mail|splint|ring mail/i.test(equippedArmor.name);
    const isMedium = /half plate|breastplate|chain shirt|scale mail|hide armor/i.test(equippedArmor.name);
    const dexContribution = isHeavy ? 0 : isMedium ? Math.min(dexMod, 2) : dexMod;
    ac = equippedArmor.armorClass + dexContribution;
  } else {
    ac = 10 + dexMod;
  }
  if (equippedShield) ac += 2;

  const speed = data.race?.weightSpeeds?.normal?.walk || 30;
  const initiative = dexMod;

  const classes = (data.classes || []).map(c => ({
    name: c.definition?.name || 'Class',
    subclass: c.subclassDefinition?.name || null,
    level: c.level,
    hitDie: c.definition?.hitDice ? `d${c.definition.hitDice}` : null,
  }));

  const damageMods = (kind) => {
    const seen = new Set();
    mods.filter(m => m.type === kind && m.friendlySubtypeName).forEach(m => seen.add(m.friendlySubtypeName));
    return Array.from(seen);
  };
  const resistances = damageMods('resistance');
  const immunities = damageMods('immunity');
  const vulnerabilities = damageMods('vulnerability');

  const senses = mods
    .filter(m => m.type === 'sense' && m.friendlySubtypeName)
    .map(m => `${m.friendlySubtypeName}${m.value ? ` ${m.value} ft` : ''}`)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  return {
    name: data.name || 'Unnamed',
    avatarUrl: data.decorations?.avatarUrl || data.avatarUrl || null,
    race: data.race?.fullName || data.race?.baseRaceName || null,
    background: data.background?.definition?.name || data.background?.customBackground?.name || null,
    alignment: data.alignmentId || null,
    classes,
    totalLevel,
    proficiencyBonus,
    abilities,
    saves,
    skills,
    passivePerception,
    ac,
    speed,
    initiative,
    hp,
    tempHp,
    hitDice: classes.map(c => `${c.level}${c.hitDie || ''}`).join(' + '),
    resistances,
    immunities,
    vulnerabilities,
    senses,
  };
}

export default function CharacterSheet() {
  const [savedIds, setSavedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [activeId, setActiveId] = useState(savedIds[0]?.id || null);
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const persist = (ids) => {
    setSavedIds(ids);
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  };

  const load = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setSheet(null);
    const res = await window.electronAPI?.dndbeyond?.getCharacter(id);
    setLoading(false);
    if (!res?.success) {
      setError(res?.error || 'Failed to load character.');
      return;
    }
    setSheet(deriveSheet(res.data));
    setSavedIds(prev => {
      const existing = prev.find(p => p.id === id);
      const name = res.data.name || `Character ${id}`;
      const next = existing
        ? prev.map(p => (p.id === id ? { ...p, name } : p))
        : [...prev, { id, name }];
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (activeId) load(activeId);
  }, [activeId, load]);

  const onAdd = (e) => {
    e.preventDefault();
    const id = extractIdFromInput(input);
    if (!id) { setError('Paste a D&D Beyond character URL or ID.'); return; }
    setInput('');
    setActiveId(id);
  };

  const onRemove = (id) => {
    const next = savedIds.filter(p => p.id !== id);
    persist(next);
    if (activeId === id) {
      setActiveId(next[0]?.id || null);
      setSheet(null);
    }
  };

  return (
    <div className="charsheet-panel">
      <aside className="charsheet-sidebar">
        <form className="charsheet-add-form" onSubmit={onAdd}>
          <input
            className="charsheet-add-input"
            placeholder="Paste D&D Beyond character URL or ID…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="charsheet-add-btn">Add</button>
        </form>
        <div className="charsheet-list">
          {savedIds.map(p => (
            <div key={p.id} className={`charsheet-list-item ${p.id === activeId ? 'active' : ''}`}>
              <span className="charsheet-list-name" onClick={() => setActiveId(p.id)}>{p.name}</span>
              <button className="charsheet-list-remove" onClick={() => onRemove(p.id)} title="Remove">✕</button>
            </div>
          ))}
          {savedIds.length === 0 && <div className="charsheet-empty-hint">Add a character to get started.</div>}
        </div>
        {activeId && (
          <button className="charsheet-refresh-btn" onClick={() => load(activeId)} disabled={loading}>
            {loading ? 'Refreshing…' : '⟳ Refresh'}
          </button>
        )}
      </aside>

      <main className="charsheet-main">
        {loading && <div className="charsheet-status">Loading character…</div>}
        {error && (
          <div className="charsheet-status charsheet-error">
            {error}
            <div className="charsheet-error-hint">
              Note: this only works for characters whose visibility is set to <strong>Public</strong> on D&D Beyond
              (Character → Settings → Privacy &amp; Visibility).
            </div>
          </div>
        )}
        {!loading && !error && !sheet && (
          <div className="charsheet-status">Paste a D&D Beyond character link to load a sheet.</div>
        )}

        {sheet && (
          <div className="charsheet-content">
            {/* ── Header ───────────────────────────────── */}
            <header className="charsheet-header">
              {sheet.avatarUrl && <img className="charsheet-avatar" src={sheet.avatarUrl} alt={sheet.name} />}
              <div className="charsheet-header-text">
                <h2 className="charsheet-name">{sheet.name}</h2>
                <div className="charsheet-subline">
                  {sheet.race && <span>{sheet.race}</span>}
                  {sheet.classes.map((c, i) => (
                    <span key={i}>{c.name}{c.subclass ? ` (${c.subclass})` : ''} {c.level}</span>
                  ))}
                  {sheet.background && <span>{sheet.background}</span>}
                </div>
              </div>
            </header>

            <div className="charsheet-body">
              {/* ── Left column: ability scores ─────────── */}
              <div className="charsheet-col-left">
                <div className="charsheet-ability-grid">
                {sheet.abilities.map((a, i) => (
                  <div key={a.name} className="charsheet-ability-block">
                    <div className="charsheet-ability-top">
                      <span className="charsheet-ability-name">{a.name}</span>
                      <span className="charsheet-ability-score">{a.score}</span>
                      <span className="charsheet-ability-mod">({fmtMod(a.mod)})</span>
                    </div>
                    <div className="charsheet-ability-sub">
                      <div className={`charsheet-subrow ${sheet.saves[i].proficient ? 'proficient' : ''}`}>
                        <span className="charsheet-prof-dot" />
                        <span className="charsheet-subrow-label">Saving Throw</span>
                        <span className="charsheet-subrow-mod">{fmtMod(sheet.saves[i].mod)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                </div>

                <div className="charsheet-ability-block">
                  <div className="charsheet-ability-sub">
                    {sheet.skills.map(s => (
                      <div key={s.label} className={`charsheet-subrow ${s.proficient ? 'proficient' : ''} ${s.expertise ? 'expertise' : ''}`}>
                        <span className="charsheet-prof-dot" />
                        <span className="charsheet-subrow-label">{s.label} <span className="charsheet-subrow-ability">({s.ability})</span></span>
                        <span className="charsheet-subrow-mod">{fmtMod(s.mod)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Center column: combat stats + tabs ──── */}
              <div className="charsheet-col-main">
                <div className="charsheet-combat-row">
                  <div className="charsheet-combat-box">
                    <span className="charsheet-combat-label">Armor Class</span>
                    <span className="charsheet-combat-value">{sheet.ac}</span>
                  </div>
                  <div className="charsheet-combat-box">
                    <span className="charsheet-combat-label">Initiative</span>
                    <span className="charsheet-combat-value">{fmtMod(sheet.initiative)}</span>
                  </div>
                  <div className="charsheet-combat-box">
                    <span className="charsheet-combat-label">Speed</span>
                    <span className="charsheet-combat-value">{sheet.speed} ft</span>
                  </div>
                  <div className="charsheet-combat-box">
                    <span className="charsheet-combat-label">Proficiency</span>
                    <span className="charsheet-combat-value">{fmtMod(sheet.proficiencyBonus)}</span>
                  </div>
                  <div className="charsheet-combat-box">
                    <span className="charsheet-combat-label">Passive Perception</span>
                    <span className="charsheet-combat-value">{sheet.passivePerception}</span>
                  </div>
                </div>

                <div className="charsheet-hp-row">
                  <div className="charsheet-hp-box">
                    <span className="charsheet-combat-label">Hit Points</span>
                    <span className="charsheet-combat-value">{sheet.hp}{sheet.tempHp ? ` (+${sheet.tempHp} temp)` : ''}</span>
                  </div>
                  <div className="charsheet-hp-box">
                    <span className="charsheet-combat-label">Hit Dice</span>
                    <span className="charsheet-combat-value">{sheet.hitDice || '—'}</span>
                  </div>
                </div>

                {(sheet.senses.length > 0 || sheet.resistances.length > 0 || sheet.immunities.length > 0 || sheet.vulnerabilities.length > 0) && (
                  <div className="charsheet-traits-row">
                    {sheet.senses.length > 0 && (
                      <div className="charsheet-trait-box">
                        <span className="charsheet-combat-label">Senses</span>
                        <span className="charsheet-trait-value">{sheet.senses.join(', ')}</span>
                      </div>
                    )}
                    {sheet.resistances.length > 0 && (
                      <div className="charsheet-trait-box">
                        <span className="charsheet-combat-label">Resistances</span>
                        <span className="charsheet-trait-value">{sheet.resistances.join(', ')}</span>
                      </div>
                    )}
                    {sheet.immunities.length > 0 && (
                      <div className="charsheet-trait-box">
                        <span className="charsheet-combat-label">Immunities</span>
                        <span className="charsheet-trait-value">{sheet.immunities.join(', ')}</span>
                      </div>
                    )}
                    {sheet.vulnerabilities.length > 0 && (
                      <div className="charsheet-trait-box">
                        <span className="charsheet-combat-label">Vulnerabilities</span>
                        <span className="charsheet-trait-value">{sheet.vulnerabilities.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
