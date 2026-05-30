# ⚔ DM Cockpit — Release Chronicle

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
