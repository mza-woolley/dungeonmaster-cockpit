import React, { useState, useEffect, useCallback, useRef } from 'react';
import './TVDisplay.css';

const FOLDER_KEY = 'dm-cockpit-tv-folder';
const FILES_KEY  = 'dm-cockpit-tv-files';
const FAVS_KEY   = 'dm-cockpit-tv-favs';

const GRID_SIZES   = ['tiny', 'small', 'medium', 'large'];
const GRID_PX      = { tiny: 20, small: 40, medium: 60, large: 80 };
const PIN_COLORS   = { pc: '#4a8fd4', npc: '#c9a84c', monster: '#c94a4a' };
const FOG_OPACITY  = 0.65; // DM-side semi-transparency

function initials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Lazy thumbnail tile ───────────────────────────────────
function LazyTile({ file, active, thumb, faved, onPush, onFav, onVisible }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { onVisible(file.path); obs.disconnect(); }
    }, { rootMargin: '100px' });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [file.path, onVisible]);

  return (
    <div ref={ref} className={`tv-tile ${active ? 'active' : ''}`} onClick={() => onPush(file)}>
      <div className="tv-tile-thumb">
        {thumb && thumb !== 'loading'
          ? <img src={thumb} alt={file.name} />
          : <div className="tv-tile-placeholder">⏳</div>}
        {active && <div className="tv-tile-active-badge">On TV</div>}
      </div>
      <div className="tv-tile-footer">
        <span className="tv-tile-name" title={file.name}>{file.name}</span>
        <button
          className={`tv-fav-btn ${faved ? 'faved' : ''}`}
          onClick={e => { e.stopPropagation(); onFav(file.path); }}
          title={faved ? 'Remove favourite' : 'Add favourite'}
        >★</button>
      </div>
    </div>
  );
}

// ── Pin type badge ────────────────────────────────────────
function PinDot({ type, size = 14 }) {
  return (
    <span
      className="pin-dot"
      style={{ background: PIN_COLORS[type] || '#888', width: size, height: size }}
    />
  );
}

// ── Searchable character dropdown ─────────────────────────
function PinPicker({ label, items, onAdd }) {
  const [q, setQ]           = useState('');
  const [open, setOpen]     = useState(false);
  const ref                 = useRef(null);

  const filtered = items.filter(i => i.name.toLowerCase().includes(q.toLowerCase())).slice(0, 40);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="pin-picker" ref={ref}>
      <div className="pin-picker-input-row">
        <input
          className="pin-picker-input"
          placeholder={`Search ${label}…`}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="pin-picker-dropdown">
          {filtered.map(item => (
            <button
              key={item.id || item.slug || item.name}
              className="pin-picker-option"
              onMouseDown={e => {
                e.preventDefault();
                onAdd(item);
                setQ('');
                setOpen(false);
              }}
            >
              <PinDot type={item.type} size={10} />
              <span>{item.name}</span>
              {item.class && <span className="pin-option-sub">{item.class}</span>}
              {item.cr !== undefined && <span className="pin-option-sub">CR {item.challenge_rating || item.cr}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Map State Preset modal ─────────────────────────────────
function SaveStateModal({ onSave, onClose }) {
  const [name, setName] = useState('');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Save Map State</div>
        <input
          className="modal-input"
          placeholder="State name…"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()); }}
        />
        <div className="modal-actions">
          <button className="tv-btn" onClick={onClose}>Cancel</button>
          <button className="tv-btn primary" disabled={!name.trim()} onClick={() => onSave(name.trim())}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export default function TVDisplay() {
  // ── Folder / file state ──
  const [folder, setFolder] = useState(() => localStorage.getItem(FOLDER_KEY) || '');
  const [files,  setFiles]  = useState(() => { try { return JSON.parse(localStorage.getItem(FILES_KEY) || '[]'); } catch { return []; } });
  const [favs,   setFavs]   = useState(() => { try { return JSON.parse(localStorage.getItem(FAVS_KEY)  || '[]'); } catch { return []; } });
  const [active, setActive] = useState(null);
  const [tvOpen, setTvOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showFavsOnly, setShowFavsOnly] = useState(false);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [thumbs,  setThumbs]  = useState({});

  // ── Overlay state ──
  const [fogEnabled,      setFogEnabled]      = useState(true);
  const [brushSize,       setBrushSize]       = useState(40);
  const [gridEnabled,     setGridEnabled]     = useState(false);
  const [gridSize,        setGridSize]        = useState('medium');
  const [pins,            setPins]            = useState([]);
  const [hideAllNpcs,     setHideAllNpcs]     = useState(false);
  const [hideAllMonsters, setHideAllMonsters] = useState(false);
  const [placingPin,      setPlacingPin]      = useState(null); // pin waiting to be placed
  const [mapStates,       setMapStates]       = useState([]);
  const [showSaveModal,   setShowSaveModal]   = useState(false);

  // ── Character sources for pin picker ──
  const [pcList,      setPcList]      = useState([]);
  const [monsterList, setMonsterList] = useState([]);

  // ── Canvas refs ──
  const canvasRef  = useRef(null);
  const fogRef     = useRef(null);   // offscreen fog canvas
  const mapImgRef  = useRef(null);
  const painting   = useRef(false);
  const overlayRef = useRef(null);   // wrapper div for bounds

  const isElectron = !!window.electronAPI;

  // ── Init ──
  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.tv.isOpen().then(setTvOpen);
    window.electronAPI.characters.loadSeed().then(d => {
      const chars = (d.characters || []).map(c => ({ ...c, type: 'pc' }));
      setPcList(chars);
    });
    window.electronAPI.monsters.loadSrd().then(r => {
      if (r.success) {
        const all = r.data.map(m => ({ ...m, type: 'monster' }));
        setMonsterList(all);
      }
    });
    window.electronAPI.mapStates.load().then(setMapStates);
  }, [isElectron]);

  // ── Thumbnail queue ──
  const thumbQueue   = useRef([]);
  const thumbWorking = useRef(false);

  const enqueueThumbnail = useCallback((filePath) => {
    if (!isElectron) return;
    setThumbs(prev => {
      if (prev[filePath] || prev[filePath] === 'loading') return prev;
      thumbQueue.current.push(filePath);
      if (!thumbWorking.current) drainQueue();
      return { ...prev, [filePath]: 'loading' };
    });
  }, [isElectron]); // eslint-disable-line react-hooks/exhaustive-deps

  function drainQueue() {
    if (!thumbQueue.current.length) { thumbWorking.current = false; return; }
    thumbWorking.current = true;
    const p = thumbQueue.current.shift();
    window.electronAPI.tv.thumbnail(p).then(res => {
      if (res.success) setThumbs(prev => ({ ...prev, [p]: res.dataUrl }));
      else             setThumbs(prev => { const n = { ...prev }; delete n[p]; return n; });
      drainQueue();
    });
  }

  // ── Canvas drawing ──
  const drawDmCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = mapImgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth,  ih = img.naturalHeight;
    const scale = Math.min(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);

    // Fog — DM sees semi-transparent
    if (fogEnabled && fogRef.current) {
      ctx.globalAlpha = FOG_OPACITY;
      ctx.drawImage(fogRef.current, dx, dy, dw, dh);
      ctx.globalAlpha = 1;
    }

    // Grid
    if (gridEnabled) {
      const step = GRID_PX[gridSize] || 60;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth   = 0.8;
      ctx.beginPath();
      for (let x = dx; x <= dx + dw; x += step) { ctx.moveTo(x, dy); ctx.lineTo(x, dy + dh); }
      for (let y = dy; y <= dy + dh; y += step) { ctx.moveTo(dx, y); ctx.lineTo(dx + dw, y); }
      ctx.stroke();
      ctx.restore();
    }

    // Pins — DM always sees all
    pins.forEach(pin => {
      const px = dx + pin.x * dw;
      const py = dy + pin.y * dh;
      const r  = 16;
      const color = PIN_COLORS[pin.type] || '#888';

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur  = 6;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (pin.hidden) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      }
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur  = 0;

      ctx.fillStyle    = '#fff';
      ctx.font         = 'bold 10px system-ui,sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pin.initials || '?', px, py);

      ctx.font         = '10px system-ui,sans-serif';
      ctx.textBaseline = 'top';
      ctx.shadowColor  = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur   = 3;
      ctx.fillText(pin.name, px, py + r + 3);
      ctx.shadowBlur   = 0;

      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    });

    // Placement crosshair hint
    if (placingPin) {
      ctx.save();
      ctx.strokeStyle = PIN_COLORS[placingPin.type] || '#fff';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(dx + 4, dy + 4, dw - 8, dh - 8);
      ctx.setLineDash([]);
      ctx.fillStyle    = PIN_COLORS[placingPin.type] || '#fff';
      ctx.font         = '12px system-ui,sans-serif';
      ctx.textAlign    = 'center';
      ctx.fillText(`Click map to place ${placingPin.name}`, cw / 2, dy + dh + 18);
      ctx.restore();
    }
  }, [fogEnabled, gridEnabled, gridSize, pins, placingPin]);

  // Re-draw whenever overlay state changes
  useEffect(() => { drawDmCanvas(); }, [drawDmCanvas]);

  // ── Map canvas sizing ──
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width  = el.clientWidth;
      canvas.height = el.clientHeight;
      drawDmCanvas();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [drawDmCanvas]);

  // ── Fog init helper ──
  function ensureFog(w, h) {
    if (fogRef.current && fogRef.current.width === w && fogRef.current.height === h) return;
    const fc     = document.createElement('canvas');
    fc.width     = w;
    fc.height    = h;
    const fctx   = fc.getContext('2d');
    fctx.fillStyle = '#000';
    fctx.fillRect(0, 0, w, h);
    fogRef.current = fc;
  }

  // ── Fog brush helpers ──
  function getMapBounds() {
    const canvas = canvasRef.current;
    const img    = mapImgRef.current;
    if (!canvas || !img) return null;
    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth,  ih = img.naturalHeight;
    const scale = Math.min(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    return { dx: (cw - dw) / 2, dy: (ch - dh) / 2, dw, dh };
  }

  function canvasToNorm(cx, cy) {
    const b = getMapBounds();
    if (!b) return null;
    return {
      nx: (cx - b.dx) / b.dw,
      ny: (cy - b.dy) / b.dh,
    };
  }

  function paintFog(cx, cy) {
    const img = mapImgRef.current;
    if (!img || !fogRef.current) return;
    const norm = canvasToNorm(cx, cy);
    if (!norm || norm.nx < 0 || norm.nx > 1 || norm.ny < 0 || norm.ny > 1) return;

    const fc  = fogRef.current.getContext('2d');
    const px  = norm.nx * fogRef.current.width;
    const py  = norm.ny * fogRef.current.height;
    const scaleX = fogRef.current.width  / (getMapBounds()?.dw || 1);
    const r   = brushSize * scaleX;

    fc.globalCompositeOperation = 'destination-out';
    fc.beginPath();
    fc.arc(px, py, r, 0, Math.PI * 2);
    fc.fill();
    fc.globalCompositeOperation = 'source-over';
    drawDmCanvas();
  }

  function flushFogToTV() {
    if (!fogRef.current || !isElectron) return;
    const dataUrl = fogRef.current.toDataURL('image/png');
    window.electronAPI.tv.syncFog(dataUrl);
  }

  // ── Canvas pointer events ──
  function handlePointerDown(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (placingPin) {
      const norm = canvasToNorm(cx, cy);
      if (!norm || norm.nx < 0 || norm.nx > 1 || norm.ny < 0 || norm.ny > 1) return;
      const newPin = { ...placingPin, x: norm.nx, y: norm.ny };
      const next   = [...pins, newPin];
      setPins(next);
      setPlacingPin(null);
      if (isElectron) window.electronAPI.tv.syncPins(next, hideAllNpcs, hideAllMonsters);
      return;
    }

    if (!fogEnabled) return;
    painting.current = true;
    paintFog(cx, cy);
  }

  function handlePointerMove(e) {
    if (!painting.current || !fogEnabled || placingPin) return;
    const rect = canvasRef.current.getBoundingClientRect();
    paintFog(e.clientX - rect.left, e.clientY - rect.top);
  }

  function handlePointerUp() {
    if (!painting.current) return;
    painting.current = false;
    flushFogToTV();
  }

  // ── Push image to TV ──
  const handlePushImage = useCallback(async (file) => {
    if (!tvOpen) {
      await window.electronAPI.tv.open();
      setTvOpen(true);
    }
    const res = await window.electronAPI.tv.pushImage(file.path);
    if (!res.success) { setError(res.error); return; }
    setActive(file.path);

    // Load image into DM canvas
    const img = new Image();
    img.onload = () => {
      mapImgRef.current = img;
      fogRef.current    = null; // reset fog for new map
      ensureFog(img.naturalWidth, img.naturalHeight);
      const canvas  = canvasRef.current;
      const overlay = overlayRef.current;
      if (canvas && overlay) {
        canvas.width  = overlay.clientWidth;
        canvas.height = overlay.clientHeight;
      }
      drawDmCanvas();
      // Sync current overlay state to TV
      if (isElectron) {
        window.electronAPI.tv.syncGrid(gridEnabled, gridSize);
        window.electronAPI.tv.syncPins(pins, hideAllNpcs, hideAllMonsters);
      }
    };
    img.src = `file://${file.path}`;
  }, [tvOpen, gridEnabled, gridSize, pins, hideAllNpcs, hideAllMonsters, isElectron, drawDmCanvas]);

  // ── Grid sync ──
  function setGrid(enabled, size) {
    setGridEnabled(enabled);
    setGridSize(size);
    if (isElectron) window.electronAPI.tv.syncGrid(enabled, size);
  }

  // ── Pin management ──
  function queuePin(charData, type) {
    const id = `pin_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setPlacingPin({
      id,
      type,
      name: charData.name,
      initials: initials(charData.name),
      hidden: false,
      x: 0.5, y: 0.5,
    });
  }

  function togglePinHidden(id) {
    const next = pins.map(p => p.id === id ? { ...p, hidden: !p.hidden } : p);
    setPins(next);
    if (isElectron) window.electronAPI.tv.syncPins(next, hideAllNpcs, hideAllMonsters);
  }

  function removePin(id) {
    const next = pins.filter(p => p.id !== id);
    setPins(next);
    if (isElectron) window.electronAPI.tv.syncPins(next, hideAllNpcs, hideAllMonsters);
  }

  function setHideGroup(group, val) {
    const hn = group === 'npc'     ? val : hideAllNpcs;
    const hm = group === 'monster' ? val : hideAllMonsters;
    setHideAllNpcs(hn);
    setHideAllMonsters(hm);
    if (isElectron) window.electronAPI.tv.syncPins(pins, hn, hm);
  }

  // ── Map state presets ──
  async function handleSaveState(name) {
    setShowSaveModal(false);
    const fogMask = fogRef.current ? fogRef.current.toDataURL('image/png') : null;
    const state = {
      id: `ms_${Date.now()}`,
      name,
      mapPath: active,
      fogMask,
      gridEnabled,
      gridSize,
      pins,
      hideAllNpcs,
      hideAllMonsters,
      savedAt: new Date().toISOString(),
    };
    const res = await window.electronAPI.mapStates.save(state);
    if (res.success) setMapStates(prev => [...prev.filter(s => s.id !== state.id), state]);
  }

  async function handleLoadState(state) {
    // Push image if different from current
    if (state.mapPath && state.mapPath !== active) {
      const file = files.find(f => f.path === state.mapPath);
      if (file) await handlePushImage(file);
    }
    setGridEnabled(state.gridEnabled);
    setGridSize(state.gridSize || 'medium');
    setPins(state.pins || []);
    setHideAllNpcs(!!state.hideAllNpcs);
    setHideAllMonsters(!!state.hideAllMonsters);

    // Restore fog mask
    if (state.fogMask && mapImgRef.current) {
      const img = new Image();
      img.onload = () => {
        ensureFog(mapImgRef.current.naturalWidth, mapImgRef.current.naturalHeight);
        const fc = fogRef.current.getContext('2d');
        fc.clearRect(0, 0, fogRef.current.width, fogRef.current.height);
        fc.drawImage(img, 0, 0, fogRef.current.width, fogRef.current.height);
        drawDmCanvas();
      };
      img.src = state.fogMask;
    }

    if (isElectron) {
      window.electronAPI.tv.syncOverlay({
        fogMask:         state.fogMask,
        gridEnabled:     state.gridEnabled,
        gridSize:        state.gridSize,
        pins:            state.pins,
        hideAllNpcs:     state.hideAllNpcs,
        hideAllMonsters: state.hideAllMonsters,
      });
    }
  }

  async function handleDeleteState(id, e) {
    e.stopPropagation();
    await window.electronAPI.mapStates.delete(id);
    setMapStates(prev => prev.filter(s => s.id !== id));
  }

  // ── Fog controls ──
  function handleResetFog() {
    const img = mapImgRef.current;
    if (!img) return;
    ensureFog(img.naturalWidth, img.naturalHeight);
    const fc = fogRef.current.getContext('2d');
    fc.clearRect(0, 0, fogRef.current.width, fogRef.current.height);
    fc.fillStyle = '#000';
    fc.fillRect(0, 0, fogRef.current.width, fogRef.current.height);
    drawDmCanvas();
    flushFogToTV();
  }

  function handleRevealAll() {
    const img = mapImgRef.current;
    if (!img) return;
    ensureFog(img.naturalWidth, img.naturalHeight);
    const fc = fogRef.current.getContext('2d');
    fc.clearRect(0, 0, fogRef.current.width, fogRef.current.height);
    drawDmCanvas();
    flushFogToTV();
  }

  // ── Folder / misc ──
  const handlePickFolder = async () => {
    setLoading(true); setError('');
    const res = await window.electronAPI.tv.pickFolder();
    setLoading(false);
    if (!res.success) return;
    setFolder(res.folder);
    setFiles(res.files);
    setActive(null);
    localStorage.setItem(FOLDER_KEY, res.folder);
    localStorage.setItem(FILES_KEY, JSON.stringify(res.files));
  };

  const handleOpenTV = async () => {
    const res = await window.electronAPI.tv.open();
    if (res.success) setTvOpen(true); else setError(res.error);
  };

  const handleCloseTV = async () => {
    await window.electronAPI.tv.close();
    setTvOpen(false); setActive(null);
  };

  const handleClear = async () => {
    await window.electronAPI.tv.clear();
    setActive(null); mapImgRef.current = null; fogRef.current = null;
    drawDmCanvas();
  };

  const toggleFav = (filePath) => {
    setFavs(prev => {
      const next = prev.includes(filePath) ? prev.filter(f => f !== filePath) : [...prev, filePath];
      localStorage.setItem(FAVS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const filtered = files.filter(f => {
    if (showFavsOnly && !favs.includes(f.path)) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const mapActive = !!active && !!mapImgRef.current;

  if (!isElectron) return (
    <div className="tv-panel"><div className="tv-notice"><p>Requires Electron app.</p></div></div>
  );

  return (
    <div className="tv-panel">

      {/* ── Top Bar ── */}
      <div className="tv-topbar">
        <div className="tv-topbar-left">
          <button className="tv-btn" onClick={handlePickFolder} disabled={loading}>
            {loading ? 'Scanning…' : folder ? '⟳ Change Folder' : '📁 Select Map Folder'}
          </button>
          {folder && (
            <span className="tv-folder-path" title={folder}>
              {folder.split(/[\\/]/).slice(-2).join(' / ')}
            </span>
          )}
        </div>
        <div className="tv-topbar-right">
          {active && <button className="tv-btn secondary" onClick={handleClear}>Clear Display</button>}
          <button
            className={`tv-btn ${tvOpen ? 'danger' : 'primary'}`}
            onClick={tvOpen ? handleCloseTV : handleOpenTV}
          >
            {tvOpen ? '✕ Close TV' : '⎋ Open TV Window'}
          </button>
        </div>
      </div>

      {/* ── Status Bar ── */}
      <div className="tv-status-bar">
        <span className={`tv-status-dot ${tvOpen ? 'on' : 'off'}`} />
        <span className="tv-status-label">{tvOpen ? 'TV window open' : 'TV window closed'}</span>
        {active && (
          <>
            <span className="tv-status-sep">·</span>
            <span className="tv-status-active">
              Displaying: <strong>{files.find(f => f.path === active)?.name || '—'}</strong>
            </span>
          </>
        )}
      </div>

      {error && (
        <div className="tv-error">{error} <button onClick={() => setError('')}>✕</button></div>
      )}

      {/* ── Overlay Editor (when map active) ── */}
      {mapActive && (
        <div className="overlay-editor">

          {/* DM Canvas */}
          <div
            className={`overlay-canvas-wrap ${placingPin ? 'placing' : fogEnabled ? 'painting' : ''}`}
            ref={overlayRef}
          >
            <canvas
              ref={canvasRef}
              className="overlay-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
            {placingPin && (
              <div className="placing-hint">
                <PinDot type={placingPin.type} size={12} />
                Click map to place <strong>{placingPin.name}</strong>
                <button className="placing-cancel" onClick={() => setPlacingPin(null)}>Cancel</button>
              </div>
            )}
          </div>

          {/* Controls Sidebar */}
          <div className="overlay-sidebar">

            {/* Fog */}
            <div className="ov-section">
              <div className="ov-section-title">Fog of War</div>
              <div className="ov-row">
                <button
                  className={`ov-toggle ${fogEnabled ? 'active' : ''}`}
                  onClick={() => setFogEnabled(p => !p)}
                >
                  {fogEnabled ? 'Brush On' : 'Brush Off'}
                </button>
              </div>
              <div className="ov-row ov-brush-row">
                <span className="ov-label">Brush</span>
                <input
                  type="range" min="10" max="120" value={brushSize}
                  onChange={e => setBrushSize(Number(e.target.value))}
                  className="ov-slider"
                />
                <span className="ov-value">{brushSize}px</span>
              </div>
              <div className="ov-row ov-gap">
                <button className="ov-btn" onClick={handleRevealAll}>Reveal All</button>
                <button className="ov-btn danger" onClick={handleResetFog}>Reset Fog</button>
              </div>
            </div>

            {/* Grid */}
            <div className="ov-section">
              <div className="ov-section-title">Grid</div>
              <div className="ov-row">
                <button
                  className={`ov-toggle ${gridEnabled ? 'active' : ''}`}
                  onClick={() => setGrid(!gridEnabled, gridSize)}
                >
                  {gridEnabled ? 'Grid On' : 'Grid Off'}
                </button>
                <div className="ov-size-btns">
                  {GRID_SIZES.map(s => (
                    <button
                      key={s}
                      className={`ov-size-btn ${gridSize === s ? 'active' : ''}`}
                      onClick={() => setGrid(gridEnabled, s)}
                    >
                      {s[0].toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pins */}
            <div className="ov-section ov-pins-section">
              <div className="ov-section-title">Pins</div>

              {/* Group toggles */}
              <div className="ov-row ov-gap">
                <button
                  className={`ov-toggle small ${hideAllNpcs ? 'active' : ''}`}
                  onClick={() => setHideGroup('npc', !hideAllNpcs)}
                >
                  {hideAllNpcs ? 'Show NPCs' : 'Hide NPCs'}
                </button>
                <button
                  className={`ov-toggle small ${hideAllMonsters ? 'active' : ''}`}
                  onClick={() => setHideGroup('monster', !hideAllMonsters)}
                >
                  {hideAllMonsters ? 'Show Monsters' : 'Hide Monsters'}
                </button>
              </div>

              {/* PC picker */}
              <div className="pin-group-label"><PinDot type="pc" /> Player Characters</div>
              <PinPicker label="PCs" items={pcList} onAdd={item => queuePin(item, 'pc')} />

              {/* NPC picker */}
              <div className="pin-group-label"><PinDot type="npc" /> NPCs</div>
              <PinPicker label="NPCs" items={monsterList.filter(m => m.type !== 'monster')} onAdd={item => queuePin(item, 'npc')} />

              {/* Monster picker */}
              <div className="pin-group-label"><PinDot type="monster" /> Monsters</div>
              <PinPicker label="monsters" items={monsterList} onAdd={item => queuePin(item, 'monster')} />

              {/* Active pins list */}
              {pins.length > 0 && (
                <div className="active-pins">
                  {pins.map(pin => (
                    <div key={pin.id} className={`active-pin ${pin.hidden ? 'hidden-pin' : ''}`}>
                      <PinDot type={pin.type} size={10} />
                      <span className="active-pin-name">{pin.name}</span>
                      <button
                        className="pin-action"
                        title={pin.hidden ? 'Show on TV' : 'Hide from TV'}
                        onClick={() => togglePinHidden(pin.id)}
                      >
                        {pin.hidden ? '👁' : '🙈'}
                      </button>
                      <button
                        className="pin-action danger"
                        title="Remove pin"
                        onClick={() => removePin(pin.id)}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Map States */}
            <div className="ov-section">
              <div className="ov-section-title">
                Map States
                <button className="ov-btn small" onClick={() => setShowSaveModal(true)}>+ Save</button>
              </div>
              {mapStates.length === 0 && (
                <div className="ov-empty">No saved states yet.</div>
              )}
              {mapStates.map(s => (
                <div key={s.id} className="map-state-row" onClick={() => handleLoadState(s)}>
                  <span className="map-state-name">{s.name}</span>
                  <span className="map-state-map">
                    {s.mapPath ? s.mapPath.split(/[\\/]/).pop() : '—'}
                  </span>
                  <button
                    className="pin-action danger"
                    onClick={e => handleDeleteState(s.id, e)}
                    title="Delete state"
                  >✕</button>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* ── Map Grid ── */}
      {files.length === 0 ? (
        <div className="tv-empty">
          <div className="empty-icon">🗺️</div>
          <p>No maps loaded yet.</p>
          <p className="empty-hint">Select a folder containing your map images — JPG, PNG, WebP supported.</p>
          <button className="auth-btn" onClick={handlePickFolder}>Select Folder</button>
        </div>
      ) : (
        <>
          <div className="tv-filterbar">
            <input
              className="tv-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search maps…"
            />
            <button
              className={`tv-fav-toggle ${showFavsOnly ? 'active' : ''}`}
              onClick={() => setShowFavsOnly(p => !p)}
            >
              ★ Favourites {favs.length > 0 && `(${favs.length})`}
            </button>
            <span className="tv-count">{filtered.length} map{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          <div className={`tv-grid ${mapActive ? 'compact' : ''}`}>
            {filtered.length === 0 && (
              <div className="tv-no-results">No maps match your search.</div>
            )}
            {filtered.map(file => (
              <LazyTile
                key={file.path}
                file={file}
                active={active === file.path}
                thumb={thumbs[file.path]}
                faved={favs.includes(file.path)}
                onPush={handlePushImage}
                onFav={toggleFav}
                onVisible={enqueueThumbnail}
              />
            ))}
          </div>
        </>
      )}

      {showSaveModal && (
        <SaveStateModal onSave={handleSaveState} onClose={() => setShowSaveModal(false)} />
      )}
    </div>
  );
}
