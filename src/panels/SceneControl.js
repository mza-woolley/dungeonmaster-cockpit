// SceneControl.js — v0.4 (ambience layer added)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import './SceneControl.css';

// ── Ambience data ─────────────────────────────────────────

const AMBIENCE_SOUNDS = {
  nature: [
    { id: 'birds',         label: 'Birds',         icon: '🐦', file: 'birds.mp3' },
    { id: 'bubbles',       label: 'Bubbles',       icon: '🫧', file: 'bubbles.mp3' },
    { id: 'campfire',      label: 'Campfire',      icon: '🔥', file: 'campfire.mp3' },
    { id: 'droplets',      label: 'Droplets',      icon: '💧', file: 'droplets.mp3' },
    { id: 'heavy-rain',    label: 'Heavy Rain',    icon: '🌧', file: 'heavy-rain.mp3' },
    { id: 'howling-wind',  label: 'Howling Wind',  icon: '💨', file: 'howling-wind.mp3' },
    { id: 'jungle',        label: 'Jungle',        icon: '🌿', file: 'jungle.mp3' },
    { id: 'light-rain',    label: 'Light Rain',    icon: '🌧', file: 'light-rain.mp3' },
    { id: 'rain-on-leaves',label: 'Rain on Leaves',icon: '🍃', file: 'rain-on-leaves.mp3' },
    { id: 'river',         label: 'River',         icon: '〰', file: 'river.mp3' },
    { id: 'thunder',       label: 'Thunder',       icon: '⛈', file: 'thunder.mp3' },
    { id: 'underwater',    label: 'Underwater',    icon: '🌊', file: 'underwater.mp3' },
    { id: 'waterfall',     label: 'Waterfall',     icon: '💧', file: 'waterfall.mp3' },
    { id: 'waves',         label: 'Waves',         icon: '🌊', file: 'waves.mp3' },
    { id: 'wind',          label: 'Wind',          icon: '💨', file: 'wind.mp3' },
    { id: 'wind-in-trees', label: 'Wind in Trees', icon: '🌲', file: 'wind-in-trees.mp3' },
  ],
  creatures: [
    { id: 'beehive',      label: 'Beehive',      icon: '🐝', file: 'beehive.mp3' },
    { id: 'chickens',     label: 'Chickens',     icon: '🐔', file: 'chickens.mp3' },
    { id: 'cows',         label: 'Cows',         icon: '🐄', file: 'cows.mp3' },
    { id: 'crickets',     label: 'Crickets',     icon: '🦗', file: 'crickets.mp3' },
    { id: 'crows',        label: 'Crows',        icon: '🐦', file: 'crows.mp3' },
    { id: 'horse-gallop', label: 'Horse Gallop', icon: '🐴', file: 'horse-gallop.mp3' },
    { id: 'seagulls',     label: 'Seagulls',     icon: '🐦', file: 'seagulls.mp3' },
    { id: 'wolf',         label: 'Wolf',         icon: '🐺', file: 'wolf.mp3' },
  ],
  atmosphere: [
    { id: 'crowd',        label: 'Crowd',        icon: '👥', file: 'crowd.mp3' },
    { id: 'paper',        label: 'Paper',        icon: '📄', file: 'paper.mp3' },
    { id: 'singing-bowl', label: 'Singing Bowl', icon: '🔔', file: 'singing-bowl.mp3' },
    { id: 'tavern',       label: 'Tavern',       icon: '🍺', file: 'tavern.mp3' },
  ],
};

const ALL_SOUNDS = Object.values(AMBIENCE_SOUNDS).flat();
const CATEGORY_LABELS = { nature: 'Nature', creatures: 'Creatures', atmosphere: 'Atmosphere' };

const FADE_DURATION = 4000; // ms crossfade
const AMB_OPEN_KEY  = 'dm-cockpit-amb-open';
const AMB_MIX_KEY   = 'dm-cockpit-amb-mix';
const AMB_VOL_KEY   = 'dm-cockpit-amb-vol';

// ── Ambience engine (module-level singleton) ──────────────

const _engine = (() => {
  let audioCtx   = null;
  let masterGain = null;
  let masterVol  = 0.7;
  const nodes    = {}; // id -> { source, gainNode, audio }

  function getCtx() {
    if (!audioCtx) {
      audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = masterVol;
      masterGain.connect(audioCtx.destination);
    }
    return audioCtx;
  }

  function play(soundId, volume = 0.5) {
    const sound = ALL_SOUNDS.find(s => s.id === soundId);
    if (!sound || nodes[soundId]) return;
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const audio    = new Audio(`sounds/${sound.file}`);
    audio.loop     = true;
    const source   = ctx.createMediaElementSource(audio);
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + FADE_DURATION / 1000);
    source.connect(gainNode);
    gainNode.connect(masterGain);
    audio.play().catch(() => {});
    nodes[soundId] = { source, gainNode, audio };
  }

  function stop(soundId, immediate = false) {
    const node = nodes[soundId];
    if (!node) return;
    const ctx = getCtx();
    const { gainNode, audio } = node;
    delete nodes[soundId];
    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    if (immediate) {
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      audio.pause();
      audio.src = '';
    } else {
      gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_DURATION / 1000);
      setTimeout(() => { audio.pause(); audio.src = ''; }, FADE_DURATION + 100);
    }
  }

  // Hard-stop everything immediately — no fade, no race with overlapping
  // play/stop calls (e.g. presets fired in quick succession).
  function stopAll() {
    Object.keys(nodes).forEach(id => stop(id, true));
  }

  function setVolume(soundId, volume) {
    const node = nodes[soundId];
    if (!node) return;
    const ctx = getCtx();
    node.gainNode.gain.setTargetAtTime(volume, ctx.currentTime, 0.1);
  }

  function setMasterVolume(vol) {
    masterVol = vol;
    if (masterGain && audioCtx) {
      masterGain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.1);
    }
  }

  function applyMix(mix) {
    const incoming = new Set(Object.keys(mix));
    const current  = new Set(Object.keys(nodes));
    current.forEach(id => { if (!incoming.has(id)) stop(id); });
    incoming.forEach(id => {
      if (current.has(id)) setVolume(id, mix[id]);
      else play(id, mix[id]);
    });
  }

  function isPlaying(soundId) { return !!nodes[soundId]; }

  return { play, stop, stopAll, setVolume, setMasterVolume, applyMix, isPlaying };
})();

export { _engine as ambienceEngine };

// ── Preset helpers ────────────────────────────────────────

const NONE_PLAYLIST_ID = '__none__';

const PRESET_COLORS = [
  { id: 'ember',  label: 'Ember',  hex: '#d4622a' },
  { id: 'gold',   label: 'Gold',   hex: '#c9a84c' },
  { id: 'teal',   label: 'Teal',   hex: '#2a9d8f' },
  { id: 'violet', label: 'Violet', hex: '#7b5ea7' },
  { id: 'steel',  label: 'Steel',  hex: '#4a7fa5' },
  { id: 'moss',   label: 'Moss',   hex: '#4a7c59' },
];

// Curated swatches — chosen to render consistently on both the Nanoleaf
// panels and the Pixie RGB strip (cyan/teal/turquoise blends excluded,
// as those are where cheap RGB strips diverge most from the panels).
const LIGHT_PALETTE = [
  // Standard
  { id: 'red',        label: 'Red',        hex: '#e0392c' },
  { id: 'orange',     label: 'Orange',     hex: '#e8742c' },
  { id: 'amber',      label: 'Amber',      hex: '#e8a52c' },
  { id: 'gold2',      label: 'Gold',       hex: '#d9c24a' },
  { id: 'green',      label: 'Green',      hex: '#3f9e52' },
  { id: 'blue',       label: 'Blue',       hex: '#3a7fd9' },
  { id: 'indigo',     label: 'Indigo',     hex: '#5a5ad1' },
  { id: 'violet2',    label: 'Violet',     hex: '#8a4fd1' },
  { id: 'magenta',    label: 'Magenta',    hex: '#d1419c' },
  { id: 'warm-white', label: 'Warm White', hex: '#f2ddc4' },
  // Expansion
  { id: 'crimson',    label: 'Crimson',    hex: '#b8273f' },
  { id: 'rust',       label: 'Rust',       hex: '#c0552c' },
  { id: 'honey',      label: 'Honey',      hex: '#d99a3c' },
  { id: 'olive',      label: 'Olive',      hex: '#8a9c3f' },
  { id: 'moss2',      label: 'Moss',       hex: '#4a7c59' },
  { id: 'steel2',     label: 'Steel',      hex: '#4a7fa5' },
  { id: 'sapphire',   label: 'Sapphire',   hex: '#2c4ea0' },
  { id: 'plum',       label: 'Plum',       hex: '#6b3f8a' },
  { id: 'rose',       label: 'Rose',       hex: '#c14f6e' },
  { id: 'cool-white', label: 'Cool White', hex: '#dfe6f0' },
];

function hexToHue(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  if (delta === 0) return 0;
  let h;
  if (max === r)      h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else                h = (r - g) / delta + 4;
  h = h * 60;
  return h < 0 ? h + 360 : h;
}

// Sorted by hue (colour-wheel order) so the 5×4 grid reads as a spectrum
const PALETTE_SORTED = [...LIGHT_PALETTE].sort((a, b) => hexToHue(a.hex) - hexToHue(b.hex));

function ColorSwatchPicker({ value, onChange }) {
  const [open, setOpen]   = useState(false);
  const [pos, setPos]     = useState(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e) => {
      if (btnRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocPointer);
    return () => document.removeEventListener('mousedown', onDocPointer);
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const popW = 5 * 24 + 4 * 6 + 20; // columns + gaps + padding
      let left = r.left + r.width / 2 - popW / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - popW - 8));
      setPos({ top: r.bottom + 8, left });
    }
    setOpen(o => !o);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="csb-stop-preview csb-stop-preview--btn"
        style={{ background: value }}
        title="Choose colour"
        onClick={toggle}
      />
      {open && pos && createPortal(
        <div className="swatch-picker" ref={popRef} style={{ top: pos.top, left: pos.left }}>
          {PALETTE_SORTED.map(c => (
            <button
              key={c.id}
              type="button"
              className={`swatch-btn${value === c.hex ? ' swatch-btn--active' : ''}`}
              style={{ '--swatch-color': c.hex }}
              title={c.label}
              onClick={() => { onChange(c.hex); setOpen(false); }}
            >
              <span className="swatch-dot" />
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

function buildGradient(colors) {
  if (!colors || colors.length === 0) return 'var(--bg-card)';
  if (colors.length === 1) return colors[0];
  const stops = [...colors, colors[0]];
  return `linear-gradient(to right, ${stops.map((c, i) => `${c} ${Math.round(i / (stops.length - 1) * 100)}%`).join(', ')})`;
}


// ── NowPlaying ────────────────────────────────────────────

function NowPlaying({ track, isPlaying, onResume, onPause, onPrevious, onSkip }) {
  if (!track) return null;
  return (
    <div className="now-playing">
      <span className="np-label">Now Playing</span>
      <div className="np-info">
        <span className="np-track">{track.name}</span>
        <span className="np-artist">{track.artist}</span>
      </div>
      <div className="np-controls">
        <button className="np-btn" onClick={onPrevious} title="Previous">⏮</button>
        <button className="np-btn np-playpause" onClick={isPlaying ? onPause : onResume} title={isPlaying ? 'Pause' : 'Resume'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="np-btn" onClick={onSkip} title="Skip">⏭</button>
      </div>
    </div>
  );
}

// ── Ambience Panel ────────────────────────────────────────

function AmbiencePanel({ activeSounds, onToggle, onVolumeChange, onMasterChange, masterVol }) {
  const [open, setOpen] = useState(() => {
    try { return JSON.parse(localStorage.getItem(AMB_OPEN_KEY) ?? 'true'); }
    catch { return true; }
  });

  const activeCount = Object.keys(activeSounds).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem(AMB_OPEN_KEY, JSON.stringify(next));
  };

  return (
    <div className="ambience-card">
      <button className="ambience-toggle" onClick={toggle} aria-expanded={open}>
        <span className="amb-label">Ambience</span>
        <div className="amb-summary">
          {activeCount > 0 && <span className="amb-active-dot" />}
          <span className="amb-count">
            {activeCount > 0 ? `${activeCount} active` : 'none active'}
          </span>
        </div>
        <div className="amb-master" onClick={e => e.stopPropagation()}>
          <label className="amb-master-label" htmlFor="master-vol">Master</label>
          <input
            id="master-vol"
            type="range"
            min="0" max="1" step="0.01"
            value={masterVol}
            className="amb-master-slider"
            onChange={e => onMasterChange(parseFloat(e.target.value))}
          />
        </div>
        <span className={`amb-chevron ${open ? 'open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="ambience-body">
          <div className="sound-grid">
            {ALL_SOUNDS.map(sound => {
              const active = activeSounds.hasOwnProperty(sound.id);
              const vol    = activeSounds[sound.id] ?? 0.5;
              return (
                <div
                  key={sound.id}
                  className={`sound-tile ${active ? 'active' : ''}`}
                  title={sound.label}
                  onClick={() => onToggle(sound.id, vol)}
                >
                  <span className="sound-tile-icon">{sound.icon}</span>
                  <span className="sound-tile-label">{sound.label}</span>
                  {active && (
                    <div className="sound-vol-wrap" onClick={e => e.stopPropagation()}>
                      <input
                        type="range"
                        min="0" max="1" step="0.01"
                        value={vol}
                        className="sound-vol-slider"
                        onChange={e => onVolumeChange(sound.id, parseFloat(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Ambience Strip ────────────────────────────────────────

function AmbienceStrip({ activeSounds, masterVol, onMasterChange, onKill }) {
  const active = Object.keys(activeSounds);
  return (
    <div className="ambience-strip">
      <span className="strip-label">Ambience</span>
      <div className="strip-sounds">
        {active.length === 0
          ? <span className="strip-inactive">Nothing playing</span>
          : active.map(id => {
              const sound = ALL_SOUNDS.find(s => s.id === id);
              return (
                <span key={id} className="strip-pill">
                  <span className="strip-pill-dot" />
                  {sound?.label ?? id}
                </span>
              );
            })
        }
      </div>
      <div className="strip-vol-wrap">
        <label className="strip-vol-label" htmlFor="strip-vol">Vol</label>
        <input
          id="strip-vol"
          type="range" min="0" max="1" step="0.01"
          value={masterVol}
          className="strip-vol-slider"
          onChange={e => onMasterChange(parseFloat(e.target.value))}
        />
      </div>
      <button
        className={`kill-btn ${active.length > 0 ? 'kill-btn--active' : ''}`}
        onClick={onKill}
        title="Stop all ambience"
      >
        ■ Kill ambience
      </button>
    </div>
  );
}

// ── PresetTile ────────────────────────────────────────────

function PresetTile({ preset, onFire, onFireLights, onEdit, active, firing }) {
  const tileHex  = preset.color?.startsWith('#') ? preset.color : (PRESET_COLORS.find(c => c.id === preset.color)?.hex || '#d4622a');
  const ambLabel = preset.ambience && Object.keys(preset.ambience).length > 0
    ? Object.keys(preset.ambience).map(id => ALL_SOUNDS.find(s => s.id === id)?.label ?? id).join(', ')
    : null;
  const hasLights = preset.lightSequence?.stops?.length > 0;

  return (
    <div
      className={`preset-tile ${active ? 'active' : ''} ${firing ? 'firing' : ''}`}
      style={{ '--tile-color': tileHex }}
    >
      <button className="tile-fire" onClick={() => onFire(preset)}>
        <div className="tile-header">
          <span className="tile-name">{preset.name}</span>
          {active && <span className="tile-active-pip" />}
        </div>
        <div className="tile-detail">
          {preset.playlistName && (
            <span className="tile-detail-row">
              <span className="tile-detail-icon">♪</span>
              <span className="tile-detail-text">{preset.playlistName}</span>
            </span>
          )}
          {hasLights && (
            <span className="tile-detail-row">
              <span
                className="tile-detail-icon tile-light-fire"
                title="Preview just the lights"
                onClick={(e) => { e.stopPropagation(); onFireLights(preset); }}
              >◉</span>
              <span
                className="tile-light-bar"
                style={{ background: buildGradient(preset.lightSequence.stops.map(s => s.color)) }}
              />
            </span>
          )}
          {ambLabel && (
            <span className="tile-detail-row">
              <span className="tile-detail-icon">♬</span>
              <span className="tile-detail-text">{ambLabel}</span>
            </span>
          )}
          {!preset.playlistName && !hasLights && !ambLabel && (
            <span className="tile-detail-row tile-detail-empty">No actions set</span>
          )}
        </div>
        {firing && <div className="tile-firing-bar" />}
      </button>
      <button className="tile-edit-btn" onClick={() => onEdit(preset)} title="Edit preset">✎</button>
    </div>
  );
}

// ── ColourSequenceBuilder ─────────────────────────────────

// Matches the fixed crossfade in electron/colorLoop.js — keeps the in-app
// preview animation in step with what the lights actually do.
const CROSSFADE_PREVIEW_MS = 3000;

function ColourSequenceBuilder({ sequence, onChange, onTest, onStopTest, testing }) {
  const stops = sequence?.stops ?? [{ color: '#d4622a', brightness: 100 }];

  const update = (i, patch) => onChange({ stops: stops.map((s, j) => j === i ? { ...s, ...patch } : s) });
  const remove = (i)        => onChange({ stops: stops.filter((_, j) => j !== i) });
  const add    = ()         => onChange({ stops: [...stops, { color: '#4a7fa5', brightness: 100 }] });

  // Animated preview — cycles through stops at the fixed crossfade duration
  const [previewIdx, setPreviewIdx] = useState(0);
  const stopsRef = useRef(stops);
  useEffect(() => { stopsRef.current = stops; }, [stops]);
  useEffect(() => {
    if (stops.length <= 1) { setPreviewIdx(0); return; }
    let cancelled = false;
    function advance() {
      if (cancelled) return;
      setPreviewIdx(idx => (idx + 1) % stopsRef.current.length);
      setTimeout(advance, CROSSFADE_PREVIEW_MS);
    }
    const t = setTimeout(advance, CROSSFADE_PREVIEW_MS);
    return () => { cancelled = true; clearTimeout(t); };
  }, [stops.length]);

  const previewStop = stops[previewIdx] ?? stops[0];
  const gradient    = buildGradient(stops.map(s => s.color));

  return (
    <div className="csb">
      <div className="csb-top-row">
        <div className="csb-preview" style={{ background: gradient }} />
        <div
          className="csb-live-square"
          style={{
            background:  previewStop.color,
            filter:      `brightness(${(previewStop.brightness ?? 100) / 100})`,
            transition:  `background ${CROSSFADE_PREVIEW_MS}ms ease, filter ${CROSSFADE_PREVIEW_MS}ms ease`,
          }}
        />
      </div>
      <div className="csb-stops">
        {stops.map((stop, i) => (
          <div key={i} className="csb-stop">
            {stops.length > 1 && (
              <button className="csb-stop-remove" onClick={() => remove(i)} title="Remove">×</button>
            )}
            <ColorSwatchPicker value={stop.color} onChange={hex => update(i, { color: hex })} />
            <input
              type="range" min={0} max={100} step={5}
              value={stop.brightness ?? 100}
              className="csb-stop-slider csb-stop-slider--bright"
              title="Brightness"
              onChange={e => update(i, { brightness: parseInt(e.target.value) })}
            />
            <span className="csb-stop-ms">{stop.brightness ?? 100}%</span>
          </div>
        ))}
        {stops.length < 6 && (
          <button className="csb-add" onClick={add} title="Add colour">+</button>
        )}
      </div>
      <div className="csb-controls">
        <span className="csb-test-hint">Preview above is in-app only</span>
        <button
          className={`csb-test-btn ${testing ? 'active' : ''}`}
          onClick={testing ? onStopTest : onTest}
        >
          {testing ? '■ Stop' : '▶ Push Live'}
        </button>
      </div>
    </div>
  );
}

// ── AmbienceMixer (inside preset editor) ─────────────────

function AmbienceMixer({ mix, onChange }) {
  return (
    <div className="amb-mixer">
      {Object.entries(AMBIENCE_SOUNDS).map(([cat, sounds]) => (
        <div key={cat} className="amb-mixer-cat">
          <div className="amb-mixer-cat-label">{CATEGORY_LABELS[cat] ?? cat}</div>
          <div className="sound-grid">
            {sounds.map(sound => {
              const active = mix.hasOwnProperty(sound.id);
              const vol    = mix[sound.id] ?? 0.5;
              return (
                <div
                  key={sound.id}
                  className={`sound-tile sound-tile--sm ${active ? 'active' : ''}`}
                  onClick={() => {
                    const next = { ...mix };
                    if (active) delete next[sound.id];
                    else next[sound.id] = 0.5;
                    onChange(next);
                  }}
                >
                  <span className="sound-tile-icon">{sound.icon}</span>
                  <span className="sound-tile-label">{sound.label}</span>
                  {active && (
                    <div className="sound-vol-wrap" onClick={e => e.stopPropagation()}>
                      <input
                        type="range" min="0" max="1" step="0.01" value={vol}
                        className="sound-vol-slider"
                        onChange={e => onChange({ ...mix, [sound.id]: parseFloat(e.target.value) })}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── PresetEditor ──────────────────────────────────────────

function PresetEditor({ preset, playlists, onSave, onDelete, onClose }) {
  const [name,          setName]          = useState(preset?.name || '');
  const [color,         setColor]         = useState(preset?.color?.startsWith('#') ? preset.color : (PRESET_COLORS.find(c => c.id === preset?.color)?.hex || '#d4622a'));
  const [playlistId,    setPlaylistId]    = useState(preset?.playlistId || '');
  const [playlistUri,   setPlaylistUri]   = useState(preset?.playlistUri || '');
  const [playlistName,  setPlaylistName]  = useState(preset?.playlistName || '');
  const [useAmbience,   setUseAmbience]   = useState(preset ? !!(preset.ambience && Object.keys(preset.ambience).length) : false);
  const [ambienceMix,   setAmbienceMix]   = useState(preset?.ambience || {});
  const [useLights,     setUseLights]     = useState(!!(preset?.lightSequence?.stops?.length));
  const [lightSequence, setLightSequence] = useState(
    preset?.lightSequence ?? { stops: [{ color: '#d4622a', brightness: 100 }] }
  );
  const [testingLights, setTestingLights] = useState(false);

  const isElectron = !!window.electronAPI;

  const handlePlaylistChange = (e) => {
    const val = e.target.value;
    if (val === NONE_PLAYLIST_ID) { setPlaylistId(NONE_PLAYLIST_ID); setPlaylistUri(''); setPlaylistName('None (pause music)'); return; }
    const pl = playlists.find(p => p.id === val);
    if (pl) { setPlaylistId(pl.id); setPlaylistUri(pl.uri); setPlaylistName(pl.name); }
    else    { setPlaylistId(''); setPlaylistUri(''); setPlaylistName(''); }
  };

  const handleTestLights = () => {
    if (!isElectron) return;
    window.electronAPI.lights.startLoop(lightSequence);
    setTestingLights(true);
  };

  const handleStopTest = () => {
    if (!isElectron) return;
    window.electronAPI.lights.stopLoop();
    setTestingLights(false);
  };

  const handleClose = () => {
    if (testingLights) handleStopTest();
    onClose();
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (testingLights) handleStopTest();
    onSave({
      id:            preset?.id || Date.now().toString(),
      name:          name.trim(),
      color,
      playlistId,
      playlistUri,
      playlistName,
      lightSequence: useLights ? lightSequence : null,
      ambience:      useAmbience ? ambienceMix : {},
    });
  };

  return (
    <div className="editor-overlay">
      <div className="editor-modal">
        <div className="editor-header">
          <h3>{preset ? 'Edit Preset' : 'New Preset'}</h3>
          <button className="editor-close" onClick={handleClose}>✕</button>
        </div>
        <div className="editor-body">
          <div className="editor-field">
            <label>Name</label>
            <input
              className="editor-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Combat, Tavern, Boss Fight…"
              maxLength={32}
              autoFocus
            />
          </div>
          <div className="editor-field editor-field--inline">
            <label>Tile Colour</label>
            <ColorSwatchPicker value={color} onChange={setColor} />
          </div>

          <div className="editor-section">
            <label className="editor-section-label">Spotify Playlist</label>
            {playlists.length > 0
              ? <select className="editor-select" value={playlistId} onChange={handlePlaylistChange}>
                  <option value="">— Don't change —</option>
                  <option value={NONE_PLAYLIST_ID}>None (pause music)</option>
                  {playlists.map(p => <option key={p.id} value={p.id}>{p.name} ({p.total} tracks)</option>)}
                </select>
              : <p className="editor-hint">Connect Spotify first to assign a playlist.</p>
            }
          </div>

          <div className="editor-section editor-section--accordion">
            <button className="editor-acc-header" onClick={() => {
              const next = !useLights;
              setUseLights(next);
              if (!next && testingLights) handleStopTest();
            }}>
              <span className="editor-acc-label">Lighting Sequence</span>
              {useLights && lightSequence?.stops?.length > 0 && (
                <span className="editor-acc-summary">{lightSequence.stops.length} colour{lightSequence.stops.length !== 1 ? 's' : ''}</span>
              )}
              <span className={`editor-acc-chevron ${useLights ? 'open' : ''}`}>▾</span>
            </button>
            {useLights && (
              <div className="editor-acc-body">
                <ColourSequenceBuilder
                  sequence={lightSequence}
                  onChange={setLightSequence}
                  onTest={handleTestLights}
                  onStopTest={handleStopTest}
                  testing={testingLights}
                />
              </div>
            )}
          </div>

          <div className="editor-section editor-section--accordion">
            <button className="editor-acc-header" onClick={() => setUseAmbience(!useAmbience)}>
              <span className="editor-acc-label">Ambient Mix</span>
              {useAmbience && Object.keys(ambienceMix).length > 0 && (
                <span className="editor-acc-summary">{Object.keys(ambienceMix).length} sound{Object.keys(ambienceMix).length !== 1 ? 's' : ''}</span>
              )}
              <span className={`editor-acc-chevron ${useAmbience ? 'open' : ''}`}>▾</span>
            </button>
            {useAmbience && (
              <div className="editor-acc-body">
                <AmbienceMixer mix={ambienceMix} onChange={setAmbienceMix} />
              </div>
            )}
          </div>
        </div>
        <div className="editor-footer">
          {preset && (
            <button className="editor-btn danger" onClick={() => onDelete(preset.id)}>Delete</button>
          )}
          <div className="editor-footer-right">
            <button className="editor-btn" onClick={handleClose}>Cancel</button>
            <button className="editor-btn primary" onClick={handleSave} disabled={!name.trim()}>
              {preset ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NanoleafManager (unchanged from v0.3) ────────────────

function NanoleafManager({ devices, onAdd, onRemove, onVerify, onClose }) {
  const [ip,        setIp]        = useState('');
  const [port,      setPort]      = useState('16021');
  const [label,     setLabel]     = useState('');
  const [msg,       setMsg]       = useState('');
  const [msgType,   setMsgType]   = useState('');
  const [adding,    setAdding]    = useState(false);
  const [verifying, setVerifying] = useState('');

  const handleAdd = async () => {
    if (!ip.trim()) return;
    setAdding(true);
    setMsg('Connecting… make sure you held the power button for 5 seconds.');
    setMsgType('');
    const res = await onAdd(ip.trim(), parseInt(port) || 16021, label.trim());
    if (res.success) {
      setMsg(`✓ Connected: ${res.device.label} (${res.device.model || 'unknown model'}${res.device.isEssentials ? ' · Essentials' : ''})`);
      setMsgType('ok');
      setIp(''); setLabel('');
    } else {
      setMsg('Failed: ' + res.error);
      setMsgType('err');
    }
    setAdding(false);
  };

  const handleVerify = async (deviceId) => {
    setVerifying(deviceId);
    const res = await onVerify(deviceId);
    setVerifying('');
    if (res.success && res.data.ok) {
      setMsg(`✓ ${devices.find(d => d.id === deviceId)?.label}: reachable, ${res.data.on ? 'on' : 'off'}, model ${res.data.model || 'unknown'}`);
      setMsgType('ok');
    } else {
      setMsg(`✗ ${devices.find(d => d.id === deviceId)?.label}: ${res.data?.error || res.error}`);
      setMsgType('err');
    }
  };

  return (
    <div className="editor-overlay">
      <div className="editor-modal editor-modal--wide">
        <div className="editor-header">
          <h3>Nanoleaf Devices</h3>
          <button className="editor-close" onClick={onClose}>✕</button>
        </div>
        <div className="editor-body">
          {devices.length > 0 && (
            <div className="editor-field">
              <label>Connected Devices</label>
              <div className="nl-device-list">
                {devices.map(d => (
                  <div key={d.id} className="nl-device-row">
                    <div className="nl-device-info">
                      <span className="nl-device-name">{d.label}</span>
                      <span className="nl-device-meta">{d.ip} · {d.model || 'unknown'}{d.isEssentials ? ' · Essentials' : ''}</span>
                    </div>
                    <div className="nl-device-actions">
                      <button className="editor-btn" onClick={() => handleVerify(d.id)} disabled={verifying === d.id}>
                        {verifying === d.id ? '…' : 'Verify'}
                      </button>
                      <button className="editor-btn danger" onClick={() => onRemove(d.id)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="editor-field">
            <label>{devices.length > 0 ? 'Add Another Device' : 'Add Device'}</label>
          </div>
          <p className="editor-hint">
            1. Find the device IP in the Nanoleaf app (Settings → Device Info).<br />
            2. Hold the power button for <strong>5 seconds</strong> until it blinks.<br />
            3. Enter the IP below and click Connect within 30 seconds.
          </p>
          <div className="editor-field">
            <label>Label (optional)</label>
            <input className="editor-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Desk Bulb, Corner Light" />
          </div>
          <div className="editor-row">
            <div className="editor-field" style={{ flex: 2 }}>
              <label>IP Address</label>
              <input className="editor-input" value={ip} onChange={e => setIp(e.target.value)} placeholder="192.168.1.42" />
            </div>
            <div className="editor-field" style={{ flex: 1 }}>
              <label>Port</label>
              <input className="editor-input" value={port} onChange={e => setPort(e.target.value)} placeholder="16021" />
            </div>
          </div>
          {msg && (
            <p className="editor-hint" style={{ color: msgType === 'ok' ? 'var(--gold)' : msgType === 'err' ? 'var(--ember)' : 'var(--text-dim)' }}>
              {msg}
            </p>
          )}
        </div>
        <div className="editor-footer">
          <div className="editor-footer-right">
            <button className="editor-btn" onClick={onClose}>Done</button>
            <button className="editor-btn primary" onClick={handleAdd} disabled={!ip.trim() || adding}>
              {adding ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main SceneControl ─────────────────────────────────────

export function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

export default function SceneControl() {
  const [spotifyAuth,     setSpotifyAuth]     = useState(false);
  const [nanoleafDevices, setNanoleafDevices] = useState([]);
  const [playlists,       setPlaylists]       = useState([]);
  const [currentTrack,    setCurrentTrack]    = useState(null);
  const [activePreset,    setActivePreset]    = useState(null);
  const [firingPreset,    setFiringPreset]    = useState(null);
  const [presets,         setPresets]         = useState([]);
  const [editing,         setEditing]         = useState(null);
  const [showNLManager,   setShowNLManager]   = useState(false);
  const [loading,         setLoading]         = useState('');
  const [error,           setError]           = useState('');
  const [pixieLoading,    setPixieLoading]    = useState('');

  // Ambience state: { soundId: volume (0-1) }
  const [activeSounds, setActiveSounds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(AMB_MIX_KEY) ?? '{}'); } catch { return {}; }
  });
  const [masterVol, setMasterVolState] = useState(() => {
    const v = parseFloat(localStorage.getItem(AMB_VOL_KEY));
    return isNaN(v) ? 0.7 : v;
  });

  const engine = _engine;

  const isElectron    = !!window.electronAPI;
  const nanoleafReady = nanoleafDevices.length > 0;

  // Sync master volume on mount (engine is a singleton, sounds already playing)
  useEffect(() => {
    engine.setMasterVolume(masterVol);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(AMB_MIX_KEY, JSON.stringify(activeSounds));
  }, [activeSounds]);

  useEffect(() => {
    localStorage.setItem(AMB_VOL_KEY, String(masterVol));
  }, [masterVol]);

  const fetchPlaylists = useCallback(async () => { const r = await window.electronAPI.spotify.getPlaylists(); if (r.success) setPlaylists(r.data); }, []);

  // Init
  useEffect(() => {
    if (!isElectron) return;
    (async () => {
      const [sAuth, devices, savedPresets] = await Promise.all([
        window.electronAPI.spotify.isAuthorized(),
        window.electronAPI.nanoleaf.getDevices(),
        window.electronAPI.presets.load(),
      ]);
      setSpotifyAuth(sAuth);
      setNanoleafDevices(devices || []);
      setPresets(Array.isArray(savedPresets) ? savedPresets : []);
      if (sAuth) fetchPlaylists();
    })();
  }, [isElectron, fetchPlaylists]);

  // Poll track — paused when window is hidden
  useEffect(() => {
    if (!spotifyAuth || !isElectron) return;
    const poll = async () => {
      if (document.hidden) return;
      const res = await window.electronAPI.spotify.currentTrack();
      if (res.success) setCurrentTrack(res.data);
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [spotifyAuth, isElectron]);
  const handleSpotifyAuth  = async () => {
    setLoading('spotify');
    const res = await window.electronAPI.spotify.authorize();
    if (res.success) { setSpotifyAuth(true); fetchPlaylists(); }
    else setError('Spotify auth failed: ' + res.error);
    setLoading('');
  };

  const pollTrack = useCallback(async () => {
    const res = await window.electronAPI.spotify.currentTrack();
    if (res.success) setCurrentTrack(res.data);
  }, []);

  const handleResume   = async () => { await window.electronAPI.spotify.resume();   setTimeout(pollTrack, 300); };
  const handlePause    = async () => { await window.electronAPI.spotify.pause();    setTimeout(pollTrack, 300); };
  const handlePrevious = async () => { await window.electronAPI.spotify.previous(); setTimeout(pollTrack, 1200); };
  const handleSkip     = async () => { await window.electronAPI.spotify.skip();     setTimeout(pollTrack, 1200); };

  const handleNLAdd    = async (ip, port, label) => {
    const res = await window.electronAPI.nanoleaf.setup(ip, port, label);
    if (res.success) { const d = await window.electronAPI.nanoleaf.getDevices(); setNanoleafDevices(d || []); }
    return res;
  };
  const handleNLRemove = async (id) => { await window.electronAPI.nanoleaf.removeDevice(id); const d = await window.electronAPI.nanoleaf.getDevices(); setNanoleafDevices(d || []); };
  const handleNLVerify = async (id) => window.electronAPI.nanoleaf.verifyDevice(id);

  // Ambience controls
  const handleSoundToggle = useCallback((soundId, currentVol) => {
    setActivePreset(null);
    setActiveSounds(prev => {
      const next = { ...prev };
      if (next[soundId] !== undefined) {
        engine.stop(soundId);
        delete next[soundId];
      } else {
        engine.play(soundId, currentVol);
        next[soundId] = currentVol;
      }
      return next;
    });
  }, [engine]);

  const handleVolumeChange = useCallback((soundId, vol) => {
    engine.setVolume(soundId, vol);
    setActiveSounds(prev => ({ ...prev, [soundId]: vol }));
  }, [engine]);

  const handleMasterChange = useCallback((vol) => {
    engine.setMasterVolume(vol);
    setMasterVolState(vol);
  }, [engine]);

  const handleKillAmbience = useCallback(() => {
    engine.stopAll();
    setActiveSounds({});
    setActivePreset(null);
  }, [engine]);

  // Fire preset
  const firePreset = useCallback(async (preset) => {
    setActivePreset(preset.id);
    setFiringPreset(preset.id);
    setError('');

    // Ambience crossfade
    if (preset.ambience && Object.keys(preset.ambience).length > 0) {
      engine.applyMix(preset.ambience);
      setActiveSounds(preset.ambience);
    } else {
      // Preset has no ambience — leave current mix alone (don't kill it)
    }

    // Spotify + Lights
    if (!isElectron) { setFiringPreset(null); return; }
    const actions = [];
    if (preset.playlistId === NONE_PLAYLIST_ID) actions.push(window.electronAPI.spotify.pause());
    else if (preset.playlistUri) actions.push(window.electronAPI.spotify.play(preset.playlistUri));
    if (preset.lightSequence?.stops?.length) {
      actions.push(window.electronAPI.lights.startLoop(preset.lightSequence));
    } else {
      window.electronAPI.lights.stopLoop();
    }
    if (actions.length) {
      const results  = await Promise.all(actions);
      const hardFail = results.find(r => !r.success);
      if (hardFail) setError(hardFail.error);
    }

    setFiringPreset(null);
    setTimeout(pollTrack, 1000);
  }, [engine, isElectron, pollTrack]);

  const fireLightsOnly = useCallback((preset) => {
    if (!isElectron || !preset.lightSequence?.stops?.length) return;
    window.electronAPI.lights.startLoop(preset.lightSequence);
  }, [isElectron]);

  const savePreset = (preset) => {
    setPresets(prev => {
      const existing = prev.findIndex(p => p.id === preset.id);
      const next = existing >= 0 ? prev.map(p => p.id === preset.id ? preset : p) : [...prev, preset];
      if (isElectron) window.electronAPI.presets.save(next);
      return next;
    });
    setEditing(null);
  };

  const deletePreset = (id) => {
    setPresets(prev => {
      const next = prev.filter(p => p.id !== id);
      if (isElectron) window.electronAPI.presets.save(next);
      return next;
    });
    setEditing(null);
  };

  if (!isElectron) return (
    <div className="scene-panel">
      <AmbiencePanel
        activeSounds={activeSounds}
        onToggle={handleSoundToggle}
        onVolumeChange={handleVolumeChange}
        onMasterChange={handleMasterChange}
        masterVol={masterVol}
      />
      <div className="scene-body" style={{ flex: 1 }}>
        <div className="scene-notice"><p>Spotify &amp; Nanoleaf require Electron. Ambience works standalone.</p></div>
      </div>
      <AmbienceStrip
        activeSounds={activeSounds}
        masterVol={masterVol}
        onMasterChange={handleMasterChange}
        onKill={handleKillAmbience}
      />
    </div>
  );

  return (
    <div className="scene-panel">

      {/* Status bar */}
      <div className="scene-status-bar">
        <div className="status-item">
          <span className={`status-dot ${spotifyAuth ? 'on' : 'off'}`} />
          <span className="status-label">Spotify</span>
          {!spotifyAuth && (
            <button className="status-connect" onClick={handleSpotifyAuth} disabled={loading === 'spotify'}>
              {loading === 'spotify' ? 'Opening…' : 'Connect'}
            </button>
          )}
        </div>
        <div className="status-item">
          <span className={`status-dot ${nanoleafReady ? 'on' : 'off'}`} />
          <span className="status-label">Nanoleaf{nanoleafDevices.length > 1 ? ` (${nanoleafDevices.length})` : ''}</span>
          <button className="status-connect" onClick={() => setShowNLManager(true)}>
            {nanoleafReady ? 'Manage' : 'Setup'}
          </button>
        </div>
        <div className="status-item">
          <span className="status-dot" style={{ background: 'var(--text-dim)' }} />
          <span className="status-label">Table Light</span>
          <button
            className="status-connect"
            disabled={!!pixieLoading}
            onClick={async () => {
              setPixieLoading('on');
              const res = await window.electronAPI.pixie.turnOn();
              if (res && !res.success) setError('Table Light: ' + res.error);
              setPixieLoading('');
            }}
          >{pixieLoading === 'on' ? '…' : 'On'}</button>
          <button
            className="status-connect"
            disabled={!!pixieLoading}
            onClick={async () => {
              setPixieLoading('off');
              const res = await window.electronAPI.pixie.turnOff();
              if (res && !res.success) setError('Table Light: ' + res.error);
              setPixieLoading('');
            }}
          >{pixieLoading === 'off' ? '…' : 'Off'}</button>
        </div>
        {currentTrack && (
          <NowPlaying
            track={currentTrack}
            isPlaying={currentTrack.isPlaying}
            onResume={handleResume}
            onPause={handlePause}
            onPrevious={handlePrevious}
            onSkip={handleSkip}
          />
        )}
      </div>

      {error && (
        <div className="scene-error">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Scrollable body */}
      <div className="scene-body">
        <AmbiencePanel
          activeSounds={activeSounds}
          onToggle={handleSoundToggle}
          onVolumeChange={handleVolumeChange}
          onMasterChange={handleMasterChange}
          masterVol={masterVol}
        />

        <div>
          <div className="scene-section-header">
            <span className="section-title">Scene Presets</span>
            <button className="new-preset-btn" onClick={() => setEditing('new')}>+ New Preset</button>
          </div>
          {presets.length === 0 ? (
            <div className="scene-empty">
              <div className="empty-icon">🎭</div>
              <p>No presets yet.</p>
              <p className="empty-hint">Create a preset to fire Spotify, Nanoleaf, and ambience together with one tap.</p>
              <button className="auth-btn" onClick={() => setEditing('new')}>Create your first preset</button>
            </div>
          ) : (
            <div className="preset-grid">
              {presets.map(p => (
                <PresetTile
                  key={p.id}
                  preset={p}
                  active={activePreset === p.id}
                  firing={firingPreset === p.id}
                  onFire={firePreset}
                  onFireLights={fireLightsOnly}
                  onEdit={setEditing}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ambience strip — always visible at bottom */}
      <AmbienceStrip
        activeSounds={activeSounds}
        masterVol={masterVol}
        onMasterChange={handleMasterChange}
        onKill={handleKillAmbience}
      />

      {showNLManager && (
        <NanoleafManager
          devices={nanoleafDevices}
          onAdd={handleNLAdd}
          onRemove={handleNLRemove}
          onVerify={handleNLVerify}
          onClose={() => setShowNLManager(false)}
        />
      )}

      {editing && (
        <PresetEditor
          preset={editing === 'new' ? null : editing}
          playlists={playlists}
          onSave={savePreset}
          onDelete={deletePreset}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
