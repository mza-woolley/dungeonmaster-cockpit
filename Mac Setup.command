#!/bin/bash

# ─────────────────────────────────────────────
#  DM Cockpit — Mac Setup
#  Double-click to run once after copying the
#  folder to your Mac.
# ─────────────────────────────────────────────

cd "$(dirname "$0")"

echo ""
echo "  *** DM Cockpit — Mac Setup ***"
echo "  ──────────────────────────────"
echo ""

# ── Homebrew ──────────────────────────────────
echo "[1/5] Checking Homebrew..."
if ! command -v brew &>/dev/null; then
  echo "  Homebrew not found. Installing..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
  fi
  echo "  Homebrew installed."
else
  echo "  OK - Homebrew $(brew --version | head -1) found"
fi

# ── NVM + Node v20 ────────────────────────────
echo "[2/5] Checking NVM + Node v20..."
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  echo "  NVM not found. Installing..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  echo "  NVM installed."
else
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  echo "  OK - NVM found"
fi

if ! nvm ls 20 2>/dev/null | grep -q "v20"; then
  echo "  Installing Node v20..."
  nvm install 20
fi
nvm use 20
echo "  OK - Node $(node --version) ready"

# ── Claude Code CLI ───────────────────────────
echo "[3/5] Checking Claude Code CLI..."
if ! command -v claude &>/dev/null; then
  echo "  Installing Claude Code..."
  npm install -g @anthropic-ai/claude-code
  echo "  Claude Code installed."
else
  echo "  OK - Claude Code found"
fi

# ── .env check ────────────────────────────────
echo "[4/5] Checking .env..."
if [ ! -f ".env" ]; then
  echo ""
  echo "  ══════════════════════════════════════"
  echo "  FIRST TIME SETUP REQUIRED"
  echo "  ══════════════════════════════════════"
  echo ""
  cp .env.example .env
  echo "  .env template created — opening in TextEdit..."
  open -e .env
  echo ""
  echo "  Fill in your API keys, save, then press any key to continue."
  read -n 1 -s
else
  echo "  OK - .env found"
fi

# ── npm install ───────────────────────────────
echo "[5/5] Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "  Installing dependencies..."
  npm install
  echo "  OK - Dependencies installed."
else
  echo "  OK - node_modules found"
fi

echo ""
echo "  ══════════════════════════════════════"
echo "  Setup complete!"
echo ""
echo "  You can now double-click:"
echo "  • 'Launch DM Cockpit.command' to start the app"
echo "  • 'ClaudeStart.command' to open Claude Code"
echo "  ══════════════════════════════════════"
echo ""
read -n 1 -s -p "  Press any key to close..."
echo ""
