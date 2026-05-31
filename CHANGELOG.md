# ⚔ DM Cockpit — Release Chronicle

---

## v0.6.1 — May 2026

### ⚔️ Initiative Tracker

- **PC initiative is now manual** — PC quick-add buttons no longer auto-roll; initiative starts at 0 and must be entered by hand
- **Roll All skips PCs** — the 🎲 Roll All button now only re-rolls monsters
- **Editable initiative column** — click any combatant's initiative number to edit it inline; field turns red if left empty, reverts to last valid value on blur
- **Monster HP fix** — custom monsters now correctly load their HP into the tracker when added from search

---

## v0.6 — The Documentation Update — May 2026

### 📚 New Panel: Documentation

- **Documentation hub** — full lore, session notes, and worldbuilding wiki built into the app; reads and writes local `.json` files under `documentation/`
- **Folder-based navigation** — sidebar mirrors the filesystem; create folders and docs from within the app
- **Markdown support** — full rendered markdown with GFM (tables, strikethrough, task lists); syntax-highlighted code blocks, styled blockquotes, and table formatting
- **Edit / read-only toggle** — documents open read-only; hit Edit to enter edit mode, Save to write back to disk, Cancel to discard
- **Split view** — toggle between full-width editor and side-by-side editor + live preview
- **Markdown toolbox** — one-click formatting buttons for Bold, Italic, H1–H3, Blockquote, Bullet list, Numbered list, Inline code, Code block, Link, Table, and Divider
- **Image support** — file picker copies images into `documentation/assets/`; large images cached and resized (max 1600px) in `userData` for performance
- **Auto-created on first launch** — `documentation/` and `documentation/assets/` created automatically; git-ignored so docs stay local to each machine
- **Search** — live filter across all document titles in the sidebar

### 🧹 Housekeeping

- **Google Docs integration removed** — IPC handlers, auth module, and preload entries cleaned up
- **README updated** — Google API key removed from setup table; keyboard shortcuts updated to reflect all 7 panels
- **Tab order** alphabetised: Characters, Display, Documentation, DND Wizard, Encounters, Scene, Scribble

---

## v0.5.3 — May 2026

### ✨ New Features

- **Session clock** — elapsed session timer in the app header; resets with a single click

### 🛠 Under the Hood

- **PC data single source** — initiative quick-add buttons now read from `characters.json` instead of a duplicate hardcoded list; updating a PC's HP or init modifier in one place reflects everywhere
- **Presets saved to disk** — scene presets moved from browser localStorage to `presets.json`; they now persist reliably across app reinstalls and cache clears
- **Spotify poll skips hidden window** — track polling pauses when the app window is not in focus, reducing idle API calls
- **Karma save debounce** — rapid karma adjustments are batched into a single disk write after a short pause instead of writing on every click

---

## v0.5.2 — May 2026

### ✨ QoL Improvements

- **Ambient sound order** — sounds within each category (Nature, Creatures, Atmosphere) now listed alphabetically
- **NPC sort** — NPCs tab has an A–Z / Karma sort toggle
- **Initiative: duplicate combatant** — ⧉ button on each combatant row clones it with the same initiative
- **Initiative: stat block pop-out** — clicking a monster name opens its stat block in a separate floating window, draggable anywhere on screen
- **Draggable header** — app header can be used to drag the main window (Mac)

---

## v0.5.1 — May 2026

### 🛠 Map Overlay — Bug Fixes & Performance

- **Live fog brush** — brush strokes now sync to TV display in real time during painting, not just on mouse release
- **Brush cursor** — custom canvas cursor shows exact brush radius; hidden system cursor replaced with double-ring indicator
- **Map canvas resolution** — DM editor now loads full-resolution map image immediately on open
- **Non-blocking fog sync** — mouseup fog reconciliation is now fully async, no thread block on release
- **Hardware acceleration** — GPU rasterization and accelerated 2D canvas enabled for Electron

---

## v0.5 — May 2026

### 🗺️ Map Overlay — Fog of War, Grid, Pins & Map States

- **Fog of War** — DM-side brush tool to reveal areas; DM sees a semi-transparent overlay, players see fully opaque fog; resets and reveal-all controls included
- **Grid Overlay** — toggleable grid with four sizes (Tiny / Small / Medium / Large) synced to the TV window
- **Pin System** — place PC, NPC and monster pins on the map via searchable dropdowns; two-letter monogram pins with name labels; per-pin hide toggle plus group hide for all NPCs or all monsters; pins suppressed by fog on the player display, always visible to the DM
- **Map States** — save and restore complete map setups (fog mask, pins, grid, visibility) as named presets, similar to music presets
- **TV Window upgraded** — canvas-based renderer handles fog, grid and pins natively; fog fully occludes pins on the player side
- **Monsters CR filter fix** — SRD monsters now display and filter correctly using fraction strings (1/4, 1/2) instead of decimals

---

## v0.4.1 — May 2026

### 🧑 Characters — Configurable Party & In-App PC Creation

- **characters.json** — hardcoded seed PCs moved out of `Characters.js` into a committed `characters.json` at the project root; configure your own party without touching code
- **Seed PC protection** — seeded PCs have no remove button; only in-app-added PCs can be deleted
- **PC Creation Form** — add new PCs directly in the Characters panel (name, class, species), mirroring the existing NPC form
- **`characters:loadSeed` IPC** — new handler + preload bridge to load the seed file at runtime

### 🧹 Housekeeping

- **`.gitignore` updated** — `karma.json`, `monsters.json`, `nanoleaf-config.json`, and the entire `srd-library/` directory are now ignored and untracked; runtime-generated data no longer pollutes the repo

---

## v0.4 — May 2026

### 🧑 New Panel: Characters

- **Characters Panel** — seventh panel added; tracks PCs and NPCs separately via sub-tabs
- **Karma System** — persistent `+/−` karma score per character with five tiers: Virtuous (>20), Good (>10), Neutral (±10), Bad (>-20), Darkness (≤-20); colour-coded gold/green/red
- **6 x PCs Pre-seeded** — Elaris Sol, Fenrik, Frah'nk, Kaelen Shadowsong, Plumbodian V, Wizzleforth Crankfoot auto-populated with name and race from character sheets
- **NPC Tracking** — freely add and remove NPCs with optional race/type field and full karma tracking
- **karma.json** — all data persisted locally via IPC

### ⚔ Encounters — Initiative & Monsters

- **Initiative Quick Setup** — one-click add buttons for all 6 PCs; auto-rolls `d20 + initiative modifier` and pre-fills max HP from character sheets; `+ All PCs` adds the full party at once
- **Monster Search in Initiative** — type to search all 3,207 SRD monsters plus custom monsters; results show CR, HP, and initiative modifier; clicking adds the monster with auto-rolled initiative (`d20 + DEX mod`) and correct HP
- **Initiative Modifiers Stored** — re-rolling all initiatives correctly applies each combatant's modifier rather than raw d20
- **PC Badge** — player characters shown with gold left border and `PC` tag in the tracker
- **SRD Monsters Local** — monster browser now reads from `srd-library/monsters.json` directly; Open5e API call and localStorage cache removed entirely
- **Custom Monsters in Search** — custom monsters merged with SRD results in both the browser and initiative search

### 🗺️ TV Display — Performance

- **Disk Thumbnail Cache** — thumbnails generated once and stored as small PNGs in `userData/thumb-cache/`; subsequent launches load from cache instead of re-processing full-resolution images
- **Lazy Loading** — thumbnails only generated for tiles currently visible on screen (`IntersectionObserver` with 100px lookahead); large map folders no longer block on load
- **Thumbnail Size** — reduced from 160px to 80px max dimension; resize quality set to `fast`

### 🪟 Platform & Navigation

- **Tab order** alphabetised: Characters, Display, DND Wizard, Encounters, Scene, Scribble
- **Notes tab removed**
- **Wizard tab renamed** to DND Wizard
- **wizard.js fix** — corrupted `loadIndex` function restored (missing variable declarations and function header caused uncaught exception on startup)

---

## v0.3 — May 2026

### 🧙 New Panel: DND Wizard

- **DND Wizard** — sixth panel added to the cockpit; a D&D 5e rules assistant chatbot powered by Claude Haiku
- **SRD Library Builder** — one-time script (`node scripts/build-srd-library.js`) pulls the full Open5e SRD and saves it locally as organised JSON files (`srd-library/spells.json`, `monsters.json`, `conditions.json`, `rules.json`, `items.json`, and more)
- **Two-stage Triage Engine** — named entity lookup (exact index match) runs first; a keyword map of ~100 rules concepts then matches things like "ability scores", "grappling", "concentration" to the relevant SRD sections — no API call needed until a question is sent
- **Four Verification Badges** — `⚔ SRD Match` (exact named entity), `📖 SRD Rules` (keyword → rules section), `✦ SRD + Rules` (both), `⚠ General Knowledge` (no SRD hit)
- **Source Badges** — each answer shows which SRD categories were used as context (Spells, Monsters, Conditions, Rules, etc.)
- **Conversation History** — follow-up questions supported; last 10 turns sent per request (token-budget conscious)
- **Example Questions** — empty state surfaces six quick-start prompts covering named entities and rules concepts
- **API Key** — stored in `anthro.json` at the project root (`{ "ANTHROPIC_API_KEY": "sk-ant-…" }`); setup notice shown in-panel if missing or SRD not built
- **Token Budget** — worst-case ~$0.0031/question; $5 covers 1,600+ questions even at maximum context load

### 🎭 Scene Control — Bug Fixes & Improvements

- **Spotify Resume** — play/pause button now correctly resumes paused playback (`PUT /play`) rather than always calling pause
- **Spotify Previous Track** — `⏮` back button added to the Now Playing bar
- **Nanoleaf Multi-Device** — config migrated from single flat object to `{ devices: [...] }` array; old `nanoleaf-config.json` auto-migrates on first load
- **Nanoleaf Device Manager** — "Manage" button replaces "Setup" once connected; add additional devices, verify reachability, and remove devices from a dedicated modal
- **Nanoleaf Essentials Fix** — B22/A19/NL75KI bulbs and strips now receive the correct `{ write: { command: "display", animName: "…" } }` payload; model auto-detected on pairing
- **Sequential Device Commands** — scene changes sent to multiple devices with an 80ms gap to prevent Essentials firmware dropping parallel PUT requests
- **Partial Error Surfacing** — if one device responds and another doesn't, the error bar shows which device failed rather than silent success
- **Preset Tiles** — wider tiles (280px min), playlist name and scene name visible directly on the tile, animated active pip, firing progress bar animation

### 🪟 Platform

- **Electron preload** — `spotify.resume`, `spotify.previous`, `nanoleaf.getDevices`, `nanoleaf.removeDevice`, `nanoleaf.updateLabel`, `nanoleaf.verifyDevice` all bridged

---

## v0.2 — May 2026

### ⚔ New Panel: Encounters

- **Encounters Panel** — fifth panel added to the cockpit
- **Monster Browser** — full SRD monster list via Open5e API, loads once on startup, filters instantly in memory
- **Search & Filter** — search by name, filter by CR and creature type simultaneously
- **Stat Block Viewer** — parchment-style stat blocks with full abilities, actions, and legendary actions
- **Custom Monster Creator** — build homebrew creatures from scratch with a full stat block editor
- **Clone from SRD** — copy any SRD monster as a custom base and modify freely
- **monsters.json** — all custom creatures saved locally to a single project-root JSON file
- **Initiative Tracker** — round counter, turn order, HP bars with +/− delta input for damage and healing

### 🗺️ TV Display

- **Thumbnail Generation** — 4K/8K map images now show low-res previews in the grid using Electron's `nativeImage` rather than loading full-res files
- **Progressive Loading** — tiles show a placeholder while thumbnails generate one-by-one in the background

### 🪟 Platform

- **Windows Launcher** — `.bat` + `.ps1` pair for one-click launch on Windows, matching the Mac `.command` workflow
- **Windows Setup Script** — checks nvm-windows, Node v20, dependencies, and credential files on first run

---

## v0.1 — May 2026

### ⚡ Core App

- **Electron + React Shell** — dark-themed desktop app with animated panel slides, swipe and keyboard shortcuts (`Arrow Left/Right`, `⌘1–4`, `⌘⇧D` global focus)
- **Mac Launcher** — one-click `.command` scripts for setup and launch, nvm-aware

### Four Panels

- **📜 Notes** — live Google Docs viewer with OAuth, renders your campaign doc in-app
- **✍️ Scribbleboard** — timestamped session notes, export to `.txt`, copy to clipboard, clear between sessions
- **🎭 Scene Control** — Spotify playback and Nanoleaf lighting presets in one panel
- **🗺️ TV Display** — push map images to a second screen, folder browser, favourites, search

---

*May your rolls be high and your TPKs few. ⚔*
