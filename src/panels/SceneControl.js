// SceneControl.js — v0.4 (ambience layer added)
import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const FADE_DURATION = 2500; // ms crossfade
const AMB_OPEN_KEY  = 'dm-cockpit-amb-open';

// ── Ambience engine (Web Audio crossfader) ────────────────

function useAmbienceEngine() {
  const audioCtx    = useRef(null);
  const masterGain  = useRef(null);
  const nodes       = useRef({}); // id -> { source, gainNode, audio }
  const masterVol   = useRef(0.7);

  function getCtx() {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      masterGain.current = audioCtx.current.createGain();
      masterGain.current.gain.value = masterVol.current;
      masterGain.current.connect(audioCtx.current.destination);
    }
    return audioCtx.current;
  }

  const play = useCallback((soundId, volume = 0.5) => {
    const sound = ALL_SOUNDS.find(s => s.id === soundId);
    if (!sound || nodes.current[soundId]) return;
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const audio = new Audio(`/sounds/${sound.file}`);
    audio.loop  = true;
    const source   = ctx.createMediaElementSource(audio);
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + FADE_DURATION / 1000);
    source.connect(gainNode);
    gainNode.connect(masterGain.current);
    audio.play().catch(() => {});
    nodes.current[soundId] = { source, gainNode, audio };
  }, []);

  const stop = useCallback((soundId) => {
    const node = nodes.current[soundId];
    if (!node) return;
    const ctx = getCtx();
    const { gainNode, audio } = node;
    gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_DURATION / 1000);
    setTimeout(() => {
      audio.pause();
      audio.src = '';
      delete nodes.current[soundId];
    }, FADE_DURATION + 100);
  }, []);

  const stopAll = useCallback(() => {
    Object.keys(nodes.current).forEach(id => stop(id));
  }, [stop]);

  const setVolume = useCallback((soundId, volume) => {
    const node = nodes.current[soundId];
    if (!node) return;
    const ctx = getCtx();
    node.gainNode.gain.setTargetAtTime(volume, ctx.currentTime, 0.1);
  }, []);

  const setMasterVolume = useCallback((vol) => {
    masterVol.current = vol;
    if (masterGain.current && audioCtx.current) {
      masterGain.current.gain.setTargetAtTime(vol, audioCtx.current.currentTime, 0.1);
    }
  }, []);

  // Apply a full mix object { soundId: volume, ... }, fading in new, fading out removed
  const applyMix = useCallback((mix) => {
    const incoming = new Set(Object.keys(mix));
    const current  = new Set(Object.keys(nodes.current));
    current.forEach(id => { if (!incoming.has(id)) stop(id); });
    incoming.forEach(id => {
      if (current.has(id)) {
        setVolume(id, mix[id]);
      } else {
        play(id, mix[id]);
      }
    });
  }, [play, stop, setVolume]);

  return { play, stop, stopAll, setVolume, setMasterVolume, applyMix };
}

// ── Preset helpers ────────────────────────────────────────

const PRESET_COLORS = [
  { id: 'ember',  label: 'Ember',  hex: '#d4622a' },
  { id: 'gold',   label: 'Gold',   hex: '#c9a84c' },
  { id: 'teal',   label: 'Teal',   hex: '#2a9d8f' },
  { id: 'violet', label: 'Violet', hex: '#7b5ea7' },
  { id: 'steel',  label: 'Steel',  hex: '#4a7fa5' },
  { id: 'moss',   label: 'Moss',   hex: '#4a7c59' },
];


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
          {Object.entries(AMBIENCE_SOUNDS).map(([cat, sounds]) => (
            <div key={cat} className="sound-category">
              <div className="sound-cat-label">{CATEGORY_LABELS[cat]}</div>
              <div className="sound-grid">
                {sounds.map(sound => {
                  const isActive = soundId => activeSounds.hasOwnProperty(soundId);
                  const active   = isActive(sound.id);
                  const vol      = activeSounds[sound.id] ?? 0.5;
                  return (
                    <div
                      key={sound.id}
                      className={`sound-tile ${active ? 'active' : ''}`}
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
          ))}
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

function PresetTile({ preset, onFire, onEdit, active, firing }) {
  const color = PRESET_COLORS.find(c => c.id === preset.color) || PRESET_COLORS[0];
  const ambLabel = preset.ambience && Object.keys(preset.ambience).length > 0
    ? Object.keys(preset.ambience)
        .map(id => ALL_SOUNDS.find(s => s.id === id)?.label ?? id)
        .join(', ')
    : null;

  return (
    <div
      className={`preset-tile ${active ? 'active' : ''} ${firing ? 'firing' : ''}`}
      style={{ '--tile-color': color.hex }}
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
          {preset.nanoleafScene && (
            <span className="tile-detail-row">
              <span className="tile-detail-icon">◈</span>
              <span className="tile-detail-text">{preset.nanoleafScene}</span>
            </span>
          )}
          {ambLabel && (
            <span className="tile-detail-row">
              <span className="tile-detail-icon">♬</span>
              <span className="tile-detail-text">{ambLabel}</span>
            </span>
          )}
          {!preset.playlistName && !preset.nanoleafScene && !ambLabel && (
            <span className="tile-detail-row tile-detail-empty">No actions set</span>
          )}
        </div>
        {firing && <div className="tile-firing-bar" />}
      </button>
      <button className="tile-edit-btn" onClick={() => onEdit(preset)} title="Edit preset">✎</button>
    </div>
  );
}

// ── AmbienceMixer (inside preset editor) ─────────────────

function AmbienceMixer({ mix, onChange }) {
  return (
    <div className="amb-mixer">
      {Object.entries(AMBIENCE_SOUNDS).map(([cat, sounds]) => (
        <div key={cat} className="amb-mixer-cat">
          <div className="amb-mixer-cat-label">{CATEGORY_LABELS[cat]}</div>
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

function PresetEditor({ preset, playlists, nanoleafScenes, onSave, onDelete, onClose }) {
  const [name,          setName]          = useState(preset?.name || '');
  const [color,         setColor]         = useState(preset?.color || 'ember');
  const [playlistId,    setPlaylistId]    = useState(preset?.playlistId || '');
  const [playlistUri,   setPlaylistUri]   = useState(preset?.playlistUri || '');
  const [playlistName,  setPlaylistName]  = useState(preset?.playlistName || '');
  const [nanoleafScene, setNanoleafScene] = useState(preset?.nanoleafScene || '');
  const [useSpotify,    setUseSpotify]    = useState(preset ? !!preset.playlistId : true);
  const [useNanoleaf,   setUseNanoleaf]   = useState(preset ? !!preset.nanoleafScene : true);
  const [useAmbience,   setUseAmbience]   = useState(preset ? !!(preset.ambience && Object.keys(preset.ambience).length) : false);
  const [ambienceMix,   setAmbienceMix]   = useState(preset?.ambience || {});

  const handlePlaylistChange = (e) => {
    const pl = playlists.find(p => p.id === e.target.value);
    if (pl) { setPlaylistId(pl.id); setPlaylistUri(pl.uri); setPlaylistName(pl.name); }
    else    { setPlaylistId(''); setPlaylistUri(''); setPlaylistName(''); }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id:           preset?.id || Date.now().toString(),
      name:         name.trim(),
      color,
      playlistId:   useSpotify ? playlistId : '',
      playlistUri:  useSpotify ? playlistUri : '',
      playlistName: useSpotify ? playlistName : '',
      nanoleafScene: useNanoleaf ? nanoleafScene : '',
      ambience:     useAmbience ? ambienceMix : {},
    });
  };

  return (
    <div className="editor-overlay">
      <div className="editor-modal">
        <div className="editor-header">
          <h3>{preset ? 'Edit Preset' : 'New Preset'}</h3>
          <button className="editor-close" onClick={onClose}>✕</button>
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
          <div className="editor-field">
            <label>Colour</label>
            <div className="color-row">
              {PRESET_COLORS.map(c => (
                <button
                  key={c.id}
                  className={`color-swatch ${color === c.id ? 'selected' : ''}`}
                  style={{ '--swatch': c.hex }}
                  onClick={() => setColor(c.id)}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="editor-section">
            <div className="editor-section-header">
              <label className="toggle-label">
                <input type="checkbox" checked={useSpotify} onChange={e => setUseSpotify(e.target.checked)} />
                <span>Spotify Playlist</span>
              </label>
            </div>
            {useSpotify && (
              playlists.length > 0
                ? <select className="editor-select" value={playlistId} onChange={handlePlaylistChange}>
                    <option value="">— Select a playlist —</option>
                    {playlists.map(p => <option key={p.id} value={p.id}>{p.name} ({p.total} tracks)</option>)}
                  </select>
                : <p className="editor-hint">Connect Spotify first to assign a playlist.</p>
            )}
          </div>

          <div className="editor-section">
            <div className="editor-section-header">
              <label className="toggle-label">
                <input type="checkbox" checked={useNanoleaf} onChange={e => setUseNanoleaf(e.target.checked)} />
                <span>Nanoleaf Scene</span>
              </label>
            </div>
            {useNanoleaf && (
              nanoleafScenes.length > 0
                ? <select className="editor-select" value={nanoleafScene} onChange={e => setNanoleafScene(e.target.value)}>
                    <option value="">— Select a scene —</option>
                    {nanoleafScenes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                : <p className="editor-hint">Add a Nanoleaf device first, or save and assign a scene later.</p>
            )}
          </div>

          <div className="editor-section">
            <div className="editor-section-header">
              <label className="toggle-label">
                <input type="checkbox" checked={useAmbience} onChange={e => setUseAmbience(e.target.checked)} />
                <span>Ambient Mix</span>
              </label>
            </div>
            {useAmbience && (
              <AmbienceMixer mix={ambienceMix} onChange={setAmbienceMix} />
            )}
          </div>
        </div>
        <div className="editor-footer">
          {preset && (
            <button className="editor-btn danger" onClick={() => onDelete(preset.id)}>Delete</button>
          )}
          <div className="editor-footer-right">
            <button className="editor-btn" onClick={onClose}>Cancel</button>
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

export default function SceneControl() {
  const [spotifyAuth,     setSpotifyAuth]     = useState(false);
  const [nanoleafDevices, setNanoleafDevices] = useState([]);
  const [playlists,       setPlaylists]       = useState([]);
  const [nanoleafScenes,  setNanoleafScenes]  = useState([]);
  const [currentTrack,    setCurrentTrack]    = useState(null);
  const [activePreset,    setActivePreset]    = useState(null);
  const [firingPreset,    setFiringPreset]    = useState(null);
  const [presets,         setPresets]         = useState([]);
  const [editing,         setEditing]         = useState(null);
  const [showNLManager,   setShowNLManager]   = useState(false);
  const [loading,         setLoading]         = useState('');
  const [error,           setError]           = useState('');

  // Ambience state: { soundId: volume (0-1) }
  const [activeSounds, setActiveSounds] = useState({});
  const [masterVol,    setMasterVolState] = useState(0.7);

  const engine = useAmbienceEngine();

  const isElectron    = !!window.electronAPI;
  const nanoleafReady = nanoleafDevices.length > 0;

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
      if (sAuth)           fetchPlaylists();
      if (devices?.length) fetchNanoleafScenes();
    })();
  }, [isElectron]);

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

  const fetchPlaylists     = async () => { const r = await window.electronAPI.spotify.getPlaylists();    if (r.success) setPlaylists(r.data); };
  const fetchNanoleafScenes = async () => { const r = await window.electronAPI.nanoleaf.getScenes();    if (r.success) setNanoleafScenes(r.data); };
  const handleSpotifyAuth  = async () => {
    setLoading('spotify');
    const res = await window.electronAPI.spotify.authorize();
    if (res.success) { setSpotifyAuth(true); fetchPlaylists(); }
    else setError('Spotify auth failed: ' + res.error);
    setLoading('');
  };

  const pollTrack = async () => {
    const res = await window.electronAPI.spotify.currentTrack();
    if (res.success) setCurrentTrack(res.data);
  };

  const handleResume   = async () => { await window.electronAPI.spotify.resume();   setTimeout(pollTrack, 300); };
  const handlePause    = async () => { await window.electronAPI.spotify.pause();    setTimeout(pollTrack, 300); };
  const handlePrevious = async () => { await window.electronAPI.spotify.previous(); setTimeout(pollTrack, 1200); };
  const handleSkip     = async () => { await window.electronAPI.spotify.skip();     setTimeout(pollTrack, 1200); };

  const handleNLAdd    = async (ip, port, label) => {
    const res = await window.electronAPI.nanoleaf.setup(ip, port, label);
    if (res.success) { const d = await window.electronAPI.nanoleaf.getDevices(); setNanoleafDevices(d || []); fetchNanoleafScenes(); }
    return res;
  };
  const handleNLRemove = async (id) => { await window.electronAPI.nanoleaf.removeDevice(id); const d = await window.electronAPI.nanoleaf.getDevices(); setNanoleafDevices(d || []); };
  const handleNLVerify = async (id) => window.electronAPI.nanoleaf.verifyDevice(id);

  // Ambience controls
  const handleSoundToggle = useCallback((soundId, currentVol) => {
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

    // Spotify + Nanoleaf
    if (!isElectron) { setFiringPreset(null); return; }
    const actions = [];
    if (preset.playlistUri)   actions.push(window.electronAPI.spotify.play(preset.playlistUri));
    if (preset.nanoleafScene) actions.push(window.electronAPI.nanoleaf.setScene(preset.nanoleafScene));
    if (actions.length) {
      const results  = await Promise.all(actions);
      const hardFail = results.find(r => !r.success);
      if (hardFail) setError(hardFail.error);
      else {
        const partial = results.find(r => r.success && r.partialErrors?.length);
        if (partial) setError('⚠ Partial: ' + partial.partialErrors.join(', '));
      }
    }

    setFiringPreset(null);
    setTimeout(pollTrack, 1000);
  }, [engine, isElectron]);

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
          nanoleafScenes={nanoleafScenes}
          onSave={savePreset}
          onDelete={deletePreset}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
