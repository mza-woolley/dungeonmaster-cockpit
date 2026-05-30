@echo off
setlocal enabledelayedexpansion

:: ─────────────────────────────────────────────
::  DM Cockpit — One-Time Windows Setup
:: ─────────────────────────────────────────────

title DM Cockpit Setup

echo.
echo   [33m*** DM Cockpit - Windows Setup ***[0m
echo   ────────────────────────────────────
echo.

:: Move to the folder this .bat lives in
cd /d "%~dp0"

:: ── Step 1: Check nvm-windows ─────────────────
echo [1/4] Checking nvm...

where nvm >nul 2>&1
if errorlevel 1 (
  echo   nvm not found.
  echo   Please install nvm-windows from:
  echo   https://github.com/coreybutler/nvm-windows/releases
  echo   Then re-run this setup.
  echo.
  pause
  exit /b 1
) else (
  for /f "tokens=*" %%v in ('nvm version') do set NVM_VER=%%v
  echo   [32m^✓ nvm !NVM_VER! found[0m
)

:: ── Step 2: Node 20 ───────────────────────────
echo [2/4] Checking Node v20...

nvm list | findstr "20\." >nul 2>&1
if errorlevel 1 (
  echo   Installing Node v20...
  nvm install 20
)

nvm use 20
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo   [32m^✓ Node !NODE_VER![0m

:: ── Step 3: npm install ───────────────────────
echo [3/4] Installing dependencies...

call npm install
if errorlevel 1 (
  echo   [31m^✗ npm install failed — check errors above[0m
  pause
  exit /b 1
)
echo   [32m^✓ Dependencies installed[0m

:: ── Step 4: Credentials check ─────────────────
echo [4/4] Checking config files...

set MISSING=0

if not exist "credentials.json" (
  echo   [31m^✗ credentials.json not found[0m - copy from your other machine
  set MISSING=1
) else (
  echo   [32m^✓ credentials.json found[0m
)

if not exist "spotify-config.json" (
  echo   [31m^✗ spotify-config.json not found[0m - copy from your other machine
  set MISSING=1
) else (
  echo   [32m^✓ spotify-config.json found[0m
)

if not exist "nanoleaf-config.json" (
  echo   [2m  nanoleaf-config.json not found - set up via the app when ready[0m
) else (
  echo   [32m^✓ nanoleaf-config.json found[0m
)

echo.
if "!MISSING!"=="0" (
  echo   [32m^✓ Setup complete. Run "2. Launch DM Cockpit.bat" to start.[0m
) else (
  echo   [33m^⚠  Setup done with warnings. Copy missing files then launch.[0m
)
echo.

pause
