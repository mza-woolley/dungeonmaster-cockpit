import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Characters.css';

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
  const [saving, setSaving]         = useState(false);
  const saveTimer = useRef(null);
  const isElectron = !!window.electronAPI;

  useEffect(() => {
    return () => clearTimeout(saveTimer.current);
  }, []);

  useEffect(() => {
    if (!isElectron) return;
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
  }, [isElectron]);

  const persist = useCallback((chars) => {
    clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      await window.electronAPI.karma.save({ characters: chars });
      setSaving(false);
    }, 500);
  }, []);

  const adjustKarma = (id, delta) => {
    const next = characters.map(c => c.id === id ? { ...c, karma: (c.karma || 0) + delta } : c);
    setCharacters(next);
    persist(next);
  };

  const removeCharacter = (id) => {
    const next = characters.filter(c => c.id !== id);
    setCharacters(next);
    persist(next);
  };

  const pcs  = characters.filter(c => c.type === 'pc');

  return (
    <div className="characters-panel">
      <div className="chars-header">
        <h2 className="chars-title">Characters</h2>
        {saving && <span className="chars-saving">saving…</span>}
      </div>

      <div className="chars-list">
        {pcs.map(c => (
          <CharacterCard key={c.id} char={c} onAdjust={adjustKarma} onRemove={removeCharacter} />
        ))}
      </div>
    </div>
  );
}
