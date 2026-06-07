// src/App.js  —  v0.10  (NPCs tab added to Encounters)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import Scribbleboard from './panels/Scribbleboard';
import SceneControl from './panels/SceneControl';
import TVDisplay from './panels/TVDisplay';
import Encounters from './panels/Encounters';
import DNDWizard from './panels/DNDWizard';
import Characters from './panels/Characters';
import Documentation from './panels/Documentation';
import Generator from './panels/Generator';
import CharacterSheet from './panels/CharacterSheet';

const PANELS = [
  { id: 'characters',    label: 'Characters',   icon: '🧑', shortcut: '1' },
  { id: 'tv',            label: 'Display',      icon: '🗺️',  shortcut: '2' },
  { id: 'documentation', label: 'Docs',         icon: '📚', shortcut: '3' },
  { id: 'encounters',    label: 'Encounters',   icon: '⚔️',  shortcut: '4' },
  { id: 'generator',     label: 'Generator',    icon: '⚄',  shortcut: '5' },
  { id: 'scene',         label: 'Scene',        icon: '🎭', shortcut: '6' },
  { id: 'scribble',      label: 'Scribble',     icon: '✍️',  shortcut: '7' },
  { id: 'charsheet',     label: 'Sheets',       icon: '📜', shortcut: '8' },
  { id: 'wizard',        label: 'Wizard',       icon: '🧙', shortcut: '9' },
];

function useSessionClock() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const savedElapsed = useRef(0);
  const elapsedRef   = useRef(0);

  useEffect(() => {
    if (!running) return;
    const t0 = Date.now() - savedElapsed.current * 1000;
    const tick = setInterval(() => {
      const val = Math.floor((Date.now() - t0) / 1000);
      elapsedRef.current = val;
      setElapsed(val);
    }, 1000);
    return () => clearInterval(tick);
  }, [running, resetKey]);

  const toggle = () => {
    if (running) savedElapsed.current = elapsedRef.current;
    setRunning(r => !r);
  };

  const reset = () => {
    savedElapsed.current = 0;
    elapsedRef.current   = 0;
    setElapsed(0);
    setRunning(true);
    setResetKey(k => k + 1); // forces effect to re-run and clear the old interval
  };

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const display = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return { display, running, toggle, reset };
}

export default function App() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(null);
  const [direction, setDirection] = useState('right');
  const [animating, setAnimating] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const { display: clockDisplay, running: clockRunning, toggle: toggleClock, reset: resetClock } = useSessionClock();

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
      case 'scribble':   return <Scribbleboard />;
      case 'scene':      return <SceneControl />;
      case 'tv':         return <TVDisplay />;
      case 'encounters': return <Encounters />;
      case 'wizard':     return <DNDWizard />;
      case 'characters':    return <Characters />;
      case 'documentation': return <Documentation />;
      case 'generator':     return <Generator />;
      case 'charsheet':     return <CharacterSheet />;
      default:              return null;
    }
  };

  return (
    <div className="app" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Header */}
      <header className="app-header">
        <div className="header-sigil">⚔</div>
        <h1 className="header-title">DM Cockpit</h1>
        <div className="header-spacer" />
        <div className="session-clock">
          <button className="session-clock-toggle" onClick={toggleClock} title={clockRunning ? 'Pause timer' : 'Resume timer'}>
            {clockRunning ? '⏸' : '▶'}
          </button>
          <span className={`session-clock-display${clockRunning ? '' : ' paused'}`}>{clockDisplay}</span>
          <button className="session-clock-reset" onClick={resetClock} title="Reset session timer">↺</button>
        </div>
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
