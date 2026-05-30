import React, { useState, useEffect, useCallback } from 'react';
import './Notes.css';

const HISTORY_KEY = 'dm-cockpit-doc-history';
const MAX_HISTORY = 8;

// Extract Doc ID from a URL or return raw string as-is
function extractDocId(input) {
  const trimmed = input.trim();
  const match = trimmed.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // Looks like a raw ID already (no slashes, reasonably long)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// ── Doc Content Renderers ──────────────────────────────────

function RenderRun({ run }) {
  let el = <>{run.text}</>;
  if (run.bold)      el = <strong>{el}</strong>;
  if (run.italic)    el = <em>{el}</em>;
  if (run.underline) el = <u>{el}</u>;
  return el;
}

function RenderBlock({ block }) {
  if (block.type === 'spacer')   return <div className="doc-spacer" />;
  if (block.type === 'heading')  return (
    <div className={`doc-heading doc-h${block.level}`}>{block.text}</div>
  );
  if (block.type === 'paragraph') return (
    <p className="doc-para">
      {block.runs.map((r, i) => <RenderRun key={i} run={r} />)}
    </p>
  );
  return null;
}

// ── Main Component ─────────────────────────────────────────

export default function Notes() {
  const [input, setInput]         = useState('');
  const [docId, setDocId]         = useState(null);
  const [docData, setDocData]     = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [history, setHistory]     = useState(loadHistory);
  const [showHistory, setShowHistory] = useState(false);

  const isElectron = !!window.electronAPI;

  // Check auth on mount
  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.isAuthorized().then(setAuthorized);
  }, [isElectron]);

  const handleAuthorize = async () => {
    setLoading(true);
    setError(null);
    const result = await window.electronAPI.authorize();
    if (result.success) {
      setAuthorized(true);
    } else {
      setError('Authorization failed: ' + result.error);
    }
    setLoading(false);
  };

  const loadDoc = useCallback(async (id, label) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setDocData(null);
    setActiveTab(0);
    setShowHistory(false);

    const result = await window.electronAPI.getDoc(id);
    if (result.success) {
      setDocData(result.data);
      setDocId(id);

      // Update history
      const entry = { id, label: label || result.data.title, loaded: Date.now() };
      setHistory(prev => {
        const filtered = prev.filter(h => h.id !== id);
        const next = [entry, ...filtered].slice(0, MAX_HISTORY);
        saveHistory(next);
        return next;
      });
    } else {
      setError('Failed to load doc: ' + result.error);
    }
    setLoading(false);
  }, []);

  const handleLoad = () => {
    const id = extractDocId(input);
    if (!id) {
      setError('Could not find a Doc ID in that URL. Try pasting the full Google Docs link.');
      return;
    }
    loadDoc(id);
  };

  const onInputKeyDown = (e) => {
    if (e.key === 'Enter') handleLoad();
  };

  // ── Not in Electron ──
  if (!isElectron) {
    return (
      <div className="notes-panel">
        <div className="notes-notice">
          <div className="notice-icon">⚡</div>
          <p>Google Docs integration requires the Electron app.</p>
          <p className="notice-hint">Run via <code>npm run electron</code> to use this panel.</p>
        </div>
      </div>
    );
  }

  // ── Auth screen ──
  if (!authorized) {
    return (
      <div className="notes-panel">
        <div className="notes-notice">
          <div className="notice-icon">🔑</div>
          <h3>Connect Google Docs</h3>
          <p>Authorize once and your docs load instantly every session.</p>
          <button className="auth-btn" onClick={handleAuthorize} disabled={loading}>
            {loading ? 'Opening browser…' : 'Authorize with Google'}
          </button>
          {error && <p className="notice-error">{error}</p>}
          <p className="notice-hint">
            Make sure <code>credentials.json</code> is in your <code>dm-cockpit</code> folder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="notes-panel">

      {/* ── Doc Loader Bar ── */}
      <div className="doc-loader">
        <div className="loader-input-wrap">
          <input
            className="doc-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onInputKeyDown}
            onFocus={() => setShowHistory(history.length > 0)}
            onBlur={() => setTimeout(() => setShowHistory(false), 150)}
            placeholder="Paste a Google Doc URL or Doc ID…"
            spellCheck={false}
          />
          <button className="load-btn" onClick={handleLoad} disabled={loading}>
            {loading ? '…' : 'Load'}
          </button>
        </div>

        {/* History dropdown */}
        {showHistory && (
          <div className="doc-history">
            <div className="history-label">Recent docs</div>
            {history.map(h => (
              <button
                key={h.id}
                className="history-item"
                onMouseDown={() => loadDoc(h.id, h.label)}
              >
                <span className="history-title">{h.label}</span>
                <span className="history-id">{h.id.slice(0, 20)}…</span>
              </button>
            ))}
          </div>
        )}

        {error && <div className="loader-error">{error}</div>}
      </div>

      {/* ── No doc loaded yet ── */}
      {!docData && !loading && (
        <div className="notes-empty">
          <div className="empty-icon">📜</div>
          <p>Paste a Google Doc link above to load your session notes.</p>
          <p className="empty-hint">Supports full URLs or raw Doc IDs.</p>
        </div>
      )}

      {loading && (
        <div className="notes-empty">
          <div className="loading-ring" />
          <p>Loading document…</p>
        </div>
      )}

      {/* ── Doc loaded ── */}
      {docData && (
        <div className="notes-body">

          {/* Tab bar */}
          {docData.tabs.length > 1 && (
            <div className="tab-bar">
              {docData.tabs.map((tab, i) => (
                <button
                  key={tab.id}
                  className={`tab-btn ${i === activeTab ? 'active' : ''}`}
                  onClick={() => setActiveTab(i)}
                >
                  {tab.title}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="doc-content">
            <div className="doc-title">{docData.title}</div>
            {docData.tabs[activeTab]?.content.map((block, i) => (
              <RenderBlock key={i} block={block} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
