import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Documentation.css';

const api = window.electronAPI?.docs;

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function prettifyName(filename) {
  return filename.replace(/\.md$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Removes a node (and therefore its subtree) from a tree — used to stop a folder
// being moved into itself or one of its own descendants.
function pruneTree(nodes, excludePath) {
  return nodes.reduce((acc, node) => {
    if (node.path === excludePath) return acc;
    if (node.type === 'folder') {
      acc.push({ ...node, children: pruneTree(node.children || [], excludePath) });
    } else {
      acc.push(node);
    }
    return acc;
  }, []);
}

function getAllFolderPaths(nodes) {
  const paths = [];
  for (const node of nodes) {
    if (node.type === 'folder') {
      paths.push(node.path);
      paths.push(...getAllFolderPaths(node.children || []));
    }
  }
  return paths;
}

// matchPaths: Set of file paths from content search, or null for name-only filter
function filterTree(nodes, query, matchPaths) {
  if (!query) return nodes;
  const q = query.toLowerCase();
  return nodes.reduce((acc, node) => {
    if (node.type === 'folder') {
      const filteredChildren = filterTree(node.children || [], q, matchPaths);
      if (filteredChildren.length) acc.push({ ...node, children: filteredChildren });
    } else if (matchPaths ? matchPaths.has(node.path) : prettifyName(node.name).toLowerCase().includes(q)) {
      acc.push(node);
    }
    return acc;
  }, []);
}

// Memoized so ReactMarkdown doesn't remount it on every draft keystroke
const DocImage = React.memo(function DocImage({ src, alt }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!src) return;
    setDataUrl(null);
    setErrored(false);
    api.readImage(src).then(res => {
      if (res.success) setDataUrl(res.dataUrl);
      else setErrored(true);
    });
  }, [src]);

  if (errored) return <span className="doc-img-error">[Image not found: {src}]</span>;
  if (!dataUrl)  return <span className="doc-img-loading">Loading image…</span>;
  return <img src={dataUrl} alt={alt || ''} className="doc-img" />;
});

// Portal-based context menu — bypasses panel CSS transform stacking context
function ContextMenu({ x, y, isFolder, onNewFile, onNewFolder, onRename, onMove, onDelete, onClose }) {
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [onClose]);

  const menuW = 160, menuH = isFolder ? 148 : 108;
  const left = x + menuW > window.innerWidth  ? x - menuW : x;
  const top  = y + menuH > window.innerHeight ? y - menuH : y;

  return ReactDOM.createPortal(
    <div ref={ref} className="ctx-menu" style={{ top, left }}>
      {isFolder && (
        <>
          <button onClick={onNewFile}>New Document</button>
          <button onClick={onNewFolder}>New Folder</button>
          <div className="ctx-divider" />
        </>
      )}
      <button onClick={onRename}>Rename</button>
      <button onClick={onMove}>Move to…</button>
      <button className="danger" onClick={onDelete}>Delete</button>
    </div>,
    document.body
  );
}

function TreeNode({ node, selectedPath, onSelect, expanded, onToggleExpand, onRename, onMove, onDelete, onNewFile, onNewFolder, depth }) {
  const [ctx, setCtx]           = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const renameRef = useRef();

  useEffect(() => { if (renaming && renameRef.current) renameRef.current.focus(); }, [renaming]);

  const openCtx = (e) => { e.preventDefault(); e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY }); };

  const startRename = () => {
    setCtx(null);
    setRenameVal(node.type === 'file' ? node.name.replace(/\.md$/, '') : node.name);
    setRenaming(true);
  };

  const commitRename = () => {
    if (renameVal.trim()) onRename(node.path, renameVal.trim(), node.type);
    setRenaming(false);
  };

  const isExpanded = expanded.has(node.path);
  const isSelected = selectedPath === node.path;

  return (
    <div className="tree-node">
      <div
        className={`tree-item ${node.type} ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={() => node.type === 'folder' ? onToggleExpand(node.path) : onSelect(node.path)}
        onContextMenu={openCtx}
      >
        {node.type === 'folder'
          ? <span className="tree-arrow">{isExpanded ? '▾' : '▸'}</span>
          : <span className="tree-file-dot" />
        }
        {renaming ? (
          <input
            ref={renameRef}
            className="tree-rename-input"
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false); }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="tree-label">{node.type === 'file' ? prettifyName(node.name) : node.name}</span>
        )}
      </div>

      {ctx && (
        <ContextMenu
          x={ctx.x} y={ctx.y}
          isFolder={node.type === 'folder'}
          onNewFile={() => { setCtx(null); onNewFile(node.path); }}
          onNewFolder={() => { setCtx(null); onNewFolder(node.path); }}
          onRename={startRename}
          onMove={() => { setCtx(null); onMove(node.path, node.name, node.type); }}
          onDelete={() => { setCtx(null); onDelete(node.path, node.type, node.name); }}
          onClose={() => setCtx(null)}
        />
      )}

      {node.type === 'folder' && isExpanded && (node.children || []).map(child => (
        <TreeNode
          key={child.path}
          node={child}
          selectedPath={selectedPath}
          onSelect={onSelect}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
          onRename={onRename}
          onMove={onMove}
          onDelete={onDelete}
          onNewFile={onNewFile}
          onNewFolder={onNewFolder}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

function Modal({ title, placeholder, onConfirm, onCancel, confirmLabel = 'Create', danger = false, body }) {
  const [val, setVal] = useState('');
  const inputRef = useRef();
  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  return (
    <div className="docs-overlay" onClick={onCancel}>
      <div className="docs-modal" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        {body && <p className="docs-modal-body">{body}</p>}
        {placeholder && (
          <input
            ref={inputRef}
            className="docs-modal-input"
            placeholder={placeholder}
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && val.trim()) onConfirm(val.trim());
              if (e.key === 'Escape') onCancel();
            }}
          />
        )}
        <div className="docs-modal-actions">
          <button className="docs-btn secondary" onClick={onCancel}>Cancel</button>
          <button
            className={`docs-btn ${danger ? 'danger' : 'primary'}`}
            onClick={() => onConfirm(val.trim())}
            disabled={placeholder ? !val.trim() : false}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FolderPickerNode({ node, selectedFolder, onSelect, depth = 0 }) {
  const [open, setOpen] = useState(depth === 0);
  const isSelected = selectedFolder === node.path;
  return (
    <div>
      <div
        className={`move-folder-item ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={() => { setOpen(o => !o); onSelect(node.path); }}
      >
        <span className="tree-arrow">{node.children?.length ? (open ? '▾' : '▸') : '·'}</span>
        <span>{node.name}</span>
      </div>
      {open && (node.children || []).filter(c => c.type === 'folder').map(child => (
        <FolderPickerNode key={child.path} node={child} selectedFolder={selectedFolder} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

function MoveModal({ fileName, fileType, sourcePath, tree, onConfirm, onCancel }) {
  const [selectedFolder, setSelectedFolder] = useState(null);

  // When moving a folder, it (and everything inside it) can't be a valid destination.
  const pickerTree = fileType === 'folder' ? pruneTree(tree, sourcePath) : tree;

  return (
    <div className="docs-overlay" onClick={onCancel}>
      <div className="docs-modal" onClick={e => e.stopPropagation()}>
        <h3>Move "{fileName.replace(/\.md$/, '')}"</h3>
        <p className="docs-modal-body">Select a destination folder:</p>
        <div className="move-folder-list">
          <div
            className={`move-folder-item ${selectedFolder === '__root__' ? 'selected' : ''}`}
            style={{ paddingLeft: 10 }}
            onClick={() => setSelectedFolder('__root__')}
          >
            <span className="tree-arrow">·</span>
            <span>/ (Root)</span>
          </div>
          {pickerTree.filter(n => n.type === 'folder').map(node => (
            <FolderPickerNode key={node.path} node={node} selectedFolder={selectedFolder} onSelect={setSelectedFolder} depth={0} />
          ))}
        </div>
        <div className="docs-modal-actions">
          <button className="docs-btn secondary" onClick={onCancel}>Cancel</button>
          <button className="docs-btn primary" disabled={!selectedFolder} onClick={() => onConfirm(selectedFolder)}>Move</button>
        </div>
      </div>
    </div>
  );
}

// Markdown formatting toolbox
const MD_TOOLS = [
  { label: 'B',   title: 'Bold',         wrap: ['**', '**'],       sample: 'bold text'    },
  { label: 'I',   title: 'Italic',       wrap: ['*', '*'],         sample: 'italic text'  },
  { label: 'H1',  title: 'Heading 1',    prefix: '# ',             sample: 'Heading'      },
  { label: 'H2',  title: 'Heading 2',    prefix: '## ',            sample: 'Heading'      },
  { label: 'H3',  title: 'Heading 3',    prefix: '### ',           sample: 'Heading'      },
  { label: '—',   title: 'Divider',      insert: '\n\n---\n\n'                             },
  { label: '❝',   title: 'Blockquote',   prefix: '> ',             sample: 'quote'        },
  { label: '•',   title: 'Bullet list',  prefix: '- ',             sample: 'list item'    },
  { label: '1.',  title: 'Numbered list',prefix: '1. ',            sample: 'list item'    },
  { label: '<>',  title: 'Inline code',  wrap: ['`', '`'],         sample: 'code'         },
  { label: '```', title: 'Code block',   wrap: ['```\n', '\n```'], sample: 'code block'   },
  { label: '🔗',  title: 'Link',         wrap: ['[', '](url)'],    sample: 'link text'    },
  { label: '▦',   title: 'Table',        insert: '\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell | Cell | Cell |\n' },
];

function MdToolbox({ textareaRef, draft, setDraft }) {
  const applyTool = (tool) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = draft.slice(start, end);
    let newDraft, cursorStart, cursorEnd;

    if (tool.insert) {
      newDraft    = draft.slice(0, start) + tool.insert + draft.slice(end);
      cursorStart = cursorEnd = start + tool.insert.length;
    } else if (tool.wrap) {
      const [before, after] = tool.wrap;
      const text = sel || tool.sample;
      newDraft    = draft.slice(0, start) + before + text + after + draft.slice(end);
      cursorStart = start + before.length;
      cursorEnd   = cursorStart + text.length;
    } else if (tool.prefix) {
      const lineStart = draft.lastIndexOf('\n', start - 1) + 1;
      const text = sel || tool.sample;
      newDraft    = draft.slice(0, lineStart) + tool.prefix + (sel ? draft.slice(lineStart, end) : text) + draft.slice(end);
      cursorStart = lineStart + tool.prefix.length;
      cursorEnd   = sel ? cursorStart + (end - lineStart) : cursorStart + text.length;
    }

    setDraft(newDraft);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = cursorStart;
      ta.selectionEnd   = cursorEnd;
    }, 0);
  };

  return (
    <div className="md-toolbox">
      {MD_TOOLS.map(tool => (
        <button
          key={tool.title}
          className="md-tool-btn"
          title={tool.title}
          onMouseDown={e => { e.preventDefault(); applyTool(tool); }}
        >
          {tool.label}
        </button>
      ))}
    </div>
  );
}

const LAST_DOC_KEY      = 'dmcockpit:docs:lastPath';
const EXPANDED_KEY      = 'dmcockpit:docs:expanded';

function loadExpanded() {
  try {
    const saved = JSON.parse(localStorage.getItem(EXPANDED_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

export default function Documentation() {
  const [tree, setTree]                 = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [doc, setDoc]                   = useState(null);
  const [editing, setEditing]           = useState(false);
  const [draft, setDraft]               = useState('');
  const [layout, setLayout]             = useState('toggle');
  const [expanded, setExpanded]         = useState(loadExpanded);
  const [search, setSearch]             = useState('');
  const [saving, setSaving]             = useState(false);
  const [modal, setModal]               = useState(null);
  const [confirmDel, setConfirmDel]     = useState(null);
  const [matchPaths, setMatchPaths]     = useState(null); // Set<path> from content search, null when idle
  const [searching, setSearching]       = useState(false);
  const [moveTarget, setMoveTarget]     = useState(null); // { path, name }
  const [error, setError]               = useState('');
  const [exporting, setExporting]       = useState(false);
  const [exportMsg, setExportMsg]       = useState('');
  const textareaRef = useRef();
  const searchTimer = useRef(null);

  const loadTree = useCallback(async () => {
    const res = await api.getTree();
    if (res.success) setTree(res.data);
  }, []);

  useEffect(() => { loadTree(); }, [loadTree]);

  // Reopen whatever document was open last time the app was running
  useEffect(() => {
    const lastPath = localStorage.getItem(LAST_DOC_KEY);
    if (lastPath) openFile(lastPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced content search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!search.trim()) { setMatchPaths(null); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const res = await api.search(search.trim());
      setMatchPaths(res.success ? new Set(res.paths) : null);
      setSearching(false);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const openFile = async (filePath) => {
    const res = await api.getFile(filePath);
    if (res.success) {
      setSelectedPath(filePath);
      setDoc(res.data);
      setEditing(false);
      setDraft('');
      try { localStorage.setItem(LAST_DOC_KEY, filePath); } catch {}
    }
  };

  const handleEdit   = () => { setDraft(doc.content || ''); setEditing(true); };
  const handleCancel = () => { setEditing(false); setDraft(''); };

  const handleSave = async () => {
    setSaving(true);
    const res = await api.saveFile(selectedPath, { ...doc, content: draft });
    if (res.success) {
      setDoc(prev => ({ ...prev, content: draft, modified: res.modified }));
      setEditing(false);
    }
    setSaving(false);
  };

  const toggleExpand = (folderPath) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(folderPath) ? next.delete(folderPath) : next.add(folderPath);
      try { localStorage.setItem(EXPANDED_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const handleRename = async (itemPath, newName, type) => {
    const res = await api.rename(itemPath, newName);
    if (!res?.success) { setError(res?.error || 'Rename failed'); return; }
    if (type === 'file' && itemPath === selectedPath) {
      setSelectedPath(null); setDoc(null);
      try { localStorage.removeItem(LAST_DOC_KEY); } catch {}
    }
    await loadTree();
  };

  const handleDelete = (itemPath, type, name) => setConfirmDel({ path: itemPath, type, name });

  const doDelete = async () => {
    const res = await api.delete(confirmDel.path);
    if (!res?.success) { setError(res?.error || 'Delete failed'); setConfirmDel(null); return; }
    if (confirmDel.path === selectedPath) {
      setSelectedPath(null); setDoc(null); setEditing(false);
      try { localStorage.removeItem(LAST_DOC_KEY); } catch {}
    }
    setConfirmDel(null);
    await loadTree();
  };

  const handleMove = (itemPath, name, type) => setMoveTarget({ path: itemPath, name, type });

  const doMove = async (destFolder) => {
    const dest = destFolder === '__root__' ? null : destFolder;
    const res = await api.move(moveTarget.path, dest);
    if (res.success) {
      if (moveTarget.type === 'file' && moveTarget.path === selectedPath) {
        setSelectedPath(res.newPath);
        await openFile(res.newPath);
      } else if (moveTarget.type === 'folder' && selectedPath?.startsWith(moveTarget.path + '/')) {
        // The open document lived inside the moved folder — its path is now stale.
        setSelectedPath(null);
        setDoc(null);
        setEditing(false);
        try { localStorage.removeItem(LAST_DOC_KEY); } catch {}
      }
      await loadTree();
    } else {
      setError(res.error || 'Move failed.');
    }
    setMoveTarget(null);
  };

  const handleNewFile   = (parentPath) => setModal({ type: 'file', parentPath });
  const handleNewFolder = (parentPath) => setModal({ type: 'folder', parentPath });

  const commitModal = async (val) => {
    if (modal.type === 'file') {
      const res = await api.createFile(modal.parentPath, val);
      if (res.success) {
        await loadTree();
        await openFile(res.filePath);
        setDraft(`# ${val}\n\n`);
        setEditing(true);
      }
    } else {
      await api.createFolder(modal.parentPath, val);
      await loadTree();
    }
    setModal(null);
  };

  const handleInsertImage = async () => {
    const pick = await api.pickImage();
    if (!pick.success) return;
    const imp = await api.importImage(pick.sourcePath);
    if (!imp.success) return;
    const snippet = `![](${imp.relativePath})`;
    const ta = textareaRef.current;
    if (ta) {
      const s = ta.selectionStart, e = ta.selectionEnd;
      setDraft(draft.slice(0, s) + snippet + draft.slice(e));
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + snippet.length; ta.focus(); }, 0);
    } else {
      setDraft(d => d + '\n' + snippet);
    }
  };

  const displayTree        = filterTree(tree, search, matchPaths);
  const expandedForDisplay = search ? new Set(getAllFolderPaths(displayTree)) : expanded;

  // Stable reference — prevents ReactMarkdown unmounting DocImage on every keystroke
  const mdComponents = useMemo(() => ({
    img: ({ src, alt }) => <DocImage src={src} alt={alt} />,
  }), []);

  return (
    <div className="docs-root">

      {error && (
        <div className="scene-error" style={{ gridColumn: '1 / -1' }}>
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside className="docs-sidebar">
        <div className="docs-sidebar-top">
          <input
            className={`docs-search ${searching ? 'docs-search--busy' : ''}`}
            placeholder="Search content…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="docs-sidebar-btns">
            <button className="docs-sbar-btn" title="New Document" onClick={() => handleNewFile(null)}>+ Doc</button>
            <button className="docs-sbar-btn" title="New Folder"   onClick={() => handleNewFolder(null)}>+ Folder</button>
            <button
              className="docs-sbar-btn"
              title="Export all docs to CAMPAIGN_MASTER.md"
              disabled={exporting}
              onClick={async () => {
                setExporting(true);
                setExportMsg('');
                const res = await api.exportMaster();
                setExporting(false);
                setExportMsg(res.success ? 'Exported.' : (res.error || 'Export failed.'));
                if (res.success) setTimeout(() => setExportMsg(''), 3000);
              }}
            >
              {exporting ? '…' : 'Export'}
            </button>
          </div>
        </div>
        {exportMsg && <div className="docs-export-msg">{exportMsg}</div>}

        <div className="docs-tree">
          {displayTree.length === 0 && (
            <div className="docs-tree-empty">
              {searching ? 'Searching…' : search ? 'No results.' : 'No documents yet.\nClick "+ Doc" to start.'}
            </div>
          )}
          {displayTree.map(node => (
            <TreeNode
              key={node.path}
              node={node}
              selectedPath={selectedPath}
              onSelect={openFile}
              expanded={expandedForDisplay}
              onToggleExpand={toggleExpand}
              onRename={handleRename}
              onMove={handleMove}
              onDelete={handleDelete}
              onNewFile={handleNewFile}
              onNewFolder={handleNewFolder}
              depth={0}
            />
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="docs-main">
        {!doc ? (
          <div className="docs-welcome">
            <div className="docs-welcome-icon">📚</div>
            <h2>Documentation</h2>
            <p>Select a document or create a new one.</p>
          </div>
        ) : (
          <>
            <div className="docs-toolbar">
              <div className="docs-toolbar-meta">
                <span className="docs-doc-title">{doc.title}</span>
                {doc.modified && <span className="docs-doc-date">Modified {formatDate(doc.modified)}</span>}
              </div>
              <div className="docs-toolbar-actions">
                {editing ? (
                  <>
                    <button className="docs-btn" onClick={handleInsertImage}>🖼 Image</button>
                    <button
                      className="docs-btn layout-toggle"
                      onClick={() => setLayout(l => l === 'toggle' ? 'split' : 'toggle')}
                      title={layout === 'toggle' ? 'Switch to split view' : 'Switch to full editor'}
                    >
                      {layout === 'toggle' ? '⧉ Split' : '☐ Full'}
                    </button>
                    <button className="docs-btn secondary" onClick={handleCancel}>Cancel</button>
                    <button className="docs-btn primary" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button className="docs-btn primary" onClick={handleEdit}>Edit</button>
                )}
              </div>
            </div>

            {editing && (
              <MdToolbox textareaRef={textareaRef} draft={draft} setDraft={setDraft} />
            )}

            <div className={`docs-body ${editing && layout === 'split' ? 'is-split' : ''}`}>
              {editing && (
                <textarea
                  ref={textareaRef}
                  className="docs-editor"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  spellCheck={false}
                />
              )}
              {(!editing || layout === 'split') && (
                <div className="docs-preview">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {editing ? draft : (doc.content || '')}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {modal && (
        <Modal
          title={modal.type === 'file' ? 'New Document' : 'New Folder'}
          placeholder={modal.type === 'file' ? 'Document title…' : 'Folder name…'}
          onConfirm={commitModal}
          onCancel={() => setModal(null)}
        />
      )}

      {moveTarget && (
        <MoveModal
          fileName={moveTarget.name}
          fileType={moveTarget.type}
          sourcePath={moveTarget.path}
          tree={tree}
          onConfirm={doMove}
          onCancel={() => setMoveTarget(null)}
        />
      )}

      {confirmDel && (
        <Modal
          title={`Delete ${confirmDel.type === 'folder' ? 'Folder' : 'Document'}?`}
          body={`"${confirmDel.name.replace(/\.md$/, '')}" will be permanently deleted${confirmDel.type === 'folder' ? ' along with all its contents' : ''}.`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDel(null)}
          confirmLabel="Delete"
          danger
        />
      )}
    </div>
  );
}
