# DM Cockpit 🎲

Your all-in-one campaign control panel. Control Spotify, Nanoleaf lighting, TV map display, encounter tracking, and full campaign documentation — all from one app built with Electron + React.

---

## Before You Start — Get Your API Keys

You'll need these during setup. Grab them first:

| Key | Where to get it |
|-----|----------------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` | [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) → Create App |

---

## Setup & Launch

**Windows:** Double-click `DM Cockpit.bat`

On first run the script will automatically:
- Install Git if missing
- Install NVM + Node v20 if missing
- Clone the project files
- Open your `.env` file so you can paste your API keys in
- Install all dependencies
- Launch the app ✅

Every run after that it skips straight to launching.

**Mac:** One-time setup before first launch — open Terminal and run:

```bash
chmod +x "Launch DM Cockpit.command"
```

Then double-click `Launch DM Cockpit.command` — now and every time after.

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Navigate panels | ← → Arrow keys |
| Jump to Characters | Ctrl/Cmd + 1 |
| Jump to Display | Ctrl/Cmd + 2 |
| Jump to Documentation | Ctrl/Cmd + 3 |
| Jump to DND Wizard | Ctrl/Cmd + 4 |
| Jump to Encounters | Ctrl/Cmd + 5 |
| Jump to Scene | Ctrl/Cmd + 6 |
| Jump to Scribble | Ctrl/Cmd + 7 |
| Bring app to front (global) | Ctrl/Cmd + Shift + D |

---

## Troubleshooting

**App won't start** — Close and re-run `DM Cockpit.bat`. It will check and fix most issues automatically.

**Spotify not connecting** — Check your `.env` keys are correct with no extra spaces.
