import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Shop.css';
import Icon from '../components/Icons';
import {
  VENDORS, vendorById, priceOf, buybackOf, standingStock, rollGear,
  haggle, HAGGLE_OUTCOMES, MOODS, moodOf, MAGIC_MARKUP, shopUid,
} from './shopLogic';

const gp = (n) =>
  Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

const num = (v) => Number(v) || 0;

/* ── Vendor tile ─────────────────────────────────────────── */
function VendorTile({ vendor, state, onOpen }) {
  const mood = moodOf(state?.mood || 0);
  return (
    <button className="shop-tile" onClick={() => onOpen(vendor.id)}>
      <span className="shop-tile-glyph"><Icon name={vendor.glyph} size={18} /></span>
      <span className="shop-tile-name">{vendor.label}</span>
      <span className="shop-tile-blurb">{vendor.blurb}</span>
      <span className="shop-tile-foot">
        <span className={`shop-mood mood-${mood.label.toLowerCase()}`}>{mood.label}</span>
        <span className="shop-tile-stock">haggle DC {vendor.haggleDC}</span>
      </span>
    </button>
  );
}

/* ── One line of stock ───────────────────────────────────── */
function StockRow({ line, vendor, mood, onPatch, onRemove, onHaggle, onSell }) {
  const [bid, setBid] = useState('');
  const price = priceOf(line, vendor, mood);
  const out   = line.haggle ? HAGGLE_OUTCOMES[line.haggle.outcome] : null;
  const sold  = !line.unlimited && line.qty <= 0;

  const tryHaggle = () => {
    if (bid === '') return;
    onHaggle(line.id, Number(bid));
    setBid('');
  };

  return (
    <div className={`shop-row${sold ? ' sold-out' : ''}${line.magic ? ' magic' : ''}`}>
      <div className="shop-row-main">
        <input
          className="shop-row-name"
          value={line.name}
          onChange={e => onPatch(line.id, { name: e.target.value })}
        />
        {line.notes && <div className="shop-row-notes">{line.notes}</div>}
      </div>

      {/* Always rendered, blank for mundane stock, so every row keeps the same
          column count and the grid stays in line down the whole list. */}
      <span className={`shop-rarity rarity-${(line.rarity || 'common').toLowerCase().replace(/ /g, '-')}`}>
        {line.magic ? line.rarity : ''}
      </span>

      <div className="shop-row-qty">
        {line.unlimited ? (
          <span className="shop-row-inf" title="Always in stock">&#8734;</span>
        ) : (
          <input
            type="number"
            value={line.qty}
            onChange={e => onPatch(line.id, { qty: Math.max(0, Number(e.target.value) || 0) })}
          />
        )}
      </div>

      <div className="shop-row-price">
        <input
          type="number"
          className="shop-row-base"
          value={line.base}
          title="Sticker price before markup"
          onChange={e => onPatch(line.id, { base: Math.max(0, Number(e.target.value) || 0) })}
        />
        <span className="shop-row-arrow">&rarr;</span>
        <span className="shop-row-final">{gp(price)}<em>gp</em></span>
      </div>

      <div className="shop-row-haggle">
        {out ? (
          <span className={`shop-haggle-tag tone-${out.tone}`} title={line.haggle.line}>
            {out.label}
            {line.haggle.delta !== 0 &&
              ` ${line.haggle.delta < 0 ? '−' : '+'}${Math.round(Math.abs(line.haggle.delta) * 100)}%`}
          </span>
        ) : (
          <>
            <input
              type="number"
              placeholder="roll"
              value={bid}
              title={`Their check total vs DC ${vendor.haggleDC}`}
              onChange={e => setBid(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && tryHaggle()}
            />
            <button onClick={tryHaggle} disabled={bid === ''}>Haggle</button>
          </>
        )}
      </div>

      <button
        className="shop-row-buy"
        disabled={sold}
        onClick={() => onSell(line)}
        title="Record the sale"
      >
        Sell
      </button>
      <button className="shop-row-remove" onClick={() => onRemove(line.id)} title="Remove line">&#10005;</button>
    </div>
  );
}

/* ── Panel ───────────────────────────────────────────────── */
export default function Shop() {
  const [shops, setShops]   = useState({});   // vendorId → { mood, stock[] }
  const [openId, setOpenId] = useState(null);
  const [tier, setTier]     = useState(5);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft]   = useState({ name: '', base: '', qty: 1 });
  const [buy, setBuy]       = useState({ name: '', base: '' });

  const saveTimer = useRef(null);
  const isElectron = !!window.electronAPI;

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  useEffect(() => {
    if (!isElectron) { setLoaded(true); return; }
    window.electronAPI.shop.load()
      .then(d => {
        setShops(d?.shops || {});
        if (d?.tier) setTier(d.tier);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [isElectron]);

  const persist = useCallback((nextShops, nextTier) => {
    if (!isElectron) return;
    clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      await window.electronAPI.shop.save({ shops: nextShops, tier: nextTier });
      setSaving(false);
    }, 500);
  }, [isElectron]);

  // Every mutation funnels through here so the on-disk shape stays whole.
  const commit = useCallback((vendorId, patch) => {
    setShops(prev => {
      const cur  = prev[vendorId] || { mood: 0, stock: [] };
      const next = { ...prev, [vendorId]: { ...cur, ...patch } };
      persist(next, tier);
      return next;
    });
  }, [persist, tier]);

  const vendor = openId ? vendorById(openId) : null;
  const shop   = (openId && shops[openId]) || { mood: 0, stock: [] };
  const mood   = shop.mood || 0;

  /* — opening a vendor lays out their standing goods the first time — */
  const openVendor = (id) => {
    setOpenId(id);
    if (!shops[id]) commit(id, { mood: 0, stock: standingStock(vendorById(id)) });
  };

  const setTierAnd = (t) => { setTier(t); persist(shops, t); };

  /* — stock — */
  const patchLine = (lineId, patch) =>
    commit(openId, { stock: shop.stock.map(l => (l.id === lineId ? { ...l, ...patch } : l)) });

  const removeLine = (lineId) =>
    commit(openId, { stock: shop.stock.filter(l => l.id !== lineId) });

  const rollStock = () => {
    const taken = new Set(shop.stock.filter(l => l.magic).map(l => l.name));
    const fresh = rollGear(vendor, tier, taken);
    if (!fresh.length) return;
    commit(openId, { stock: [...shop.stock, ...fresh] });
  };

  const clearRolled = () =>
    commit(openId, { stock: shop.stock.filter(l => l.standing) });

  // The shopfront is a template, not a place. Reset hands you a clean one for
  // whichever blacksmith the party has wandered into this week.
  const resetFront = () =>
    commit(openId, { mood: 0, stock: standingStock(vendor) });

  const addCustom = () => {
    if (!draft.name.trim()) return;
    const qty = Math.max(0, num(draft.qty));
    commit(openId, {
      stock: [...shop.stock, {
        id: shopUid(),
        name: draft.name.trim(),
        base: num(draft.base),
        qty,
        unlimited: qty === 0,
        magic: false,
        standing: false,
        notes: '',
        haggle: null,
      }],
    });
    setDraft({ name: '', base: '', qty: 1 });
  };

  /* — haggling — */
  const doHaggle = (lineId, total) => {
    const res = haggle(total, vendor);
    commit(openId, {
      mood: Math.max(-2, Math.min(2, mood + res.mood)),
      stock: shop.stock.map(l => (l.id === lineId ? { ...l, haggle: { ...res, total } } : l)),
    });
  };

  /* — transactions — */
  const sellLine = (line) =>
    commit(openId, {
      stock: shop.stock.map(l =>
        (l.id === line.id && !l.unlimited ? { ...l, qty: Math.max(0, l.qty - 1) } : l)),
    });

  /* ── Vendor picker ── */
  if (!openId) {
    return (
      <div className="shop-panel">
        <div className="shop-header">
          <h2 className="shop-title">Shop</h2>
          <span className="shop-keeper">Pick a trader</span>
          {saving && <span className="shop-saving">saving…</span>}
        </div>
        {!loaded ? (
          <div className="shop-empty">Unbarring the shutters…</div>
        ) : (
          <div className="shop-tiles">
            {VENDORS.map(v => (
              <VendorTile key={v.id} vendor={v} state={shops[v.id]} onOpen={openVendor} />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── A vendor's shopfront ── */
  const standing = shop.stock.filter(l => l.standing);
  const rolled   = shop.stock.filter(l => !l.standing);
  const offer    = buy.base !== '' ? buybackOf(num(buy.base), vendor, mood) : null;

  return (
    <div className="shop-panel">
      <div className="shop-header">
        <button className="shop-back" onClick={() => setOpenId(null)}>&larr; All traders</button>
        <h2 className="shop-title">{vendor.label}</h2>
        <span className="shop-keeper">{vendor.keeper}</span>

        <div className="shop-mood-picker" title="How they feel about this party">
          {MOODS.map(m => (
            <button
              key={m.key}
              className={`shop-mood-opt${m.key === mood ? ' on' : ''}`}
              onClick={() => commit(openId, { mood: m.key })}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button className="shop-reset" onClick={resetFront} title="Clear rolled stock and haggles, ready for the next shop">
          Reset shopfront
        </button>
        {saving && <span className="shop-saving">saving…</span>}
      </div>

      <div className="shop-body">
        {/* ── Standing stock ── */}
        <section className="shop-section">
          <div className="shop-section-head">
            <h3>Standing stock</h3>
            <span className="shop-section-sub">
              always available · haggle DC {vendor.haggleDC} · {moodOf(mood).label} prices
              {vendor.greed !== 1 &&
                ` · ${vendor.greed > 1 ? '+' : ''}${Math.round((vendor.greed - 1) * 100)}% greed`}
            </span>
          </div>

          <div className="shop-rows">
            {standing.map(l => (
              <StockRow
                key={l.id} line={l} vendor={vendor} mood={mood}
                onPatch={patchLine} onRemove={removeLine}
                onHaggle={doHaggle} onSell={sellLine}
              />
            ))}
          </div>

          <div className="shop-add">
            <input
              placeholder="Add a line — whatever they happen to have"
              value={draft.name}
              onChange={e => setDraft({ ...draft, name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
            />
            <input
              type="number" placeholder="gp" className="shop-add-price"
              value={draft.base}
              onChange={e => setDraft({ ...draft, base: e.target.value })}
            />
            <input
              type="number" placeholder="qty" className="shop-add-qty"
              value={draft.qty} title="0 for unlimited"
              onChange={e => setDraft({ ...draft, qty: e.target.value })}
            />
            <button onClick={addCustom}>Add</button>
          </div>
        </section>

        {/* ── Rolled gear ── */}
        <section className="shop-section">
          <div className="shop-section-head">
            <h3>What they have in the back</h3>
            <span className="shop-section-sub">
              magic at &times;{MAGIC_MARKUP} · {vendor.categories.join(', ')}
            </span>
            <div className="shop-roller">
              <label>Tier</label>
              <input
                type="range" min="1" max="20" value={tier}
                onChange={e => setTierAnd(Number(e.target.value))}
              />
              <input
                type="number" min="1" max="20" className="shop-tier-num" value={tier}
                onChange={e => setTierAnd(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              />
              <button className="shop-roll" onClick={rollStock}>Roll stock</button>
              {rolled.length > 0 && <button className="shop-mini" onClick={clearRolled}>Clear</button>}
            </div>
          </div>

          {rolled.length === 0 ? (
            <div className="shop-empty small">
              Nothing rolled yet. Set a tier and see what they have been holding back.
            </div>
          ) : (
            <div className="shop-rows">
              {rolled.map(l => (
                <StockRow
                  key={l.id} line={l} vendor={vendor} mood={mood}
                  onPatch={patchLine} onRemove={removeLine}
                  onHaggle={doHaggle} onSell={sellLine}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Buying off the party ── */}
        <section className="shop-section">
          <div className="shop-section-head">
            <h3>Selling to them</h3>
            <span className="shop-section-sub">
              pays {Math.round(vendor.buyback * 100)}% of sticker, shifted by mood
            </span>
          </div>
          <div className="shop-add">
            <input
              placeholder="What the party is offloading"
              value={buy.name}
              onChange={e => setBuy({ ...buy, name: e.target.value })}
            />
            <input
              type="number" placeholder="worth" className="shop-add-price"
              value={buy.base}
              onChange={e => setBuy({ ...buy, base: e.target.value })}
            />
            <span className="shop-offer">
              {offer === null ? 'enter what it is worth' : `they offer ${gp(offer)} gp`}
            </span>
          </div>
        </section>

      </div>
    </div>
  );
}
