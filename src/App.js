// src/App.js  —  v0.3  (DND Wizard panel added as panel 6)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import Scribbleboard from './panels/Scribbleboard';
import Notes from './panels/Notes';
import SceneControl from './panels/SceneControl';
import TVDisplay from './panels/TVDisplay';
import Encounters from './panels/Encounters';
import DNDWizard from './panels/DNDWizard';   // ← NEW v0.3

const PANELS = [
  { id: 'notes',      label: 'Notes',      icon: '📜', shortcut: '1' },
  { id: 'scribble',   label: 'Scribble',   icon: '✍️',  shortcut: '2' },
  { id: 'scene',      label: 'Scene',      icon: '🎭', shortcut: '3' },
  { id: 'tv',         label: 'Display',    icon: '🗺️',  shortcut: '4' },
  { id: 'encounters', label: 'Encounters', icon: '⚔️',  shortcut: '5' },
  { id: 'wizard',     label: 'Wizard',     icon: '🧙', shortcut: '6' },  // ← NEW v0.3
];

export default function App() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(null);
  const [direction, setDirection] = useState('right');
  const [animating, setAnimating] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const navigateTo = useCallback((idx) => {
    if (idx === activeIdx || animating) return;
    setDirection(idx > activeIdx ? 'right' : 'left');
    setPrevIdx(activeIdx);
    setAnimating(true);
    setActiveIdx(idx);
    setTimeout(() => { setPrevIdx(null); setAnimating(false); }, 320);
  }, [activeIdx, animating]);

  const navigateBy = useCallback((delta) => {
    const next = (activeIdx + delta + PANELS.length) % PANELS.length;
    navigateTo(next);
  }, [activeIdx, navigateTo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') navigateBy(1);
      if (e.key === 'ArrowLeft')  navigateBy(-1);
      PANELS.forEach((p, i) => {
        if (e.key === p.shortcut && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          navigateTo(i);
        }
      });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigateBy, navigateTo]);

  // Touch/swipe support
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 60 && dy < 80) {
      navigateBy(dx < 0 ? 1 : -1);
    }
    touchStartX.current = null;
  };

  const renderPanel = (idx) => {
    switch (PANELS[idx]?.id) {
      case 'notes':      return <Notes />;
      case 'scribble':   return <Scribbleboard />;
      case 'scene':      return <SceneControl />;
      case 'tv':         return <TVDisplay />;
      case 'encounters': return <Encounters />;
      case 'wizard':     return <DNDWizard />;   // ← NEW v0.3
      default:           return null;
    }
  };

  return (
    <div className="app" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Header */}
      <header className="app-header">
        <div className="header-sigil">⚔</div>
        <h1 className="header-title">DM Cockpit</h1>
        <div className="header-spacer" />
      </header>

      {/* Nav */}
      <nav className="panel-nav">
        {PANELS.map((p, i) => (
          <button
            key={p.id}
            className={`nav-btn ${i === activeIdx ? 'active' : ''}`}
            onClick={() => navigateTo(i)}
          >
            <span className="nav-icon">{p.icon}</span>
            <span className="nav-label">{p.label}</span>
            <span className="nav-shortcut">⌘{p.shortcut}</span>
          </button>
        ))}
        <div
          className="nav-indicator"
          style={{
            width: `${100 / PANELS.length}%`,
            left: `${(activeIdx / PANELS.length) * 100}%`,
            transform: 'none',
          }}
        />
      </nav>

      {/* Panel stage */}
      <main className="panel-stage">
        {prevIdx !== null && (
          <div
            key={`prev-${prevIdx}`}
            className={`panel-slide exiting ${direction === 'right' ? 'exit-left' : 'exit-right'}`}
          >
            {renderPanel(prevIdx)}
          </div>
        )}
        <div
          key={`active-${activeIdx}`}
          className={`panel-slide ${animating ? (direction === 'right' ? 'entering-right' : 'entering-left') : 'settled'}`}
        >
          {renderPanel(activeIdx)}
        </div>
      </main>
    </div>
  );
}
