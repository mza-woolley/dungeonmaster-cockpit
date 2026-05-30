# DM Cockpit 🎲

Your all-in-one campaign control panel. Control Spotify, Nanoleaf lighting, Google Docs notes, TV map display, and encounter tracking — all from one app built with Electron + React.

---

## Before You Start — Get Your API Keys

You'll need these during setup. Grab them first:

| Key | Where to get it |
|-----|----------------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client |
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

**Mac:** Double-click `2. Launch DM Cockpit (Mac).command`

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Navigate panels | ← → Arrow keys |
| Jump to Notes | Ctrl/Cmd + 1 |
| Jump to Scribble | Ctrl/Cmd + 2 |
| Jump to Scene Control | Ctrl/Cmd + 3 |
| Jump to TV Display | Ctrl/Cmd + 4 |
| Bring app to front (global) | Ctrl/Cmd + Shift + D |

---

## Troubleshooting

**App won't start** — Close and re-run `DM Cockpit.bat`. It will check and fix most issues automatically.

**Spotify/Google not connecting** — Check your `.env` keys are correct with no extra spaces.
