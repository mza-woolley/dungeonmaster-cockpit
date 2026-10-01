// Obsidian-style live-preview markdown editor.
//
// One pane, no modes: the document is always editable and always rendered.
// Markdown syntax (#, **, [](), ![]()) is hidden behind decorations and only
// revealed on the line the cursor is sitting on, so you edit the raw source of
// whatever you're touching while everything else stays formatted.
import React, { useEffect, useRef } from 'react';
import { EditorState, Compartment, StateField } from '@codemirror/state';
import { EditorView, Decoration, ViewPlugin, WidgetType, keymap } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxTree, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { tags as t } from '@lezer/highlight';
import './LiveMarkdownEditor.css';

const api = window.electronAPI?.docs;

// Images are read through IPC as data URLs; cache them so scrolling or typing
// doesn't re-read the same file off disk on every decoration rebuild.
const imageCache = new Map();

/* ── Widgets ───────────────────────────────────────────────────────────── */

class ImageWidget extends WidgetType {
  constructor(src, alt) { super(); this.src = src; this.alt = alt; }
  eq(other) { return other.src === this.src && other.alt === this.alt; }

  toDOM(view) {
    const wrap = document.createElement('span');
    wrap.className = 'cm-md-image';

    const render = (dataUrl) => {
      if (dataUrl === null) {
        wrap.textContent = `[Image not found: ${this.src}]`;
        wrap.classList.add('is-error');
        return;
      }
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = this.alt || '';
      // The widget's height is unknown until the bitmap decodes — tell CM to
      // re-measure once it has, or the lines below it sit at stale offsets.
      img.onload = () => view.requestMeasure();
      wrap.textContent = '';
      wrap.appendChild(img);
    };

    if (imageCache.has(this.src)) {
      render(imageCache.get(this.src));
    } else {
      wrap.textContent = 'Loading image…';
      wrap.classList.add('is-loading');
      api.readImage(this.src).then(res => {
        const val = res.success ? res.dataUrl : null;
        imageCache.set(this.src, val);
        wrap.classList.remove('is-loading');
        render(val);
      });
    }
    return wrap;
  }

  ignoreEvent() { return false; }
}

class BulletWidget extends WidgetType {
  eq() { return true; }
  toDOM() {
    const el = document.createElement('span');
    el.className = 'cm-md-bullet';
    el.textContent = '•';
    return el;
  }
}

class RuleWidget extends WidgetType {
  eq() { return true; }
  toDOM() {
    const el = document.createElement('span');
    el.className = 'cm-md-rule';
    return el;
  }
}

class TaskWidget extends WidgetType {
  constructor(checked, pos) { super(); this.checked = checked; this.pos = pos; }
  eq(other) { return other.checked === this.checked && other.pos === this.pos; }
  toDOM(view) {
    const el = document.createElement('span');
    el.className = `cm-md-task ${this.checked ? 'is-checked' : ''}`;
    el.textContent = this.checked ? '☑' : '☐';
    el.onmousedown = (e) => {
      e.preventDefault();
      if (view.state.readOnly) return;
      // The marker is "[ ]" / "[x]" — swap just the character between brackets.
      view.dispatch({
        changes: { from: this.pos + 1, to: this.pos + 2, insert: this.checked ? ' ' : 'x' },
      });
    };
    return el;
  }
  ignoreEvent() { return false; }
}

/* ── Tables ────────────────────────────────────────────────────────────── */

// A GFM table can't be both a real table and editable text in the same place, so
// it follows the lock: a locked document draws them properly, an unlocked one
// shows the pipes you need in order to change them.

// Splits "| a | b |" into cells, honouring \| escapes.
function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') { cur += '|'; i++; continue; }
    if (s[i] === '|') { cells.push(cur.trim()); cur = ''; continue; }
    cur += s[i];
  }
  cells.push(cur.trim());
  return cells;
}

const isDelimiterRow = (line) =>
  /^\s*\|?[\s:-]*\|[\s:|-]*$/.test(line) && /-/.test(line) && splitRow(line).every(c => /^:?-+:?$/.test(c));

function alignmentOf(cell) {
  const left = cell.startsWith(':'), right = cell.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return null;
}

// Minimal inline markdown for cell contents — enough that a stat table reads
// properly without pulling a second parser into the editor.
function renderInline(text, parent) {
  const pattern = /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3|~~(.+?)~~|`([^`]+)`|\[([^\]]*)\]\(([^)]+)\)/g;
  let last = 0, m;
  const push = (node) => parent.appendChild(node);
  while ((m = pattern.exec(text))) {
    if (m.index > last) push(document.createTextNode(text.slice(last, m.index)));
    let el;
    if (m[2] !== undefined)      { el = document.createElement('strong'); el.textContent = m[2]; }
    else if (m[4] !== undefined) { el = document.createElement('em');     el.textContent = m[4]; }
    else if (m[5] !== undefined) { el = document.createElement('del');    el.textContent = m[5]; }
    else if (m[6] !== undefined) { el = document.createElement('code');   el.textContent = m[6]; }
    else {
      el = document.createElement('span');
      el.className = 'cm-md-link';
      el.setAttribute('data-href', m[8].trim());
      el.textContent = m[7];
    }
    push(el);
    last = m.index + m[0].length;
  }
  if (last < text.length) push(document.createTextNode(text.slice(last)));
}

class TableWidget extends WidgetType {
  constructor(src) { super(); this.src = src; }
  eq(other) { return other.src === this.src; }

  toDOM() {
    const wrap = document.createElement('div');
    wrap.className = 'cm-md-table-render';

    const lines = this.src.split('\n').filter(l => l.trim());
    const delimIdx = lines.findIndex(isDelimiterRow);
    const aligns = delimIdx >= 0 ? splitRow(lines[delimIdx]).map(alignmentOf) : [];

    const table = document.createElement('table');
    const headRows = delimIdx > 0 ? lines.slice(0, delimIdx) : [];
    const bodyRows = delimIdx >= 0 ? lines.slice(delimIdx + 1) : lines;

    const addRow = (parent, line, cellTag) => {
      const tr = document.createElement('tr');
      splitRow(line).forEach((cell, i) => {
        const td = document.createElement(cellTag);
        if (aligns[i]) td.style.textAlign = aligns[i];
        renderInline(cell, td);
        tr.appendChild(td);
      });
      parent.appendChild(tr);
    };

    if (headRows.length) {
      const thead = document.createElement('thead');
      headRows.forEach(l => addRow(thead, l, 'th'));
      table.appendChild(thead);
    }
    if (bodyRows.length) {
      const tbody = document.createElement('tbody');
      bodyRows.forEach(l => addRow(tbody, l, 'td'));
      table.appendChild(tbody);
    }

    wrap.appendChild(table);
    return wrap;
  }

  ignoreEvent() { return false; }
}

// Block decorations that replace line breaks can't come from a view plugin, so
// the rendered tables live in their own state field.
function buildTables(state) {
  if (!state.readOnly) return Decoration.none;
  const decos = [];
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== 'Table') return;
      const from = state.doc.lineAt(node.from).from;
      const to   = state.doc.lineAt(node.to).to;
      const src  = state.doc.sliceString(from, to);
      if (!src.includes('|')) return;
      decos.push(
        Decoration.replace({ widget: new TableWidget(src), block: true }).range(from, to)
      );
      return false;
    },
  });
  return Decoration.set(decos, true);
}

const tableField = StateField.define({
  create: state => buildTables(state),
  update(value, tr) {
    if (tr.docChanged || tr.startState.readOnly !== tr.state.readOnly) return buildTables(tr.state);
    return value;
  },
  provide: f => EditorView.decorations.from(f),
});

// Pads every cell in the table under the cursor so the pipes line up — the raw
// source is what you edit, so it may as well be readable while you do.
export function alignTableAtCursor(view) {
  if (!view || view.state.readOnly) return false;
  const { state } = view;
  const cursorLine = state.doc.lineAt(state.selection.main.head).number;

  // Walk out from the cursor across contiguous lines that look like table rows.
  const isRow = (n) => n >= 1 && n <= state.doc.lines && state.doc.line(n).text.includes('|');
  if (!isRow(cursorLine)) return false;
  let first = cursorLine, last = cursorLine;
  while (isRow(first - 1)) first--;
  while (isRow(last + 1)) last++;

  const lines = [];
  for (let n = first; n <= last; n++) lines.push(state.doc.line(n).text);
  const delimIdx = lines.findIndex(isDelimiterRow);
  if (delimIdx < 0) return false;

  const rows    = lines.map(splitRow);
  const cols    = Math.max(...rows.map(r => r.length));
  const aligns  = rows[delimIdx].map(alignmentOf);
  const widths  = [];
  for (let c = 0; c < cols; c++) {
    widths[c] = Math.max(3, ...rows.map((r, i) => (i === delimIdx ? 0 : (r[c] || '').length)));
  }

  const rebuilt = rows.map((cells, i) => {
    const out = [];
    for (let c = 0; c < cols; c++) {
      if (i === delimIdx) {
        const a = aligns[c];
        const bar = '-'.repeat(widths[c] + (a === 'center' ? 0 : a ? 1 : 2));
        out.push(a === 'center' ? `:${bar}:` : a === 'right' ? `${bar}:` : a === 'left' ? `:${bar}` : bar);
      } else {
        out.push(' ' + (cells[c] || '').padEnd(widths[c]) + ' ');
      }
    }
    return `|${out.join('|')}|`;
  }).join('\n');

  view.dispatch({
    changes: { from: state.doc.line(first).from, to: state.doc.line(last).to, insert: rebuilt },
    scrollIntoView: true,
  });
  view.focus();
  return true;
}

/* ── Live preview decorations ──────────────────────────────────────────── */

// Marks whose only job is syntax — hidden unless the cursor is on their line.
const HIDDEN_MARKS = new Set([
  'EmphasisMark', 'StrikethroughMark', 'CodeMark', 'QuoteMark', 'LinkMark', 'LinkTitle',
]);

const HEADING_LINE = {
  ATXHeading1: 'cm-md-h1', ATXHeading2: 'cm-md-h2', ATXHeading3: 'cm-md-h3',
  ATXHeading4: 'cm-md-h4', ATXHeading5: 'cm-md-h5', ATXHeading6: 'cm-md-h6',
  SetextHeading1: 'cm-md-h1', SetextHeading2: 'cm-md-h2',
};

// Every line touched by a cursor or selection — syntax inside these stays raw
// so you can see and edit what you're actually working on.
function activeLines(view) {
  const set = new Set();
  if (view.state.readOnly) return set;
  for (const range of view.state.selection.ranges) {
    const first = view.state.doc.lineAt(range.from).number;
    const last  = view.state.doc.lineAt(range.to).number;
    for (let n = first; n <= last; n++) set.add(n);
  }
  return set;
}

function buildDecorations(view) {
  const { state } = view;
  const active = activeLines(view);
  const decos = [];
  // Only ranges standing in for something visible (an image, a rule, a checkbox)
  // are atomic. Hidden syntax must NOT be: it's zero-width, and making it atomic
  // pushes the caret out of ranges you legitimately want to click into.
  const atomic = [];

  // True when any part of [from,to] sits on a line the cursor is on.
  const isRevealed = (from, to) => {
    const first = state.doc.lineAt(from).number;
    const last  = state.doc.lineAt(to).number;
    for (let n = first; n <= last; n++) if (active.has(n)) return true;
    return false;
  };

  const hide = (from, to) => {
    if (to > from) decos.push(Decoration.replace({}).range(from, to));
  };

  for (const { from: vFrom, to: vTo } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from: vFrom,
      to: vTo,
      enter: (node) => {
        const name = node.name;

        // Block-level styling always applies — it's the formatting, not the syntax.
        if (HEADING_LINE[name]) {
          const line = state.doc.lineAt(node.from);
          decos.push(Decoration.line({ class: HEADING_LINE[name] }).range(line.from));
        } else if (name === 'Blockquote') {
          let pos = node.from;
          while (pos <= node.to) {
            const line = state.doc.lineAt(pos);
            decos.push(Decoration.line({ class: 'cm-md-quote' }).range(line.from));
            if (line.to >= node.to) break;
            pos = line.to + 1;
          }
        } else if (name === 'FencedCode' || name === 'CodeBlock') {
          let pos = node.from;
          while (pos <= node.to) {
            const line = state.doc.lineAt(pos);
            decos.push(Decoration.line({ class: 'cm-md-codeblock' }).range(line.from));
            if (line.to >= node.to) break;
            pos = line.to + 1;
          }
        } else if (name === 'Table') {
          if (state.readOnly) return false;   // replaced wholesale by tableField
          let pos = node.from;
          while (pos <= node.to) {
            const line = state.doc.lineAt(pos);
            decos.push(Decoration.line({ class: 'cm-md-table' }).range(line.from));
            if (line.to >= node.to) break;
            pos = line.to + 1;
          }
        }

        const revealed = isRevealed(node.from, node.to);

        // Images become the picture itself, replacing the whole ![](...).
        if (name === 'Image') {
          if (revealed) return;
          const text = state.doc.sliceString(node.from, node.to);
          const m = /^!\[([^\]]*)\]\(([^)]*)\)$/.exec(text);
          if (m) {
            const d = Decoration.replace({ widget: new ImageWidget(m[2].trim(), m[1]) }).range(node.from, node.to);
            decos.push(d);
            atomic.push(d);
            return false; // don't descend — the whole node is gone
          }
          return;
        }

        // Links keep their text, lose their brackets and target, and gain a
        // data-href the click handler reads.
        if (name === 'Link') {
          const text = state.doc.sliceString(node.from, node.to);
          const m = /^\[([^\]]*)\]\(([^)]*)\)$/.exec(text);
          if (m && !revealed) {
            const labelFrom = node.from + 1;
            const labelTo   = labelFrom + m[1].length;
            hide(node.from, labelFrom);
            if (labelTo > labelFrom) {
              decos.push(
                Decoration.mark({
                  class: 'cm-md-link',
                  attributes: { 'data-href': m[2].trim() },
                }).range(labelFrom, labelTo)
              );
            }
            hide(labelTo, node.to);
            return false;
          }
          return;
        }

        if (name === 'HorizontalRule') {
          if (revealed) return;
          const dRule = Decoration.replace({ widget: new RuleWidget() }).range(node.from, node.to);
          decos.push(dRule);
          atomic.push(dRule);
          return false;
        }

        if (name === 'TaskMarker') {
          if (revealed) return;
          const checked = /[xX]/.test(state.doc.sliceString(node.from, node.to));
          const dTask = Decoration.replace({ widget: new TaskWidget(checked, node.from) }).range(node.from, node.to);
          decos.push(dTask);
          atomic.push(dTask);
          return false;
        }

        if (revealed) return;

        if (name === 'HeaderMark') {
          // Hide the hashes and the space that follows them. A setext underline
          // is its own line, so leave it be rather than collapsing the line.
          const line = state.doc.lineAt(node.from);
          if (node.from !== line.from) return;
          let to = node.to;
          while (to < line.to && state.doc.sliceString(to, to + 1) === ' ') to++;
          hide(node.from, to);
          return;
        }

        if (name === 'ListMark') {
          const raw = state.doc.sliceString(node.from, node.to);
          // Ordered lists keep their numbers; bullets get a real bullet glyph.
          if (/^[-*+]$/.test(raw)) {
            decos.push(Decoration.replace({ widget: new BulletWidget() }).range(node.from, node.to));
          }
          return;
        }

        if (HIDDEN_MARKS.has(name)) {
          // A fenced code block's ``` lines are structure worth keeping visible.
          if (name === 'CodeMark' && state.doc.sliceString(node.from, node.to).startsWith('```')) return;
          hide(node.from, node.to);
        }
      },
    });
  }

  return { all: Decoration.set(decos, true), atomic: Decoration.set(atomic, true) };
}

const livePreview = (onLinkClick) => ViewPlugin.fromClass(
  class {
    constructor(view) { this.set(buildDecorations(view)); }
    set({ all, atomic }) { this.decorations = all; this.atomicRanges = atomic; }
    update(update) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.set(buildDecorations(update.view));
      }
    }
  },
  {
    decorations: v => v.decorations,
    provide: plugin => EditorView.atomicRanges.of(view => view.plugin(plugin)?.atomicRanges || Decoration.none),
    eventHandlers: {
      mousedown(e) {
        // Alt-click places the cursor inside link text instead of following it.
        if (e.altKey) return false;
        const el = e.target.closest?.('[data-href]');
        if (!el) return false;
        e.preventDefault();
        onLinkClick(el.getAttribute('data-href'));
        return true;
      },
    },
  }
);

/* ── Typography ────────────────────────────────────────────────────────── */

const mdHighlight = HighlightStyle.define([
  { tag: t.heading1, class: 'cm-tok-heading' },
  { tag: t.heading2, class: 'cm-tok-heading' },
  { tag: t.heading3, class: 'cm-tok-heading' },
  { tag: t.heading4, class: 'cm-tok-heading' },
  { tag: t.heading5, class: 'cm-tok-heading' },
  { tag: t.heading6, class: 'cm-tok-heading' },
  { tag: t.strong, class: 'cm-tok-strong' },
  { tag: t.emphasis, class: 'cm-tok-em' },
  { tag: t.strikethrough, class: 'cm-tok-strike' },
  { tag: t.monospace, class: 'cm-tok-code' },
  { tag: t.link, class: 'cm-tok-link' },
  { tag: t.url, class: 'cm-tok-url' },
  { tag: t.processingInstruction, class: 'cm-tok-mark' },
]);

/* ── Toolbox / command helpers (used by Documentation.js) ──────────────── */

// Applies a MD_TOOLS entry to the live editor, mirroring what the old textarea
// version did with selectionStart/selectionEnd.
export function applyMarkdownTool(view, tool) {
  if (!view) return;
  const { state } = view;
  const range = state.selection.main;
  const sel   = state.sliceDoc(range.from, range.to);

  if (tool.insert) {
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: tool.insert },
      selection: { anchor: range.from + tool.insert.length },
      scrollIntoView: true,
    });
  } else if (tool.wrap) {
    const [before, after] = tool.wrap;
    const text = sel || tool.sample || '';
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: before + text + after },
      selection: { anchor: range.from + before.length, head: range.from + before.length + text.length },
      scrollIntoView: true,
    });
  } else if (tool.prefix) {
    const line = state.doc.lineAt(range.from);
    const text = sel || tool.sample || '';
    if (sel) {
      view.dispatch({
        changes: { from: line.from, insert: tool.prefix },
        selection: { anchor: line.from + tool.prefix.length, head: range.to + tool.prefix.length },
        scrollIntoView: true,
      });
    } else {
      view.dispatch({
        changes: { from: line.from, to: range.to, insert: tool.prefix + text },
        selection: {
          anchor: line.from + tool.prefix.length,
          head: line.from + tool.prefix.length + text.length,
        },
        scrollIntoView: true,
      });
    }
  }
  view.focus();
}

export function insertAtCursor(view, snippet) {
  if (!view) return;
  const range = view.state.selection.main;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: snippet },
    selection: { anchor: range.from + snippet.length },
    scrollIntoView: true,
  });
  view.focus();
}

/* ── Component ─────────────────────────────────────────────────────────── */

// Locked is read-only rather than non-editable: the content stays selectable and
// copyable, and links and scrolling keep working — it just can't be changed.
const lockExtension = (locked) => [
  EditorState.readOnly.of(!!locked),
  EditorView.editable.of(!locked),
];

export default function LiveMarkdownEditor({ value, docKey, locked, onChange, onLinkClick, onSave, viewRef }) {
  const hostRef = useRef(null);
  const viewLocal = useRef(null);
  // Swapped in place when the lock toggles, so the editor isn't torn down and
  // rebuilt (which would lose scroll position and undo history).
  const lockComp = useRef(new Compartment());
  // Held in refs so the editor is built once per document rather than being
  // torn down whenever a parent render hands over a new callback identity.
  const cbRef = useRef({ onChange, onLinkClick, onSave });
  cbRef.current = { onChange, onLinkClick, onSave };
  // Tracks the lock state the current view was configured with, so the
  // reconfigure effect can tell a real toggle from a plain re-render.
  const lockedAtBuild = useRef(locked);

  useEffect(() => {
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value || '',
        extensions: [
          history(),
          lockComp.current.of(lockExtension(locked)),
          tableField,
          EditorView.lineWrapping,
          markdown({ base: markdownLanguage }),
          syntaxHighlighting(mdHighlight),
          livePreview(href => cbRef.current.onLinkClick?.(href)),
          keymap.of([
            { key: 'Mod-s', preventDefault: true, run: () => { cbRef.current.onSave?.(); return true; } },
            { key: 'Mod-b', run: (v) => { applyMarkdownTool(v, { wrap: ['**', '**'], sample: 'bold text' }); return true; } },
            { key: 'Mod-i', run: (v) => { applyMarkdownTool(v, { wrap: ['*', '*'], sample: 'italic text' }); return true; } },
            { key: 'Shift-Mod-t', run: alignTableAtCursor },
            indentWithTab,
            ...historyKeymap,
            ...defaultKeymap,
          ]),
          EditorView.updateListener.of(u => {
            if (u.docChanged) cbRef.current.onChange?.(u.state.doc.toString());
          }),
        ],
      }),
    });
    viewLocal.current = view;
    if (viewRef) viewRef.current = view;
    lockedAtBuild.current = locked;
    // An editor that is built already unlocked was opened to be written in
    // (a freshly created document) — put the cursor in it.
    if (!locked) view.focus();
    return () => {
      view.destroy();
      viewLocal.current = null;
      if (viewRef) viewRef.current = null;
    };
    // Rebuilt only when docKey changes. While a document is open the editor is the
    // source of truth for its text, so later `value` props are ignored on purpose —
    // syncing them back in would overwrite keystrokes typed during a save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey]);

  useEffect(() => {
    const view = viewLocal.current;
    if (!view || lockedAtBuild.current === locked) return;
    lockedAtBuild.current = locked;
    view.dispatch({ effects: lockComp.current.reconfigure(lockExtension(locked)) });
    if (!locked) view.focus();
  }, [locked]);

  return <div className={`docs-live-editor ${locked ? 'is-locked' : ''}`} ref={hostRef} />;
}
