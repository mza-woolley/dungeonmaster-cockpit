import React, { useState, useEffect } from 'react';
import './Miro.css';

const STORAGE_KEY = 'dmcockpit:miro-board-url';

export default function Miro() {
  const [url, setUrl] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [input, setInput] = useState(url);
  const [editing, setEditing] = useState(!url);

  useEffect(() => {
    if (!url) setEditing(true);
  }, [url]);

  const save = () => {
    const trimmed = input.trim();
    setUrl(trimmed);
    localStorage.setItem(STORAGE_KEY, trimmed);
    setEditing(false);
  };

  return (
    <div className="miro-panel">
      {editing ? (
        <div className="miro-setup">
          <p>Paste your Miro board URL or embed URL:</p>
          <input
            className="miro-url-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            placeholder="https://miro.com/app/board/..."
            autoFocus
          />
          <button className="miro-save-btn" onClick={save}>Load Board</button>
        </div>
      ) : (
        <>
          <iframe
            className="miro-frame"
            src={url}
            title="Miro Board"
            allowFullScreen
          />
          <button className="miro-change-btn" onClick={() => { setInput(url); setEditing(true); }}>
            Change Board
          </button>
        </>
      )}
    </div>
  );
}
