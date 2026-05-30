# DM Cockpit

Your campaign control panel. Built with Electron + React.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (comes with Node)

---

## Setup (First Time)

```bash
# 1. Navigate into the project folder
cd dm-cockpit

# 2. Install dependencies
npm install

# 3. Start the React dev server (leave this terminal running)
npm start

# 4. In a NEW terminal, launch Electron
npm run electron
```

The app will open as a standalone window.

---

## Running After Setup

Every session needs two terminals:

**Terminal 1:**
```bash
npm start
```

**Terminal 2:**
```bash
npm run electron
```

Or use the combined command (may need wait-on installed):
```bash
npm run dev
```

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Navigate panels | Arrow Left / Right |
| Jump to Notes | Cmd/Ctrl + 1 |
| Jump to Scribble | Cmd/Ctrl + 2 |
| Jump to Scene | Cmd/Ctrl + 3 |
| Jump to Display | Cmd/Ctrl + 4 |
| Bring app to front (global) | Cmd/Ctrl + Shift + D |

---

## Scribbleboard

- Type a note and press **Enter** to commit
- **Shift+Enter** adds a new line within a note
- Every entry is auto-timestamped
- Notes persist between app restarts (saved to localStorage)
- Use **Export** to download a .txt session log
- Use **Copy** to copy the full log to clipboard
- Use **Clear** to wipe the board for a new session

---

## Phases

- [x] Phase 1 — Shell + Scribbleboard
- [ ] Phase 2 — Google Docs Notes panel
- [ ] Phase 3 — Spotify + Nanoleaf Scene Control
- [ ] Phase 4 — TV Map Display
