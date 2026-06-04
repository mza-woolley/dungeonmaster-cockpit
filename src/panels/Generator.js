import React, { useState } from 'react';

import names from '../data/random-tables/people/names.json';
import npc from '../data/random-tables/people/npc.json';
import weather from '../data/random-tables/environment/weather.json';
import wildMagic from '../data/random-tables/environment/wild-magic-surge.json';
import travelEvent from '../data/random-tables/encounters/travel-event.json';
import rumourRaw from '../data/random-tables/world-and-lore/rumour-gossip.json';
import factionRaw from '../data/random-tables/world-and-lore/faction-activity.json';
import npcEncounterRaw from '../data/random-tables/world-and-lore/random-npc-encounter.json';
import cursedItem from '../data/random-tables/loot/cursed-item.json';
import magicItem from '../data/random-tables/loot/magic-item.json';

const rumour = rumourRaw.entries;
const faction = factionRaw.entries;
const npcEncounter = npcEncounterRaw.entries;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollNPC() {
  const n = pick(names);
  const { quirk, secret } = pick(npc);
  return [n.name, quirk, secret];
}

function rollWeather() {
  const w = pick(weather);
  return Object.values(w).filter(Boolean);
}

function rollWildMagic() {
  const w = pick(wildMagic);
  return [w.effect];
}

function rollTravelEvent() {
  const t = pick(travelEvent);
  return [t.event];
}

function rollRumour() {
  const r = pick(rumour);
  return [r.rumour];
}

function rollFaction() {
  const f = pick(faction);
  return [f.activity];
}

function rollNPCEncounter() {
  const e = pick(npcEncounter);
  return Object.values(e).filter(v => typeof v === 'string');
}

function rollCursedItem() {
  const c = pick(cursedItem);
  return [c.name, c.curse];
}

function rollMagicItem() {
  const m = pick(magicItem);
  return [m.name, m.category && m.rarity ? `${m.category} · ${m.rarity}` : null, m.description].filter(Boolean);
}

const TABLES = [
  { id: 'npc',          label: 'NPC',            roll: rollNPC },
  { id: 'names',        label: 'Name',           roll: () => { const n = pick(names); return [`${n.name} — ${n.race}, ${n.gender}`]; } },
  { id: 'weather',      label: 'Weather',        roll: rollWeather },
  { id: 'wild-magic',   label: 'Wild Magic',     roll: rollWildMagic },
  { id: 'travel',       label: 'Travel Event',   roll: rollTravelEvent },
  { id: 'rumour',       label: 'Rumour',         roll: rollRumour },
  { id: 'faction',      label: 'Faction Intel',  roll: rollFaction },
  { id: 'encounter',    label: 'NPC Encounter',  roll: rollNPCEncounter },
  { id: 'cursed',       label: 'Cursed Item',    roll: rollCursedItem },
  { id: 'magic-item',   label: 'Magic Item',     roll: rollMagicItem },
];

export default function Generator() {
  const [activeTable, setActiveTable] = useState(TABLES[0]);
  const [lines, setLines] = useState(() => TABLES[0].roll());
  const [flash, setFlash] = useState(false);

  function selectTable(table) {
    setActiveTable(table);
    const result = table.roll();
    setLines(result);
    triggerFlash();
  }

  function reroll() {
    setLines(activeTable.roll());
    triggerFlash();
  }

  function triggerFlash() {
    setFlash(false);
    requestAnimationFrame(() => setFlash(true));
  }

  return (
    <div className="generator-panel">
      <div className="generator-pills">
        {TABLES.map(t => (
          <button
            key={t.id}
            className={`generator-pill ${t.id === activeTable.id ? 'active' : ''}`}
            onClick={() => selectTable(t)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={`generator-result ${flash ? 'flash' : ''}`} onAnimationEnd={() => setFlash(false)}>
        <div className="generator-result-inner">
          {lines.map((line, i) => (
            <p key={i} className="generator-line">{line}</p>
          ))}
        </div>
        <button className="generator-reroll" onClick={reroll}>Re-roll</button>
      </div>
    </div>
  );
}
