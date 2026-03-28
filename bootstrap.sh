#!/usr/bin/env bash
# bootstrap.sh — tilde macOS developer environment bootstrap
# Usage: curl -fsSL https://raw.githubusercontent.com/[user]/tilde/main/bootstrap.sh | bash
# Or:    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/[user]/tilde/main/bootstrap.sh)"

set -euo pipefail

# ─── Helpers ─────────────────────────────────────────────────────────────────

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

info()    { printf "${CYAN}  →${RESET} %s\n" "$*"; }
success() { printf "${GREEN}  ✓${RESET} %s\n" "$*"; }
warn()    { printf "${YELLOW}  ⚠${RESET} %s\n" "$*"; }
error()   { printf "${RED}  ✗${RESET} %s\n" "$*" >&2; }
abort()   { error "$*"; exit 1; }

# ─── Platform check ──────────────────────────────────────────────────────────

if [[ "$(uname -s)" != "Darwin" ]]; then
  abort "tilde requires macOS. Detected OS: $(uname -s). Windows/Linux support coming soon."
fi

ARCH="$(uname -m)"
if [[ "$ARCH" != "arm64" ]]; then
  warn "tilde is optimized for Apple Silicon (arm64). Detected: $ARCH. Proceeding anyway..."
fi

printf "\n${BOLD}${CYAN}tilde 🌿 — macOS Developer Environment Bootstrap${RESET}\n\n"

# ─── Xcode Command Line Tools ─────────────────────────────────────────────────

if ! xcode-select -p &>/dev/null; then
  info "Installing Xcode Command Line Tools..."
  xcode-select --install
  info "Please complete the Xcode CLT installation prompt, then re-run this script."
  exit 0
else
  success "Xcode Command Line Tools found"
fi

# ─── Homebrew ─────────────────────────────────────────────────────────────────

if ! command -v brew &>/dev/null; then
  info "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  # Add Homebrew to PATH for Apple Silicon
  if [[ "$ARCH" == "arm64" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  else
    eval "$(/usr/local/bin/brew shellenv)"
  fi
  success "Homebrew installed"
else
  success "Homebrew found: $(brew --version | head -1)"
fi

# ─── Node.js 20+ ──────────────────────────────────────────────────────────────

NODE_MAJOR_MIN=20

check_node() {
  if command -v node &>/dev/null; then
    local ver
    ver="$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)"
    [[ "$ver" -ge "$NODE_MAJOR_MIN" ]] 2>/dev/null && return 0
  fi
  return 1
}

if check_node; then
  success "Node.js found: $(node --version)"
else
  info "Installing Node.js ${NODE_MAJOR_MIN} via Homebrew..."
  brew install node@${NODE_MAJOR_MIN}

  # Add node@20 to PATH
  if [[ "$ARCH" == "arm64" ]]; then
    export PATH="/opt/homebrew/opt/node@${NODE_MAJOR_MIN}/bin:$PATH"
  else
    export PATH="/usr/local/opt/node@${NODE_MAJOR_MIN}/bin:$PATH"
  fi

  if check_node; then
    success "Node.js installed: $(node --version)"
  else
    abort "Failed to install Node.js ${NODE_MAJOR_MIN}. Please install manually: https://nodejs.org"
  fi
fi

# ─── Launch tilde ─────────────────────────────────────────────────────────────

info "Launching tilde..."

npx --yes tilde@latest "$@"
