import React, { useState, useEffect, useCallback } from 'react';
import './Characters.css';

function uid() {
  return `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const karmaLabel = (k) => {
  if (k > 20)  return 'Virtuous';
  if (k > 10)  return 'Good';
  if (k > -10) return 'Neutral';
  if (k > -20) return 'Bad';
  return 'Darkness';
};
const karmaClass = (k) => {
  if (k > 10)  return 'karma-good';
  if (k < -10) return 'karma-evil';
  return 'karma-neutral';
};


function CharacterCard({ char, onAdjust, onRemove }) {
  const removable = !char.seeded;
  return (
    <div className="char-card">
      <div className="char-info">
        <span className="char-name">{char.name}</span>
        {(char.species || char.class) && (
          <span className="char-class">{char.species || char.class}</span>
        )}
      </div>
      <div className="char-karma-section">
        <button className="karma-btn minus" onClick={() => onAdjust(char.id, -1)}>−</button>
        <div className={`karma-score ${karmaClass(char.karma || 0)}`}>
          <span className="karma-number">{(char.karma || 0) > 0 ? `+${char.karma}` : char.karma}</span>
          <span className="karma-label">{karmaLabel(char.karma || 0)}</span>
        </div>
        <button className="karma-btn plus" onClick={() => onAdjust(char.id, 1)}>+</button>
      </div>
      {removable && (
        <button className="char-remove" onClick={() => onRemove(char.id)} title="Remove">✕</button>
      )}
    </div>
  );
}

export default function Characters() {
  const [characters, setCharacters] = useState([]);
  const [tab, setTab]               = useState('pc');
  const [newName, setNewName]       = useState('');
  const [newSpecies, setNewSpecies] = useState('');
  const [newClass, setNewClass]     = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    Promise.all([
      window.electronAPI.karma.load(),
      window.electronAPI.characters.loadSeed(),
    ]).then(([karmaData, seedData]) => {
      const loaded = karmaData.characters || [];
      if (!loaded.some(c => c.type === 'pc')) {
        const seedPCs = (seedData.characters || []).map(c => ({ karma: 0, ...c, seeded: true }));
        const seeded = [...seedPCs, ...loaded];
        setCharacters(seeded);
        window.electronAPI.karma.save({ characters: seeded });
      } else {
        setCharacters(loaded);
      }
    });
  }, []);

  const persist = useCallback(async (chars) => {
    setSaving(true);
    await window.electronAPI.karma.save({ characters: chars });
    setSaving(false);
  }, []);

  const adjustKarma = (id, delta) => {
    const next = characters.map(c => c.id === id ? { ...c, karma: (c.karma || 0) + delta } : c);
    setCharacters(next);
    persist(next);
  };

  const addCharacter = (type) => {
    const name = newName.trim();
    if (!name) return;
    const entry = { id: uid(), name, karma: 0, type };
    if (type === 'pc') {
      if (newClass.trim())   entry.class   = newClass.trim();
      if (newSpecies.trim()) entry.species = newSpecies.trim();
    } else {
      if (newSpecies.trim()) entry.species = newSpecies.trim();
    }
    const next = [...characters, entry];
    setCharacters(next);
    persist(next);
    setNewName(''); setNewSpecies(''); setNewClass('');
  };

  const removeCharacter = (id) => {
    const next = characters.filter(c => c.id !== id);
    setCharacters(next);
    persist(next);
  };

  const pcs  = characters.filter(c => c.type === 'pc');
  const npcs = characters.filter(c => c.type === 'npc');

  return (
    <div className="characters-panel">
      <div className="chars-header">
        <h2 className="chars-title">Characters</h2>
        {saving && <span className="chars-saving">saving…</span>}
      </div>

      <div className="chars-tabs">
        <button className={`chars-tab ${tab === 'pc'  ? 'active' : ''}`} onClick={() => setTab('pc')}>
          Player Characters <span className="chars-tab-count">{pcs.length}</span>
        </button>
        <button className={`chars-tab ${tab === 'npc' ? 'active' : ''}`} onClick={() => setTab('npc')}>
          NPCs <span className="chars-tab-count">{npcs.length}</span>
        </button>
      </div>

      <div className="chars-list">
        {tab === 'pc' && pcs.map(c => (
          <CharacterCard key={c.id} char={c} onAdjust={adjustKarma} onRemove={removeCharacter} />
        ))}

        {tab === 'npc' && (
          <>
            {npcs.length === 0 && <div className="chars-empty">No NPCs yet. Add one below.</div>}
            {npcs.map(c => (
              <CharacterCard key={c.id} char={c} onAdjust={adjustKarma} onRemove={removeCharacter} />
            ))}
          </>
        )}
      </div>

      {tab === 'pc' && (
        <div className="chars-add">
          <input className="chars-input" placeholder="PC name" value={newName}
            onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCharacter('pc')} />
          <input className="chars-input chars-input-class" placeholder="Class (optional)" value={newClass}
            onChange={e => setNewClass(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCharacter('pc')} />
          <input className="chars-input chars-input-class" placeholder="Species (optional)" value={newSpecies}
            onChange={e => setNewSpecies(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCharacter('pc')} />
          <button className="chars-add-btn" onClick={() => addCharacter('pc')} disabled={!newName.trim()}>Add PC</button>
        </div>
      )}

      {tab === 'npc' && (
        <div className="chars-add">
          <input className="chars-input" placeholder="NPC name" value={newName}
            onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCharacter('npc')} />
          <input className="chars-input chars-input-class" placeholder="Race / type (optional)" value={newSpecies}
            onChange={e => setNewSpecies(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCharacter('npc')} />
          <button className="chars-add-btn" onClick={() => addCharacter('npc')} disabled={!newName.trim()}>Add NPC</button>
        </div>
      )}
    </div>
  );
}
