// src/App.js  —  v0.9.1  (NPCs tab added to Encounters)
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
import Miro from './panels/Miro';

const PANELS = [
  { id: 'characters',    label: 'Characters',   icon: '🧑', shortcut: '1' },
  { id: 'tv',            label: 'Display',      icon: '🗺️',  shortcut: '2' },
  { id: 'documentation', label: 'Docs',         icon: '📚', shortcut: '3' },
  { id: 'encounters',    label: 'Encounters',   icon: '⚔️',  shortcut: '4' },
  { id: 'generator',     label: 'Generator',    icon: '⚄',  shortcut: '5' },
  { id: 'miro',          label: 'Miro',         icon: '🗂️', shortcut: '6' },
  { id: 'scene',         label: 'Scene',        icon: '🎭', shortcut: '7' },
  { id: 'scribble',      label: 'Scribble',     icon: '✍️',  shortcut: '8' },
  { id: 'charsheet',     label: 'Sheets',       icon: '📜', shortcut: '9' },
  { id: 'wizard',        label: 'Wizard',       icon: '🧙', shortcut: '0' },
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

const LAST_TAB_KEY = 'dmcockpit:lastTab';

function getInitialTabIdx() {
  try {
    const saved = localStorage.getItem(LAST_TAB_KEY);
    const idx = PANELS.findIndex(p => p.id === saved);
    return idx >= 0 ? idx : 0;
  } catch {
    return 0;
  }
}

export default function App() {
  const [activeIdx, setActiveIdx] = useState(getInitialTabIdx);
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
    try { localStorage.setItem(LAST_TAB_KEY, PANELS[idx].id); } catch {}
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

  // Two-finger trackpad swipe — stable handler (registered once), navigateBy accessed via ref
  const navigateByRef = useRef(navigateBy);
  useEffect(() => { navigateByRef.current = navigateBy; }, [navigateBy]);
  // States: idle → active (fired) → draining (waiting for tail to die) → idle
  const gestureState = useRef('idle'); // 'idle' | 'active' | 'draining'
  const peakDeltaX   = useRef(0);
  const idleTimer    = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      const ax = Math.abs(e.deltaX);
      if (ax <= Math.abs(e.deltaY)) return;

      if (gestureState.current === 'active') {
        if (ax > peakDeltaX.current) peakDeltaX.current = Math.min(ax, 80);
        if (ax < peakDeltaX.current * 0.80) {
          gestureState.current = 'draining';
          peakDeltaX.current = 0;
        }
        return;
      }

      if (gestureState.current === 'draining') {
        // wait until momentum drops below this before accepting next swipe
        if (ax < 30) gestureState.current = 'idle';
        return;
      }

      // idle — wait for a real deliberate swipe
      if (ax < 60) return;
      gestureState.current = 'active';
      peakDeltaX.current = ax;

      // safety fallback in case stream never decays
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => { gestureState.current = 'idle'; peakDeltaX.current = 0; }, 600);

      navigateByRef.current(e.deltaX > 0 ? 1 : -1);
    };
    window.addEventListener('wheel', handler, { passive: true });
    return () => { window.removeEventListener('wheel', handler); clearTimeout(idleTimer.current); gestureState.current = 'idle'; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderPanel = (idx) => {
    switch (PANELS[idx]?.id) {
      case 'scribble':   return <Scribbleboard />;
      case 'scene':      return <SceneControl />;
      case 'tv':         return null; // rendered persistently below, outside the animated stage
      case 'encounters': return null; // rendered persistently below, so state survives tab switches
      case 'wizard':     return <DNDWizard />;
      case 'characters':    return <Characters />;
      case 'documentation': return null; // rendered persistently below, so edits survive tab switches
      case 'generator':     return <Generator />;
      case 'miro':          return null; // rendered persistently below
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
        {/* Display tab stays mounted across tab switches so its TV window / map editor persist */}
        <div className={`panel-slide panel-persistent ${PANELS[activeIdx]?.id === 'tv' ? 'settled' : 'hidden'}`}>
          <TVDisplay />
        </div>
        {/* Docs tab stays mounted across tab switches so in-progress edits aren't lost */}
        <div className={`panel-slide panel-persistent ${PANELS[activeIdx]?.id === 'documentation' ? 'settled' : 'hidden'}`}>
          <Documentation />
        </div>
        {/* Encounters tab stays mounted so initiative/state persists across tab switches */}
        <div className={`panel-slide panel-persistent ${PANELS[activeIdx]?.id === 'encounters' ? 'settled' : 'hidden'}`}>
          <Encounters />
        </div>
        {/* Miro tab stays mounted so the embedded board doesn't reload on tab switches */}
        <div className={`panel-slide panel-persistent ${PANELS[activeIdx]?.id === 'miro' ? 'settled' : 'hidden'}`}>
          <Miro />
        </div>
      </main>
    </div>
  );
}
