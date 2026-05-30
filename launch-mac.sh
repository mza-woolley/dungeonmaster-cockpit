#!/bin/bash

# ─────────────────────────────────────────────
#  DM Cockpit — Launch
# ─────────────────────────────────────────────

GOLD='\033[0;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

cd "$(dirname "$0")"

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20 --silent 2>/dev/null

echo ""
echo -e "${GOLD}${BOLD}  ⚔  DM Cockpit  ⚔${NC}"
echo -e "${DIM}  Starting...${NC}"
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

# Wait — if either process dies, kill both
wait $ELECTRON_PID
kill $REACT_PID 2>/dev/null
