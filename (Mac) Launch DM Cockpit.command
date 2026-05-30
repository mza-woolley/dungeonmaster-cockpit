#!/bin/bash

# ─────────────────────────────────────────────
#  DM Cockpit — Mac Launcher
#  Checks everything, installs what's missing,
#  then launches the app.
# ─────────────────────────────────────────────

GOLD='\033[0;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

cd "$(dirname "$0")"

echo ""
echo -e "${GOLD}${BOLD}  ⚔  DM Cockpit  ⚔${NC}"
echo -e "${DIM}  Starting checks...${NC}"
echo ""

# ── Homebrew ──────────────────────────────────
echo -e "${DIM}  [1/4] Checking Homebrew...${NC}"
if ! command -v brew &>/dev/null; then
  echo -e "${DIM}  Homebrew not found. Installing...${NC}"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Add brew to PATH for Apple Silicon
  eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null
  eval "$(/usr/local/bin/brew shellenv)" 2>/dev/null
else
  echo -e "${GREEN}  ✓ Homebrew found${NC}"
fi

# ── Git ───────────────────────────────────────
echo -e "${DIM}  [2/4] Checking Git...${NC}"
if ! command -v git &>/dev/null; then
  echo -e "${DIM}  Installing Git...${NC}"
  brew install git
else
  echo -e "${GREEN}  ✓ Git $(git --version | awk '{print $3}') found${NC}"
fi

# ── NVM + Node 20 ─────────────────────────────
echo -e "${DIM}  [3/4] Checking Node v20...${NC}"
export NVM_DIR="$HOME/.nvm"

if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo -e "${DIM}  NVM not found. Installing...${NC}"
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
else
  \. "$NVM_DIR/nvm.sh"
fi

if ! nvm ls 20 &>/dev/null; then
  echo -e "${DIM}  Installing Node v20...${NC}"
  nvm install 20
fi

nvm use 20 --silent
echo -e "${GREEN}  ✓ Node $(node --version) ready${NC}"

# ── Repo ──────────────────────────────────────
echo -e "${DIM}  [4/4] Checking project files...${NC}"
if [ ! -f "package.json" ]; then
  echo -e "${DIM}  Project files not found. Cloning from GitHub...${NC}"
  git clone https://github.com/mza-woolley/dungeonmaster-cockpit.git .
  if [ $? -ne 0 ]; then
    echo -e "${RED}  ✗ Could not clone repo. Check your internet connection.${NC}"
    read -p "Press Enter to exit"
    exit 1
  fi
  echo -e "${GREEN}  ✓ Project files downloaded${NC}"
else
  echo -e "${GREEN}  ✓ Project files found${NC}"
fi

# ── .env check ────────────────────────────────
if [ ! -f ".env" ]; then
  echo ""
  echo -e "${GOLD}${BOLD}  ══════════════════════════════════${NC}"
  echo -e "${GOLD}${BOLD}  FIRST TIME SETUP REQUIRED${NC}"
  echo -e "${GOLD}${BOLD}  ══════════════════════════════════${NC}"
  echo ""
  echo -e "${DIM}  A .env file with your API keys is needed.${NC}"
  echo -e "${DIM}  Opening the template now — fill in your keys,${NC}"
  echo -e "${DIM}  save the file, then come back here and press Enter.${NC}"
  echo ""
  cp .env.example .env
  open -e .env
  read -p "  Press Enter once you've saved your .env file..."
fi

# ── npm install ───────────────────────────────
if [ ! -d "node_modules" ]; then
  echo -e "${DIM}  Installing dependencies...${NC}"
  npm install
  if [ $? -ne 0 ]; then
    echo -e "${RED}  ✗ npm install failed. See above for details.${NC}"
    read -p "Press Enter to exit"
    exit 1
  fi
  echo -e "${GREEN}  ✓ Dependencies installed${NC}"
fi

# ══════════════════════════════════════════════
#  LAUNCH
# ══════════════════════════════════════════════

echo ""
echo -e "${GREEN}  ✓ All checks passed. Launching...${NC}"
echo ""

# Start React dev server in background
echo -e "${DIM}  Launching React server...${NC}"
npm start &
REACT_PID=$!

# Wait for React to be ready
echo -e "${DIM}  Waiting for server to be ready...${NC}"
until curl -s http://localhost:3000 > /dev/null 2>&1; do
  sleep 1
done

echo -e "${GREEN}  ✓ Server ready${NC}"
echo -e "${DIM}  Launching Electron...${NC}"

# Launch Electron
NODE_ENV=development npx electron . &
ELECTRON_PID=$!

echo -e "${GREEN}${BOLD}  ✓ DM Cockpit is running${NC}"
echo -e "${DIM}  Close this window or press Ctrl+C to quit.${NC}"
echo ""

# Wait — if Electron closes, kill React too
wait $ELECTRON_PID
kill $REACT_PID 2>/dev/null
