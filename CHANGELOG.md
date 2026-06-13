# ⚔ DM Cockpit — Release Chronicle

---

## v0.10.1 — June 2026

### 🔧 Changes

- Encounters: "Initiative" is now the default tab and sits in the middle of the tab order
- Table Display: revamped visuals — atmospheric vignette background, gold corner flourishes, pulsing glow on the active seat, a center round/turn emblem, redesigned HP bars, and condition icons
- Table Display: can now show a live map background (pins, fog, grid) behind the seat HUD, synced independently from the main Display tab

---

## v0.10.0 — The Huge Underrated Display Update — June 2026

### ✨ New

- Encounters: new **Table Display** pop-out — a second-monitor HUD that gives each of the 6 player seats their own live panel (name, HP bar, AC, initiative, conditions, and a "Your Turn" highlight), each oriented to read correctly from that seat around the table
- Encounters: "Table Seats" panel in the Initiative tab lets you assign each PC to a seat (Top Left/Right, Far Left/Right, DM Left/Right), saved automatically for future sessions
- Encounters: "Open/Close Table Display" toggle pops the HUD onto a secondary monitor, syncing live as combat state changes (HP, initiative, turn order, conditions)

---

## v0.9.7 — June 2026

### 🔧 Changes

- Documentation: files and folders can now be duplicated via the right-click menu

---

## v0.9.6 — June 2026

### 🔧 Changes

- App now remembers the last tab and last-open document (and expanded folders) across restarts
- Documentation: switching tabs no longer loses in-progress edits — the panel stays open in the background
- Documentation: folders can now be moved into other folders via "Move to…", not just individual documents

---

## v0.9.5 — June 2026

## v0.9.5 — June 2026

### 🔧 Changes

- TV Display: removed the NPC pin selector, which no longer pointed to a valid source
- TV Display: monster pin selector now includes both SRD monsters and custom monsters

---

## v0.9.4 — June 2026

### 🔧 Changes

- Scene: added a true straight red swatch to the lighting palette
- Scene: firing a preset now overwrites/kills the current ambience mix when the preset has no ambience of its own, instead of leaving the old mix playing
- Encounters: "Start Encounter" / "End Encounter" now correctly fire the selected scene preset's lights (and ambience/Spotify behaviour) the same way the Scene tab does, fixing a case where the lights wouldn't trigger

---

## v0.9.3 — June 2026

### ✨ New

- Scene: lighting colour picker replaced with a curated 20-swatch palette (sorted by hue) plus live preview, ensuring colours look consistent across both the Nanoleaf panels and the Pixie strip
- Scene: presets can now select "None" for music, which pauses playback when the preset fires
- TV Display: popping out the display now snaps it straight to your connected second monitor and fills the entire screen edge-to-edge
- TV Display: the panel now stays alive when you switch tabs — your loaded map, fog, pins, and TV window connection all persist instead of resetting

### 🔧 Changes

- Scene: lighting crossfade is now a fixed duration so the Nanoleaf and Pixie stay in sync instead of visibly drifting apart
- Scene: ambience crossfade (fade in/out) extended to 4 seconds
- Scene: "Kill Ambience" now stops all sounds instantly, fixing cases where ambience started from a preset could keep playing after pressing kill
- Lighting: simplified Pixie BLE pairing to use the confirmed credentials directly, and added automatic reconnect-and-retry if a command fails mid-send
- Scene: ambience volume sliders are now larger and easier to grab when toggling sounds in a preset
- TV Display: closing and reopening the TV window now correctly restores the map editor overlay, instead of showing a blank map until "Clear Display" was pressed

---

## v0.9.2 — June 2026

### ✨ New

- Generator: press spacebar to instantly re-roll the active table — no need to reach for the button
- Scene: click the lighting icon on any preset tile to preview just its light sequence, without opening the editor
- TV Display: "Quick Save" button overwrites your loaded map state in place — no need to retype a name
- TV Display: grid, fog, and pin settings are now remembered per map and auto-restored when you push it back to the TV

---

## v0.9.1 — June 2026

### ✨ New

- Encounters: new "NPCs" tab — create and manage your own custom NPCs with full stat blocks, separate from the SRD monster library
- Encounters: Initiative tracker can now search and add your custom NPCs alongside monsters when building an encounter

### 🔧 Changes

- TV Display: brush size preview ring now updates immediately when you adjust the brush slider
- TV Display: character pin movement syncs to the TV at a much higher rate for smoother on-screen dragging

---

## v0.9.0 — The Beyond Update — June 2026

### ✨ New

- New "Sheets" tab — pulls live character data straight from D&D Beyond and renders it as a native in-app sheet (no browser embedding required)
- Sheet view includes ability scores, saving throws, skills, AC, initiative, speed, HP, hit dice, proficiency bonus, passive perception, and senses/resistances/immunities/vulnerabilities where applicable
- Save multiple characters to a quick-switch sidebar list, with a one-click refresh to pull the latest data whenever your sheet changes
- Note: only works for characters set to "Public" visibility on D&D Beyond

---

## v0.8.6 — June 2026

### 🔧 Changes

- Characters: panel now lists Player Characters only — removed the NPC tab and the manual add-character form

---

## v0.8.5 — June 2026

### 🔧 Changes

- Encounters: combat tracker redesigned — combatants now display as compact status cards instead of a dense table
- Encounters: HP bar restyled into a fatter, Pokémon-style bar with bold readable HP/max text, and damage controls placed alongside it
- Encounters: added toggleable condition badges (Blinded, Poisoned, Prone, Stunned, etc.) on each combatant for quick status tracking mid-fight

---

## v0.8.4 — June 2026

### ✨ New

- Encounters: Initiative tab now supports saved Encounter Presets — build a roster of PCs/monsters, save it by name, and load it again whenever that fight comes up
- Encounters: Initiative tab reorganised into clear sections (Encounter Presets, Build Encounter, Combat Controls) so the workflow follows how a session actually plays out — load/build first, then run combat

### 🔧 Changes

- Encounters: monster search is now the primary way to add combatants — made larger and more prominent
- Encounters: removed the manual/custom combatant-add fields to keep the tracker focused
- Nav bar tabs now stretch evenly to fill available width

---

## v0.8.3 — June 2026

### ✨ New

- Scene: custom lighting sequences — define ordered colour stops per preset, each with individual crossfade duration and brightness
- Scene: sequences loop continuously until a new preset fires or is manually stopped
- Scene: in-app animated preview square shows the sequence before pushing to lights
- Scene: "Push Live" button in editor sends sequence to devices without saving
- Scene: Nanoleaf and Table Light now driven by the same unified sequence — one setup, both devices

### 🔧 Changes

- Scene: removed Nanoleaf scene selector — replaced entirely by custom sequences
- Scene: removed single table light colour field — replaced by sequences
- Scene: preset editor toggles replaced with accordion-style expand/collapse sections
- Scene: ambience panel flattened to a single compact grid, category rows removed

---

## v0.8.2 — June 2026

### 🔒 Security

- General app hardening improvements

---

## v0.8.1 — June 2026

### 🐛 Fixes

- Encounters: Start/End Encounter presets now fire ambience and table light, not just Spotify and Nanoleaf
- Encounters: removing a combatant no longer resets the turn to the top of the order
- Encounters: deleting a custom monster now shows an error if it fails
- TV Display: fog of war now restores correctly when loading a saved map state with a different map
- Characters: add form clears when switching between PC and NPC tabs
- Scribble: copy button now shows a failure state if clipboard access is denied
- Docs: rename, delete, and move failures now show inline errors instead of silent failures or browser popups
- Generator: roll flash animation now reliably plays every time
- Scene: Table Light On/Off buttons now show loading state and surface errors
- Pixie: BLE native module rebuilt for Electron — fixes "no handler registered" error on startup

---

## v0.8.0 — The Lumina Update — June 2026

### ✨ New

- Scene: Table Light integration — BLE RGB strip now fires alongside Nanoleaf and Spotify from a single preset
- Scene: preset editor redesigned — Spotify, Nanoleaf, and Table Light controls always visible with None option; no more toggles
- Scene: Table Light colour picker per preset — fires independently of Nanoleaf scene
- Scene: Table Light On/Off buttons in status bar for pre-session connection
- Scene: preset tile colour is now a full RGB colour picker instead of a fixed palette
- Scene: preset tiles redesigned — flat dark card with colour accent bar and glow

---

## v0.7.0 — The Improv Update — June 2026

### ✨ New

- Generator tab: random table roller with 10 categories (NPC, Name, Weather, Wild Magic, Travel Event, Rumour, Faction Intel, NPC Encounter, Cursed Item, Magic Item)

### 🐛 Fixes

- Scene: ambience mix and master volume now persist when switching tabs
- Scene: stopping an ambience sound after switching tabs and back now works correctly
- Scene: rapidly toggling a sound on and off no longer leaves it stuck playing
- Nav: tabs no longer squash on narrow windows — scrolls horizontally instead
- Nav: tabs reordered alphabetically

---

## v0.6.10 — June 2026

### ✨ Improvements

- Random Generator: data templates added for upcoming Random Generator tab

---

## v0.6.9 — June 2026

### ✨ Improvements

- Documentation: documents can now be moved between folders via right-click context menu

### 🐛 Fixes

- SceneControl: ambient sounds now play correctly on Mac

---

## v0.6.8 — June 2026

### 📖 Content

- Documentation: example campaign content added and committed to the repo
- Documentation: README added explaining the folder structure and example content

---

## v0.6.7 — May 2026

### ✨ Improvements

- Mac support: double-click launchers added for setup and app launch

---

## v0.6.6 — May 2026

### 🐛 Fixes

- Encounters: CR filter now matches correctly for SRD monsters
- Encounters: delete custom monster now uses an in-app confirmation modal
- TV Display: NPC pin picker now populated from character data
- Characters: crash guard added when running outside Electron

### ✨ Improvements

- Documentation: search now matches against file content, not just filenames — folders auto-expand to show matches
- Scribbleboard: Clear log requires a second click to confirm
- SceneControl: minor dead code cleanup
- DND Wizard: status label no longer references a specific model

---

## v0.6.5 — May 2026

### 📝 Housekeeping

- Version subtitles added to all major releases in the changelog

---

## v0.6.4 — May 2026

### 📝 Documentation

- Documentation panel now reads and writes `.md` files natively
- New documents created in-app are saved as `.md`

---

## v0.6.3b — May 2026

### 🐛 Fixes

- Session timer reset no longer leaks intervals when clicked while running
- Pin size now correctly saved and restored with map states
- Pin size synced to TV when pushing a new map image
- Pin drag hit radius now scales with pin size setting
- Pin drag final position now always accurately synced to TV on release
- Cursor updates during pin hover/drag no longer trigger unnecessary re-renders

---

## v0.6.3a — May 2026

### 🐛 Fix

- Pin size slider now correctly syncs to TV display (IPC bridge was dropping the value)

---

## v0.6.3 — May 2026

### 🎨 UI

- Swapped body font to Lora for better readability
- Nav tab labels now use body font at a legible size
- Deeper dark backgrounds, brighter text contrast, warmer gold
- Documentation folder arrows larger and gold-tinted
- Session timer redesigned — gold, pill-bordered, with stop/start toggle

### 🗺️ Display Panel

- Pins can now be freely dragged to reposition on the DM canvas
- Drag syncs to TV display in real time
- Hover and drag cursor feedback with highlight ring
- Global icon size slider (8–36px) scales all pins on both DM and TV displays

---

## v0.6.2 — May 2026

### 📁 Documentation Structure

- Added base folder structure for campaign documentation

---

## v0.6.1 — May 2026

### ⚔️ Initiative Tracker

- **PC initiative is now manual** — PC quick-add buttons no longer auto-roll; initiative starts at 0 and must be entered by hand
- **Roll All skips PCs** — the 🎲 Roll All button now only re-rolls monsters
- **Editable initiative column** — click any combatant's initiative number to edit it inline; field turns red if left empty, reverts to last valid value on blur
- **Monster HP fix** — custom monsters now correctly load their HP into the tracker when added from search

---

## v0.6 — The Codex Update — May 2026

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

## v0.5 — The Veil Update — May 2026

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

## v0.4 — The Roster Update — May 2026

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

## v0.3 — The Oracle Update — May 2026

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

## v0.2 — The Initiative Update — May 2026

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

## v0.1 — The Genesis Update — May 2026

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
