# Documentation Symlink Setup

The `documentation/` folder is not committed to this repo. It lives in Google Drive and is symlinked into the project on each machine, so edits sync automatically without committing.

---

## Windows Setup

> Requires PowerShell run as Administrator (local admin is sufficient — Developer Mode not needed).

```powershell
# 1. Move the existing documentation folder into Google Drive
Move-Item "C:\DND - La Croix\dm-cockpit\documentation" "C:\Users\matth\Google Drive\My Drive\dm-cockpit-docs"

# 2. Create the symlink back where the app expects it
New-Item -ItemType SymbolicLink -Path "C:\DND - La Croix\dm-cockpit\documentation" -Target "C:\Users\matth\Google Drive\My Drive\dm-cockpit-docs"
```

Verify it worked:
```powershell
Get-Item "C:\DND - La Croix\dm-cockpit\documentation" | Select-Object LinkType, Target
```
Should return `SymbolicLink` and the Google Drive path.

---

## Mac Setup

> No special permissions needed. Run in Terminal.

Google Drive path on macOS Ventura+:
```
/Users/yourname/Library/CloudStorage/GoogleDrive-youremail@gmail.com/My Drive/
```

```bash
# Create the symlink (adjust paths to match your username and Google account)
ln -s "/Users/yourname/Library/CloudStorage/GoogleDrive-youremail@gmail.com/My Drive/dm-cockpit-docs" "/path/to/dm-cockpit/documentation"
```

Verify it worked:
```bash
ls -la /path/to/dm-cockpit/documentation
```
Should show `-> /Users/yourname/Library/CloudStorage/...`

---

## How It Works Day-to-Day

- Edit any `.md` file on either machine → Google Drive syncs it automatically
- No commits required for documentation changes
- Zero crossover risk — edits on one machine are live on the other within seconds of Google Drive syncing

---

## Notes

- `documentation/` is in `.gitignore` — it will never be accidentally committed
- If the Google Drive folder is ever moved or renamed, the symlink will break — recreate it pointing to the new path
- Keep the project folder outside of iCloud on Mac (e.g. `~/Projects/`) to prevent iCloud from interfering with the symlink
