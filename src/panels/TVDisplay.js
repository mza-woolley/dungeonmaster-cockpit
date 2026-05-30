import React, { useState, useEffect, useCallback, useRef } from 'react';
import './TVDisplay.css';

const FOLDER_KEY  = 'dm-cockpit-tv-folder';
const FILES_KEY   = 'dm-cockpit-tv-files';
const FAVS_KEY    = 'dm-cockpit-tv-favs';

function LazyTile({ file, active, thumb, faved, onPush, onFav, onVisible }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { onVisible(file.path); obs.disconnect(); }
    }, { rootMargin: '100px' });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [file.path, onVisible]);

  return (
    <div
      ref={ref}
      className={`tv-tile ${active ? 'active' : ''}`}
      onClick={() => onPush(file)}
    >
      <div className="tv-tile-thumb">
        {thumb && thumb !== 'loading'
          ? <img src={thumb} alt={file.name} />
          : <div className="tv-tile-placeholder">⏳</div>
        }
        {active && <div className="tv-tile-active-badge">On TV</div>}
      </div>
      <div className="tv-tile-footer">
        <span className="tv-tile-name" title={file.name}>{file.name}</span>
        <button
          className={`tv-fav-btn ${faved ? 'faved' : ''}`}
          onClick={e => { e.stopPropagation(); onFav(file.path); }}
          title={faved ? 'Remove from favourites' : 'Add to favourites'}
        >★</button>
      </div>
    </div>
  );
}

export default function TVDisplay() {
  const [folder, setFolder]       = useState(() => localStorage.getItem(FOLDER_KEY) || '');
  const [files, setFiles]         = useState(() => { try { return JSON.parse(localStorage.getItem(FILES_KEY) || '[]'); } catch { return []; } });
  const [favs, setFavs]           = useState(() => { try { return JSON.parse(localStorage.getItem(FAVS_KEY) || '[]'); } catch { return []; } });
  const [active, setActive]       = useState(null); // currently displayed path
  const [tvOpen, setTvOpen]       = useState(false);
  const [search, setSearch]       = useState('');
  const [showFavsOnly, setShowFavsOnly] = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [thumbs, setThumbs]       = useState({});   // path → dataUrl

  const isElectron = !!window.electronAPI;

  // Check if TV window is already open on mount
  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.tv.isOpen().then(setTvOpen);
  }, [isElectron]);

  const thumbQueue = useRef([]);
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
    if (thumbQueue.current.length === 0) { thumbWorking.current = false; return; }
    thumbWorking.current = true;
    const filePath = thumbQueue.current.shift();
    window.electronAPI.tv.thumbnail(filePath).then(res => {
      if (res.success) setThumbs(prev => ({ ...prev, [filePath]: res.dataUrl }));
      else             setThumbs(prev => { const n = { ...prev }; delete n[filePath]; return n; });
      drainQueue();
    });
  }

  const handlePickFolder = async () => {
    setLoading(true);
    setError('');
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
    if (res.success) setTvOpen(true);
    else setError(res.error);
  };

  const handleCloseTV = async () => {
    await window.electronAPI.tv.close();
    setTvOpen(false);
    setActive(null);
  };

  const handlePushImage = useCallback(async (file) => {
    if (!tvOpen) {
      await window.electronAPI.tv.open();
      setTvOpen(true);
    }
    const res = await window.electronAPI.tv.pushImage(file.path);
    if (res.success) setActive(file.path);
    else setError(res.error);
  }, [tvOpen]);

  const handleClear = async () => {
    await window.electronAPI.tv.clear();
    setActive(null);
  };

  const toggleFav = (filePath) => {
    setFavs(prev => {
      const next = prev.includes(filePath)
        ? prev.filter(f => f !== filePath)
        : [...prev, filePath];
      localStorage.setItem(FAVS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const filtered = files.filter(f => {
    if (showFavsOnly && !favs.includes(f.path)) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!isElectron) return (
    <div className="tv-panel">
      <div className="tv-notice"><p>Requires Electron app.</p></div>
    </div>
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
          {active && (
            <button className="tv-btn secondary" onClick={handleClear}>Clear Display</button>
          )}
          <button
            className={`tv-btn ${tvOpen ? 'danger' : 'primary'}`}
            onClick={tvOpen ? handleCloseTV : handleOpenTV}
          >
            {tvOpen ? '✕ Close TV' : '⎋ Open TV Window'}
          </button>
        </div>
      </div>

      {/* TV status */}
      <div className="tv-status-bar">
        <span className={`tv-status-dot ${tvOpen ? 'on' : 'off'}`} />
        <span className="tv-status-label">
          {tvOpen ? 'TV window open' : 'TV window closed'}
        </span>
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

      {/* ── No folder yet ── */}
      {files.length === 0 && (
        <div className="tv-empty">
          <div className="empty-icon">🗺️</div>
          <p>No maps loaded yet.</p>
          <p className="empty-hint">Select a folder containing your map images — JPG, PNG, WebP supported.</p>
          <button className="auth-btn" onClick={handlePickFolder}>Select Folder</button>
        </div>
      )}

      {/* ── Image grid ── */}
      {files.length > 0 && (
        <>
          {/* Filter bar */}
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
              title="Show favourites only"
            >
              ★ Favourites {favs.length > 0 && `(${favs.length})`}
            </button>
            <span className="tv-count">{filtered.length} map{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="tv-grid">
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
    </div>
  );
}
