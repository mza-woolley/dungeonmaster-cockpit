@echo off
setlocal enabledelayedexpansion

:: ─────────────────────────────────────────────
::  DM Cockpit — Windows Launcher
::  Checks everything, installs what's missing,
::  then launches the app.
:: ─────────────────────────────────────────────

title DM Cockpit
cd /d "%~dp0"

echo.
echo   *** DM Cockpit ***
echo   ──────────────────
echo.

:: ══════════════════════════════════════════════
::  PART 1 — INSTALL CHECKS
:: ══════════════════════════════════════════════

:: ── Git ───────────────────────────────────────
echo [1/4] Checking Git...
where git >nul 2>&1
if errorlevel 1 (
  echo   Git not found. Downloading installer...
  powershell -Command "Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/Git-2.44.0-64-bit.exe' -OutFile '%TEMP%\git-installer.exe'"
  echo   Installing Git silently...
  "%TEMP%\git-installer.exe" /VERYSILENT /NORESTART
  set "PATH=%PATH%;C:\Program Files\Git\cmd"
  echo   Git installed.
) else (
  for /f "tokens=*" %%v in ('git --version') do echo   OK - %%v
)

:: ── NVM ───────────────────────────────────────
echo [2/4] Checking NVM...
where nvm >nul 2>&1
if errorlevel 1 (
  echo   NVM not found. Downloading installer...
  powershell -Command "Invoke-WebRequest -Uri 'https://github.com/coreybutler/nvm-windows/releases/download/1.1.12/nvm-setup.exe' -OutFile '%TEMP%\nvm-setup.exe'"
  echo   Installing NVM...
  "%TEMP%\nvm-setup.exe" /VERYSILENT /NORESTART
  echo.
  echo   NVM was just installed.
  echo   Please CLOSE this window and run this file again.
  echo.
  pause
  exit /b 0
) else (
  for /f "tokens=*" %%v in ('nvm version') do echo   OK - NVM %%v found
)

:: ── Node v20 ──────────────────────────────────
echo [3/4] Checking Node v20...
nvm list | findstr "20\." >nul 2>&1
if errorlevel 1 (
  echo   Installing Node v20...
  nvm install 20
)
nvm use 20 >nul 2>&1
for /f "tokens=*" %%v in ('node --version') do echo   OK - Node %%v ready

:: ── Repo ──────────────────────────────────────
echo [4/4] Checking project files...
if not exist "package.json" (
  echo   Project files not found. Cloning from GitHub...
  cd /d "%~dp0"
  git clone https://github.com/mza-woolley/dungeonmaster-cockpit.git .
  if errorlevel 1 (
    echo   ERROR: Could not clone repo. Check your internet connection.
    pause
    exit /b 1
  )
  echo   OK - Project files downloaded.
) else (
  echo   OK - Project files found.
)

:: ── .env check ────────────────────────────────
if not exist ".env" (
  echo.
  echo   ══════════════════════════════════════════
  echo   FIRST TIME SETUP REQUIRED
  echo   ══════════════════════════════════════════
  echo.
  echo   A .env file with your API keys is needed.
  echo   A template has been created — open it now:
  echo.
  copy .env.example .env >nul
  start notepad .env
  echo   Fill in your API keys, save the file,
  echo   then close Notepad and press any key.
  echo.
  pause
)

:: ── npm install ───────────────────────────────
if not exist "node_modules" (
  echo   Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo   ERROR: npm install failed. See above for details.
    pause
    exit /b 1
  )
  echo   OK - Dependencies installed.
)

:: ══════════════════════════════════════════════
::  PART 2 — LAUNCH
:: ══════════════════════════════════════════════

echo.
echo   All checks passed. Launching DM Cockpit...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "DM Cockpit.ps1"
pause
