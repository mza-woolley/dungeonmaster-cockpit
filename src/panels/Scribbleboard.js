import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Scribbleboard.css';

const STORAGE_KEY = 'dm-cockpit-scribble';

function timestamp() {
  const now = new Date();
  return now.toLocaleTimeString('en-AU', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
}

function datestamp() {
  return new Date().toLocaleDateString('en-AU', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

export default function Scribbleboard() {
  const [entries, setEntries] = useState([]);
  const [draft, setDraft] = useState('');
  const [sessionDate] = useState(datestamp());
  const [copyState, setCopyState] = useState('idle'); // 'idle' | 'ok' | 'err'
  const [cleared, setCleared] = useState(false);
  const [clearPending, setClearPending] = useState(false);
  const clearTimerRef = useRef(null);
  const logRef = useRef(null);
  const textareaRef = useRef(null);

  // Load from localStorage on mount; clean up pending timers on unmount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setEntries(JSON.parse(saved));
    } catch (_) {}
    textareaRef.current?.focus();
    return () => clearTimeout(clearTimerRef.current);
  }, []);

  // Persist on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (_) {}
  }, [entries]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries]);

  const commitEntry = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    setEntries(prev => [...prev, { id: Date.now(), time: timestamp(), text }]);
    setDraft('');
  }, [draft]);

  const onKeyDown = (e) => {
    if ((e.key === 'Enter') && !e.shiftKey) {
      e.preventDefault();
      commitEntry();
    }
  };

  const exportLog = () => {
    const header = `DM SESSION LOG\n${sessionDate}\n${'─'.repeat(40)}\n\n`;
    const body = entries.map(e => `[${e.time}]  ${e.text}`).join('\n');
    const full = header + body + '\n';
    const blob = new Blob([full], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-log-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLog = () => {
    const body = entries.map(e => `[${e.time}]  ${e.text}`).join('\n');
    navigator.clipboard.writeText(body)
      .then(() => { setCopyState('ok');  setTimeout(() => setCopyState('idle'), 2000); })
      .catch(() => { setCopyState('err'); setTimeout(() => setCopyState('idle'), 2000); });
  };

  const clearLog = () => {
    if (entries.length === 0) return;
    if (!clearPending) {
      setClearPending(true);
      clearTimerRef.current = setTimeout(() => setClearPending(false), 3000);
      return;
    }
    clearTimeout(clearTimerRef.current);
    setClearPending(false);
    setEntries([]);
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  return (
    <div className="scribble-panel">
      {/* Session header */}
      <div className="scribble-header">
        <div className="scribble-session-info">
          <span className="session-label">Session Log</span>
          <span className="session-date">{sessionDate}</span>
        </div>
        <div className="scribble-actions">
          <button className="action-btn" onClick={copyLog} title="Copy log">
            {copyState === 'ok' ? '✓ Copied' : copyState === 'err' ? '✕ Failed' : 'Copy'}
          </button>
          <button className="action-btn" onClick={exportLog} title="Export as .txt">
            Export
          </button>
          <button className="action-btn danger" onClick={clearLog} title={clearPending ? 'Click again to confirm' : 'Clear all entries'}>
            {cleared ? '✓ Cleared' : clearPending ? 'Sure?' : 'Clear'}
          </button>
        </div>
      </div>

      {/* Entry count */}
      <div className="entry-count">
        {entries.length === 0
          ? 'No entries yet — start writing below'
          : `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} this session`}
      </div>

      {/* Log */}
      <div className="scribble-log" ref={logRef}>
        {entries.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">✍️</div>
            <p>Your session notes will appear here.</p>
            <p className="empty-hint">Press <kbd>Enter</kbd> to commit an entry. <kbd>Shift+Enter</kbd> for a new line.</p>
          </div>
        )}
        {entries.map((entry, i) => (
          <div key={entry.id} className="log-entry" style={{ animationDelay: `${Math.min(i * 0.02, 0.3)}s` }}>
            <span className="entry-time">{entry.time}</span>
            <span className="entry-sep">—</span>
            <span className="entry-text">{entry.text}</span>
          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="scribble-input-wrap">
        <div className="input-prefix">✍</div>
        <textarea
          ref={textareaRef}
          className="scribble-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Note something down… (Enter to commit)"
          rows={2}
          maxLength={500}
        />
        <button
          className={`commit-btn ${draft.trim() ? 'ready' : ''}`}
          onClick={commitEntry}
          title="Commit entry"
        >
          ↵
        </button>
      </div>
    </div>
  );
}
