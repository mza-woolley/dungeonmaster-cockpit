#!/bin/bash

# ─────────────────────────────────────────────
#  DM Cockpit — One-Time Mac Setup
# ─────────────────────────────────────────────

set -e

BOLD='\033[1m'
GOLD='\033[0;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

echo ""
echo -e "${GOLD}${BOLD}  ⚔  DM Cockpit — Mac Setup  ⚔${NC}"
echo -e "${DIM}  ────────────────────────────────${NC}"
echo ""

# ── Step 1: nvm ──────────────────────────────
echo -e "${BOLD}[1/4] Checking nvm...${NC}"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if ! command -v nvm &>/dev/null; then
  echo "  Installing nvm..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  \. "$NVM_DIR/nvm.sh"
  echo -e "  ${GREEN}✓ nvm installed${NC}"
else
  echo -e "  ${GREEN}✓ nvm already installed${NC}"
fi

# ── Step 2: Node 20 ──────────────────────────
echo -e "${BOLD}[2/4] Checking Node v20...${NC}"
if ! nvm ls 20 &>/dev/null | grep -q "v20"; then
  echo "  Installing Node v20..."
  nvm install 20
fi
nvm use 20 --silent
echo -e "  ${GREEN}✓ Node $(node --version)${NC}"

# ── Step 3: npm install ───────────────────────
echo -e "${BOLD}[3/4] Installing dependencies...${NC}"
cd "$(dirname "$0")"
npm install --silent
echo -e "  ${GREEN}✓ Dependencies installed${NC}"

# ── Step 4: Credentials check ─────────────────
echo -e "${BOLD}[4/4] Checking config files...${NC}"
MISSING=0

if [ ! -f "credentials.json" ]; then
  echo -e "  ${RED}✗ credentials.json not found${NC} — copy this from your Windows machine"
  MISSING=1
else
  echo -e "  ${GREEN}✓ credentials.json found${NC}"
fi

if [ ! -f "spotify-config.json" ]; then
  echo -e "  ${RED}✗ spotify-config.json not found${NC} — copy this from your Windows machine"
  MISSING=1
else
  echo -e "  ${GREEN}✓ spotify-config.json found${NC}"
fi

if [ ! -f "nanoleaf-config.json" ]; then
  echo -e "  ${DIM}  nanoleaf-config.json not found — set up via the app when ready${NC}"
else
  echo -e "  ${GREEN}✓ nanoleaf-config.json found${NC}"
fi

echo ""
if [ $MISSING -eq 0 ]; then
  echo -e "${GREEN}${BOLD}  ✓ Setup complete. Run launch-mac.sh to start DM Cockpit.${NC}"
else
  echo -e "${GOLD}${BOLD}  ⚠  Setup done with warnings. Copy missing files then run launch-mac.sh.${NC}"
fi
echo ""
