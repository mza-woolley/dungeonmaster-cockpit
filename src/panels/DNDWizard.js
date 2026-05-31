import React, { useState, useEffect, useRef, useCallback } from 'react';
import './DNDWizard.css';

// ── Message helpers ───────────────────────────────────────

function userMessage(text) {
  return { role: 'user', content: text, verified: null, matchType: null, sources: [], ts: Date.now() };
}

function assistantMessage(text, verified, matchType, sources) {
  return { role: 'assistant', content: text, verified, matchType, sources: sources || [], ts: Date.now() };
}

// ── Source badge ──────────────────────────────────────────

const SOURCE_LABELS = {
  spells:      'Spells',
  monsters:    'Monsters',
  conditions:  'Conditions',
  rules:       'Rules',
  items:       'Magic Items',
  weapons:     'Weapons',
  armor:       'Armor',
  classes:     'Classes',
  races:       'Races',
  backgrounds: 'Backgrounds',
  feats:       'Feats',
  planes:      'Planes',
  sections:    'Rules',
};

function SourceBadge({ category }) {
  return <span className="wizard-source-badge">{SOURCE_LABELS[category] || category}</span>;
}

// ── Verification badge ────────────────────────────────────

function VerifyBadge({ verified, matchType }) {
  if (!verified || matchType === 'none') {
    return (
      <span className="wizard-badge wizard-badge--unverified" title="Answer based on general D&D knowledge, not verified against the SRD">
        ⚠ General Knowledge
      </span>
    );
  }
  if (matchType === 'named') {
    return (
      <span className="wizard-badge wizard-badge--named" title="Answer sourced from exact SRD entry">
        ⚔ SRD Match
      </span>
    );
  }
  if (matchType === 'keyword') {
    return (
      <span className="wizard-badge wizard-badge--keyword" title="Answer sourced from SRD rules sections">
        📖 SRD Rules
      </span>
    );
  }
  if (matchType === 'both') {
    return (
      <span className="wizard-badge wizard-badge--both" title="Answer sourced from SRD entries and rules sections">
        ✦ SRD + Rules
      </span>
    );
  }
  return null;
}

// ── Chat message bubble ───────────────────────────────────

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`wizard-msg wizard-msg--${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="wizard-msg-meta">
          <VerifyBadge verified={msg.verified} matchType={msg.matchType} />
          {msg.sources && msg.sources.length > 0 && (
            <span className="wizard-sources">
              {msg.sources.map(s => <SourceBadge key={s} category={s} />)}
            </span>
          )}
        </div>
      )}
      <div className="wizard-msg-body">
        <FormattedAnswer text={msg.content} />
      </div>
    </div>
  );
}

// ── Markdown-ish formatter ────────────────────────────────

function FormattedAnswer({ text }) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="wizard-answer-body">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="wizard-spacer" />;

        const bulletMatch = line.match(/^(\s*)[•\-\*]\s+(.*)/);
        if (bulletMatch) {
          return (
            <div key={i} className="wizard-bullet">
              <span className="wizard-bullet-dot">◆</span>
              <span>{renderInline(bulletMatch[2])}</span>
            </div>
          );
        }

        const numMatch = line.match(/^(\s*)\d+\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={i} className="wizard-bullet">
              <span className="wizard-bullet-dot">◆</span>
              <span>{renderInline(numMatch[2])}</span>
            </div>
          );
        }

        const headMatch = line.match(/^#{1,3}\s+(.*)/);
        if (headMatch) {
          return <div key={i} className="wizard-subhead">{headMatch[1]}</div>;
        }

        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ── Typing indicator ──────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="wizard-msg wizard-msg--assistant">
      <div className="wizard-msg-meta">
        <span className="wizard-thinking">Consulting the tomes…</span>
      </div>
      <div className="wizard-typing">
        <span /><span /><span />
      </div>
    </div>
  );
}

// ── Setup notice ──────────────────────────────────────────

function SetupNotice({ reason, srdReady }) {
  const needsKey = reason && reason.includes('anthro.json');
  return (
    <div className="wizard-setup-notice">
      <div className="wizard-setup-icon">📜</div>
      {needsKey ? (
        <>
          <p className="wizard-setup-title">API Key Required</p>
          <p className="wizard-setup-body">Create <code>anthro.json</code> in the project root:</p>
          <pre className="wizard-setup-code">{'{\n  "ANTHROPIC_API_KEY": "sk-ant-…"\n}'}</pre>
          <p className="wizard-setup-body">Then restart DM Cockpit.</p>
        </>
      ) : !srdReady ? (
        <>
          <p className="wizard-setup-title">SRD Library Not Built</p>
          <p className="wizard-setup-body">Run this once to pull the full SRD from Open5e:</p>
          <pre className="wizard-setup-code">node scripts/build-srd-library.js</pre>
          <p className="wizard-setup-body">~30 seconds. The Wizard works without it but answers won't be SRD-verified.</p>
        </>
      ) : (
        <>
          <p className="wizard-setup-title">Setup Needed</p>
          <p className="wizard-setup-body">{reason}</p>
        </>
      )}
    </div>
  );
}

// ── Example questions ─────────────────────────────────────

const EXAMPLES = [
  'How does grappling work?',
  'What does the Poisoned condition do?',
  'Can I cast two spells in one turn?',
  'How do ability scores and modifiers work?',
  'What are the rules for concentration?',
  'How does cover affect attack rolls?',
];

// ── Main panel ────────────────────────────────────────────

export default function DNDWizard() {
  const [messages,  setMessages]  = useState([]);
  const [draft,     setDraft]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [status,    setStatus]    = useState(null);
  const scrollRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (!window.electronAPI?.wizard) {
      setStatus({ ready: false, reason: 'electronAPI not available — open via Electron, not a browser' });
      return;
    }
    window.electronAPI.wizard.ready().then(setStatus);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendQuestion = useCallback(async () => {
    const question = draft.trim();
    if (!question || loading) return;
    if (!window.electronAPI?.wizard) return;

    setDraft('');
    setMessages(prev => [...prev, userMessage(question)]);
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await window.electronAPI.wizard.chat(history, question);

      if (!res.success) {
        setMessages(prev => [...prev, assistantMessage(`⚠ Error: ${res.error}`, false, 'none', [])]);
      } else {
        setMessages(prev => [...prev, assistantMessage(res.answer, res.verified, res.matchType, res.sources)]);
      }
    } catch (err) {
      setMessages(prev => [...prev, assistantMessage(`⚠ Error: ${err.message}`, false, 'none', [])]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [draft, loading, messages]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    inputRef.current?.focus();
  };

  const notReady   = status && !status.ready;
  const srdMissing = status && status.ready && !status.srdReady;

  // Status line
  const statusLine = !status
    ? 'Initialising…'
    : !status.ready
    ? 'Setup required'
    : status.srdReady
    ? 'SRD loaded · AI powered'
    : 'SRD not built · general knowledge only';

  return (
    <div className="wizard-panel">
      {/* Header */}
      <div className="wizard-header">
        <div className="wizard-header-info">
          <span className="wizard-header-label">DND Wizard</span>
          <span className="wizard-header-sub">{statusLine}</span>
        </div>
        <div className="wizard-header-actions">
          {messages.length > 0 && (
            <button className="action-btn danger" onClick={clearConversation}>Clear</button>
          )}
        </div>
      </div>

      {/* Legend — only when SRD is ready */}
      {status?.srdReady && messages.length === 0 && (
        <div className="wizard-legend">
          <span className="wizard-badge wizard-badge--named">⚔ SRD Match</span>
          <span className="wizard-legend-sep">exact entity</span>
          <span className="wizard-badge wizard-badge--keyword">📖 SRD Rules</span>
          <span className="wizard-legend-sep">rules section</span>
          <span className="wizard-badge wizard-badge--both">✦ SRD + Rules</span>
          <span className="wizard-legend-sep">both</span>
          <span className="wizard-badge wizard-badge--unverified">⚠ General Knowledge</span>
          <span className="wizard-legend-sep">no SRD hit</span>
        </div>
      )}

      {/* Body */}
      <div className="wizard-scroll" ref={scrollRef}>
        {(notReady || srdMissing) && (
          <SetupNotice reason={status.reason} srdReady={status.srdReady} />
        )}

        {messages.length === 0 && !notReady && (
          <div className="wizard-empty">
            <div className="wizard-empty-icon">🧙</div>
            <p>Ask me anything about D&D 5e rules.</p>
            <p className="wizard-empty-hint">Spells · Conditions · Combat · Monsters · Classes · Items</p>
            <div className="wizard-examples">
              {EXAMPLES.map(q => (
                <button
                  key={q}
                  className="wizard-example-btn"
                  onClick={() => { setDraft(q); inputRef.current?.focus(); }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        {loading && <TypingIndicator />}
      </div>

      {/* Input */}
      <div className="wizard-input-wrap">
        <div className="wizard-input-icon">🧙</div>
        <textarea
          ref={inputRef}
          className="wizard-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask a rules question… (Enter to send)"
          rows={2}
          maxLength={1000}
          disabled={loading || notReady}
        />
        <button
          className={`wizard-send-btn ${draft.trim() && !loading ? 'ready' : ''}`}
          onClick={sendQuestion}
          disabled={!draft.trim() || loading || notReady}
          title="Ask the Wizard"
        >↵</button>
      </div>
    </div>
  );
}
