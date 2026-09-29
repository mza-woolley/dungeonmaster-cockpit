import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Loot.css';
import Icon from '../components/Icons';
import { rollHoard, TYPES, TIERS, tierSummary } from './lootRoll';

const DISCARD = '__discard__';

const gp = (n) =>
  Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

const num = (v) => Number(v) || 0;
const uid = () => `loot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact'];

/* ── Item row ────────────────────────────────────────────── */
function ItemRow({ item, party, onPatch, onRemove }) {
  return (
    <div className={`loot-item${item.claimed ? ' claimed' : ''}`}>
      <button
        className="loot-item-check"
        onClick={() => onPatch(item.id, { claimed: !item.claimed })}
        title={item.claimed ? 'Mark unclaimed' : 'Mark handed out'}
      >
        {item.claimed ? '✓' : ''}
      </button>

      <div className="loot-item-main">
        <input
          className="loot-item-name"
          value={item.name}
          placeholder="Item"
          onChange={e => onPatch(item.id, { name: e.target.value })}
        />
        <input
          className="loot-item-notes"
          value={item.notes || ''}
          placeholder="notes — attunement, provenance, curse…"
          onChange={e => onPatch(item.id, { notes: e.target.value })}
        />
      </div>

      <select
        className={`loot-item-rarity rarity-${(item.rarity || 'Common').toLowerCase().replace(/ /g, '-')}`}
        value={item.rarity || 'Common'}
        onChange={e => onPatch(item.id, { rarity: e.target.value })}
      >
        {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
      </select>

      <div className="loot-item-qty">
        <span className="loot-item-qty-x">×</span>
        <input
          type="number"
          value={item.qty}
          onChange={e => onPatch(item.id, { qty: Math.max(1, Number(e.target.value) || 1) })}
        />
      </div>

      <div className="loot-item-value">
        <input
          type="number"
          value={item.value ?? ''}
          placeholder="0"
          onChange={e => onPatch(item.id, { value: e.target.value === '' ? '' : Number(e.target.value) })}
        />
        <span className="loot-item-value-unit">gp</span>
      </div>

      <select
        className="loot-item-owner"
        value={item.owner || ''}
        onChange={e => onPatch(item.id, { owner: e.target.value })}
      >
        <option value="">Unassigned</option>
        {party.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        <option value="Party">Party stash</option>
      </select>

      <button className="loot-item-remove" onClick={() => onRemove(item.id)} title="Remove">✕</button>
    </div>
  );
}

/* ── Per-PC purse row ────────────────────────────────────── */
function PurseRow({ pc, balance, included, onToggle, onSet }) {
  return (
    <div className={`loot-pc${included ? '' : ' excluded'}`}>
      <button
        className="loot-pc-include"
        onClick={() => onToggle(pc.id)}
        title={included ? 'Leave out of splits' : 'Include in splits'}
      >
        {included ? '✓' : ''}
      </button>

      <span className="loot-pc-name">{pc.name}</span>

      <div className="loot-pc-balance">
        <input
          type="number"
          value={balance}
          onChange={e => onSet(pc.id, e.target.value)}
          onFocus={e => e.target.select()}
        />
        <span className="loot-pc-unit">gp</span>
      </div>
    </div>
  );
}

/* ── Panel ───────────────────────────────────────────────── */
export default function Loot() {
  const [purses, setPurses]     = useState({});   // pcId → gp held
  const [excluded, setExcluded] = useState([]);   // pcIds left out of splits
  const [items, setItems]       = useState([]);
  const [ledger, setLedger]     = useState([]);
  const [party, setParty]       = useState([]);
  const [saving, setSaving]     = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [filter, setFilter]     = useState('open');
  const [variance, setVariance] = useState({ min: -15, max: 15 });
  const [draft, setDraft]       = useState({ name: '', qty: 1, value: '', rarity: 'Common' });
  const [roller, setRoller]     = useState({ tier: 3, typeId: 'humanoid', count: 1 });
  const [pending, setPending]   = useState(null); // the rolled haul, awaiting allocation

  const saveTimer = useRef(null);
  const isElectron = !!window.electronAPI;

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  useEffect(() => {
    if (!isElectron) { setLoaded(true); return; }
    Promise.all([
      window.electronAPI.loot.load(),
      window.electronAPI.karma.load(),
    ]).then(([lootData, karmaData]) => {
      const d = lootData || {};
      setPurses(d.purses || {});
      if (d.variance) {
        const v = { min: -15, max: 15, ...d.variance };
        setVariance({ min: -Math.abs(v.min), max: Math.abs(v.max) });
      }
      setExcluded(d.excluded || []);
      setItems(d.items || []);
      setLedger(d.ledger || []);
      if (d.roller) setRoller({ tier: 3, typeId: 'humanoid', count: 1, ...d.roller });
      setPending(d.pending || null);
      setParty((karmaData?.characters || []).filter(c => c.type === 'pc'));
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [isElectron]);

  const persist = useCallback((next) => {
    if (!isElectron) return;
    clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      await window.electronAPI.loot.save(next);
      setSaving(false);
    }, 500);
  }, [isElectron]);

  // Every mutation goes through here so the on-disk shape stays whole.
  const commit = useCallback((patch) => {
    const next = {
      purses:   patch.purses   ?? purses,
      excluded: patch.excluded ?? excluded,
      items:    patch.items    ?? items,
      ledger:   patch.ledger   ?? ledger,
      roller:   patch.roller   ?? roller,
      variance: patch.variance ?? variance,
      pending:  patch.pending !== undefined ? patch.pending : pending,
    };
    if (patch.purses)   setPurses(next.purses);
    if (patch.excluded) setExcluded(next.excluded);
    if (patch.items)    setItems(next.items);
    if (patch.ledger)   setLedger(next.ledger);
    if (patch.roller)   setRoller(next.roller);
    if (patch.variance) setVariance(next.variance);
    if (patch.pending !== undefined) setPending(next.pending);
    persist(next);
  }, [purses, excluded, items, ledger, roller, variance, pending, persist]);

  const log = (entry) => [{ id: uid(), at: new Date().toISOString(), ...entry }, ...ledger].slice(0, 14);

  /* — per-PC purses — */
  const heldBy = (id) => num(purses[id]);

  const setBalance = (id, raw) =>
    commit({ purses: { ...purses, [id]: Math.max(0, Math.round(Number(raw) || 0)) } });

  const toggleInclude = (id) =>
    commit({ excluded: excluded.includes(id) ? excluded.filter(x => x !== id) : [...excluded, id] });

  const included = party.filter(p => !excluded.includes(p.id));

  /* — the hoard roller — */
  const setRollerField = (field, value) => commit({ roller: { ...roller, [field]: value } });

  const roll = () => {
    const hoard = rollHoard(roller);
    commit({
      pending: {
        ...hoard,
        items: hoard.items.map(i => ({ ...i, id: uid(), owner: '' })),
        alloc: {},                       // pcId → gp earmarked from this haul
      },
    });
  };

  const discardRoll = () => commit({ pending: null });

  const setAlloc = (pcId, raw) => {
    const amount = Math.max(0, Math.round(Number(raw) || 0));
    commit({ pending: { ...pending, alloc: { ...pending.alloc, [pcId]: amount } } });
  };

  // Hand out every last gp: floor everyone's share, then give the leftovers to
  // whoever was rounded down hardest. Totals always land exactly on the haul.
  const allocateExact = (weights) => {
    const total = weights.reduce((s, w) => s + w.weight, 0);
    if (total <= 0) return {};
    const raw    = weights.map(w => ({ id: w.id, exact: (pending.gold * w.weight) / total }));
    const alloc  = {};
    let assigned = 0;
    raw.forEach(r => { alloc[r.id] = Math.floor(r.exact); assigned += alloc[r.id]; });
    raw.sort((a, b) => (b.exact % 1) - (a.exact % 1));
    for (let i = 0; assigned < pending.gold; i++, assigned++) alloc[raw[i % raw.length].id] += 1;
    return alloc;
  };

  const splitHaul = () => {
    if (!included.length) return;
    commit({ pending: { ...pending, alloc: allocateExact(included.map(p => ({ id: p.id, weight: 1 }))) } });
  };

  const splitRandom = () => {
    if (!included.length) return;
    const lo = Math.min(variance.min, variance.max) / 100;
    const hi = Math.max(variance.min, variance.max) / 100;

    // Each share is the even cut nudged by a roll inside the band. The shares still
    // have to add up to the haul, so the nudges must cancel out: roll one per PC,
    // centre them on zero, then scale back until every one sits inside the band
    // again. Without the centring step, normalising afterwards would quietly push
    // shares past the limits you set.
    let dev = included.map(() => lo + Math.random() * (hi - lo));
    const mean = dev.reduce((s, d) => s + d, 0) / dev.length;
    dev = dev.map(d => d - mean);

    let scale = 1;
    dev.forEach(d => {
      if (d > 0) scale = hi > 0 ? Math.min(scale, hi / d) : 0;
      if (d < 0) scale = lo < 0 ? Math.min(scale, lo / d) : 0;
    });
    dev = dev.map(d => d * scale);

    const weights = included.map((p, i) => ({ id: p.id, weight: Math.max(0.01, 1 + dev[i]) }));
    commit({ pending: { ...pending, alloc: allocateExact(weights) } });
  };

  // The sign is fixed by which box you're in — type the size of the swing, not its direction.
  const setVarianceField = (field, raw) => {
    const cap = field === 'min' ? 95 : 500;
    const mag = Math.max(0, Math.min(cap, Math.round(Math.abs(Number(raw) || 0))));
    commit({ variance: { ...variance, [field]: field === 'min' ? -mag : mag } });
  };

  const clearAlloc = () => commit({ pending: { ...pending, alloc: {} } });

  const setHaulOwner = (itemId, owner) =>
    commit({ pending: { ...pending, items: pending.items.map(i => i.id === itemId ? { ...i, owner } : i) } });

  const allocTotal = pending
    ? Object.values(pending.alloc || {}).reduce((s, v) => s + num(v), 0)
    : 0;
  const allocLeftover = pending ? pending.gold - allocTotal : 0;

  const commitHaul = () => {
    if (!pending) return;
    // Over-allocation can't mint gold — trim to what the haul actually holds.
    const nextPurses = { ...purses };
    let spent = 0;
    party.forEach(p => {
      const want = num(pending.alloc?.[p.id]);
      const share = Math.max(0, Math.min(want, pending.gold - spent));
      if (share > 0) { nextPurses[p.id] = heldBy(p.id) + share; spent += share; }
    });

    const kept = pending.items
      .filter(i => i.owner !== DISCARD)
      .map(i => ({
        id: i.id,
        name: i.name,
        qty: i.qty,
        value: i.value,
        rarity: i.rarity,
        notes: i.notes || '',
        owner: i.owner || '',
        // Handing it to a named PC settles it; the party stash stays an open question.
        claimed: !!i.owner && i.owner !== 'Party',
      }));

    commit({
      purses: nextPurses,
      items: [...kept, ...items],
      ledger: log({
        kind: 'roll',
        tier: pending.tier,
        tierLabel: pending.tierLabel,
        who: pending.typeLabel,
        ways: pending.count,
        luck: pending.luck,
        amount: spent,
        drops: kept.length,
      }),
      pending: null,
    });
  };

  /* — items — */
  const addItem = () => {
    const name = draft.name.trim();
    if (!name) return;
    commit({
      items: [{
        id: uid(),
        name,
        qty: Math.max(1, Number(draft.qty) || 1),
        value: draft.value === '' ? '' : Number(draft.value),
        rarity: draft.rarity,
        notes: '',
        owner: '',
        claimed: false,
      }, ...items],
    });
    setDraft({ name: '', qty: 1, value: '', rarity: 'Common' });
  };

  const patchItem  = (id, patch) => commit({ items: items.map(i => i.id === id ? { ...i, ...patch } : i) });
  const removeItem = (id)        => commit({ items: items.filter(i => i.id !== id) });
  const clearClaimed = () => {
    if (!items.some(i => i.claimed)) return;
    commit({ items: items.filter(i => !i.claimed) });
  };

  const openItems  = items.filter(i => !i.claimed);
  const shownItems = filter === 'open' ? openItems : filter === 'done' ? items.filter(i => i.claimed) : items;
  const itemsGp    = items.reduce((s, i) => s + num(i.value) * (num(i.qty) || 1), 0);
  const heldTotal  = party.reduce((s, p) => s + heldBy(p.id), 0);

  const ledgerText = (e) =>
    e.kind === 'roll'   ? `T${e.tier} ${e.tierLabel} · ${e.who} ×${e.ways} · luck ${e.luck} · ${gp(e.amount)} gp, ${e.drops} drops`
    : e.kind === 'adjust' ? `${e.who}  ${e.amount > 0 ? '+' : '−'}${gp(Math.abs(e.amount))} gp`
    : e.kind === 'split'  ? `Split ${gp(e.amount)} gp × ${e.ways}`
    : e.kind === 'give'   ? `→ ${e.who}  ${gp(e.amount)} gp`
    : e.kind === 'take'   ? `← ${e.who}  ${gp(e.amount)} gp`
    : `${e.share || ''} × ${e.ways || ''}`;   // legacy coin-split entries

  return (
    <div className="loot-panel">
      <div className="loot-header">
        <h2 className="loot-title">Loot</h2>
        <div className="loot-hoard">
          <span className="loot-hoard-icon"><Icon name="coin" size={14} /></span>
          <span className="loot-hoard-label">Party gold</span>
          <span className="loot-hoard-val">{gp(heldTotal)}</span>
          <span className="loot-hoard-unit">gp</span>
        </div>
        {saving && <span className="loot-saving">saving…</span>}
      </div>

      {!loaded ? (
        <div className="loot-empty">Opening the strongbox…</div>
      ) : (
      <div className="loot-body">
        {/* ── Purses ── */}
        <section className="loot-section loot-purse">
          <div className="loot-section-head">
            <h3>Purses</h3>
            <span className="loot-section-sub">{included.length} of {party.length} in splits</span>
          </div>

          <div className="loot-step">
            <span className="loot-step-label">Type a balance to set it</span>
            <span className="loot-pcs-total">{gp(heldTotal)} gp held</span>
          </div>

          <div className="loot-pcs">
            {party.length === 0 ? (
              <div className="loot-empty small">No PCs yet — add them on the Characters tab.</div>
            ) : party.map(p => (
              <PurseRow
                key={p.id}
                pc={p}
                balance={heldBy(p.id)}
                included={!excluded.includes(p.id)}
                onToggle={toggleInclude}
                onSet={setBalance}
              />
            ))}
          </div>

          {ledger.length > 0 && (
            <div className="loot-ledger">
              <div className="loot-ledger-head">Recent movements</div>
              {ledger.map(e => (
                <div key={e.id} className={`loot-ledger-row kind-${e.kind || 'split'}`}>
                  <span className="loot-ledger-date">
                    {new Date(e.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="loot-ledger-detail">{ledgerText(e)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Roller + pile ── */}
        <section className="loot-section loot-items-section">
          <div className="loot-roller">
            <div className="loot-roller-row">
              <div className="loot-tier">
                <div className="loot-tier-head">
                  <span className="loot-tier-caption">Tier</span>
                  <span className="loot-tier-num">{roller.tier}</span>
                  <span className="loot-tier-name">{TIERS[roller.tier - 1].label}</span>
                </div>
                <input
                  className="loot-tier-slider"
                  type="range"
                  min="1"
                  max="20"
                  value={roller.tier}
                  onChange={e => setRollerField('tier', Number(e.target.value))}
                />
              </div>

              <select
                className="loot-type-select"
                value={roller.typeId}
                onChange={e => setRollerField('typeId', e.target.value)}
              >
                {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>

              <div className="loot-count">
                <button onClick={() => setRollerField('count', Math.max(1, roller.count - 1))}>−</button>
                <span className="loot-count-n">×{roller.count}</span>
                <button onClick={() => setRollerField('count', Math.min(99, roller.count + 1))}>+</button>
              </div>

              <button className="loot-roll-btn" onClick={roll}>Roll</button>

              <div className={`loot-luck${pending ? ` luck-${pending.luckLabel.toLowerCase()}` : ''}`}>
                <span className="loot-luck-caption">Luck</span>
                <span className="loot-luck-val">{pending ? pending.luck : '—'}</span>
                <span className="loot-luck-name">{pending ? pending.luckLabel : ''}</span>
              </div>
            </div>
            <div className="loot-tier-band">{tierSummary(roller.tier)}</div>
          </div>

          {pending && (
            <div className="loot-tray">
              <div className="loot-tray-head">
                <h3>The Haul</h3>
                <span className="loot-tray-meta">
                  T{pending.tier} {pending.tierLabel} · {pending.typeLabel} ×{pending.count} · luck {pending.luck}
                </span>
                <button className="loot-tray-btn" onClick={roll}>Re-roll</button>
                <button className="loot-tray-btn danger" onClick={discardRoll}>Discard</button>
                <button className="loot-tray-btn commit" onClick={commitHaul}>Commit</button>
              </div>

              <div className="loot-tray-gold">
                <span className="loot-tray-gold-val">{gp(pending.gold)}</span>
                <span className="loot-tray-gold-unit">gp</span>
                <button className="loot-ghost-btn tight" onClick={splitHaul}>Split evenly</button>
                <button className="loot-ghost-btn tight accent" onClick={splitRandom}>Split random</button>
                <div className="loot-variance" title="How far each share may stray from an even cut">
                  <span className="loot-variance-sign down">−</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={String(Math.abs(variance.min))}
                    onChange={e => setVarianceField('min', e.target.value.replace(/\D/g, ''))}
                    onFocus={e => e.target.select()}
                  />
                  <span className="loot-variance-sign up">+</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={String(Math.abs(variance.max))}
                    onChange={e => setVarianceField('max', e.target.value.replace(/\D/g, ''))}
                    onFocus={e => e.target.select()}
                  />
                  <span className="loot-variance-unit">%</span>
                </div>
                <button className="loot-ghost-btn tight" onClick={clearAlloc}>Clear</button>
                <span className={`loot-tray-left${allocLeftover !== 0 ? ' over' : ''}`}>
                  {allocLeftover < 0
                    ? `${gp(-allocLeftover)} gp over — will be trimmed`
                    : allocLeftover > 0
                      ? `${gp(allocLeftover)} gp unallocated — left behind`
                      : 'all allocated'}
                </span>
              </div>

              {party.length > 0 && (
                <div className="loot-tray-alloc">
                  {party.map(p => {
                    const amount = num(pending.alloc?.[p.id]);
                    const even   = included.length ? pending.gold / included.length : 0;
                    const delta  = even > 0 && amount > 0 ? Math.round(((amount - even) / even) * 100) : 0;
                    return (
                      <label key={p.id} className="loot-alloc">
                        <span className="loot-alloc-name">{p.name}</span>
                        <input
                          type="number"
                          value={pending.alloc?.[p.id] ?? 0}
                          onChange={e => setAlloc(p.id, e.target.value)}
                          onFocus={e => e.target.select()}
                        />
                        <span className={`loot-alloc-delta${delta > 0 ? ' up' : delta < 0 ? ' down' : ''}`}>
                          {delta === 0 ? '' : `${delta > 0 ? '+' : ''}${delta}%`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="loot-tray-items">
                {pending.items.length === 0 ? (
                  <div className="loot-empty small">No drops — just the coin.</div>
                ) : pending.items.map(i => (
                  <div key={i.id} className={`loot-haul-item${i.owner === DISCARD ? ' dropped' : ''}`}>
                    <span className={`loot-src src-${i.source}`}>{i.source}</span>
                    <div className="loot-haul-main">
                      <span className={`loot-haul-name rarity-${(i.rarity || 'Common').toLowerCase().replace(/ /g, '-')}`}>
                        {i.name}{i.qty > 1 && <span className="loot-haul-qty"> ×{i.qty}</span>}
                      </span>
                      {i.notes && <span className="loot-haul-notes">{i.notes}</span>}
                    </div>
                    {i.value !== '' && <span className="loot-haul-value">{gp(num(i.value) * num(i.qty))} gp</span>}
                    <select value={i.owner} onChange={e => setHaulOwner(i.id, e.target.value)}>
                      <option value="">Unassigned</option>
                      {party.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      <option value="Party">Party stash</option>
                      <option value={DISCARD}>Leave it</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="loot-section-head">
            <h3>Loot Pile</h3>
            <span className="loot-section-sub">
              {openItems.length} open · {gp(itemsGp)} gp catalogued
            </span>
            <div className="loot-filters">
              {[['open', 'Open'], ['done', 'Handed out'], ['all', 'All']].map(([k, lbl]) => (
                <button
                  key={k}
                  className={`loot-filter${filter === k ? ' active' : ''}`}
                  onClick={() => setFilter(k)}
                >{lbl}</button>
              ))}
            </div>
            <button className="loot-ghost-btn" onClick={clearClaimed}>Clear handed out</button>
          </div>

          <div className="loot-add">
            <input
              className="loot-add-name"
              value={draft.name}
              placeholder="Add loot — Flame Tongue, ruby the size of a fist…"
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
            />
            <select
              className="loot-add-rarity"
              value={draft.rarity}
              onChange={e => setDraft(d => ({ ...d, rarity: e.target.value }))}
            >
              {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input
              className="loot-add-qty"
              type="number"
              value={draft.qty}
              onChange={e => setDraft(d => ({ ...d, qty: e.target.value }))}
              title="Quantity"
            />
            <input
              className="loot-add-value"
              type="number"
              value={draft.value}
              placeholder="gp"
              onChange={e => setDraft(d => ({ ...d, value: e.target.value }))}
              title="Value each, in gp"
            />
            <button className="loot-add-btn" onClick={addItem} disabled={!draft.name.trim()}>Add</button>
          </div>

          <div className="loot-items">
            {shownItems.length === 0 ? (
              <div className="loot-empty">
                {filter === 'done' ? 'Nothing handed out yet.' : 'The pile is empty. Generous of you.'}
              </div>
            ) : shownItems.map(i => (
              <ItemRow key={i.id} item={i} party={party} onPatch={patchItem} onRemove={removeItem} />
            ))}
          </div>
        </section>
      </div>
      )}
    </div>
  );
}
