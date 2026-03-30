#!/usr/bin/env bash
# install.sh — tilde macOS/Linux developer environment installer
# Served at: https://thingstead.io/tilde/install.sh
# Usage:     curl -fsSL https://thingstead.io/tilde/install.sh | bash
#            bash tilde-install.sh [-- args passed to tilde]
#
# This script is idempotent — safe to run multiple times.

set -euo pipefail

# Require bash — fail fast if piped into sh (which ignores the shebang)
[ -n "${BASH_VERSION:-}" ] || {
  echo "✗ This script requires bash. Re-run: curl -fsSL https://thingstead.io/tilde/install.sh | bash" >&2
  exit 1
}

# ─── Windows stub ────────────────────────────────────────────────────────────

if [[ "${OSTYPE:-}" == "msys" || "${OSTYPE:-}" == "cygwin" ]]; then
  echo "  ✗  Windows is not supported by this installer." >&2
  echo "     Install via: npm install -g @jwill824/tilde" >&2
  exit 1
fi

# ─── Color constants ──────────────────────────────────────────────────────────

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

# ─── Helper functions ─────────────────────────────────────────────────────────

info()    { printf "${CYAN}  →${RESET}  %s\n"    "$*"; }
success() { printf "${GREEN}  ✓${RESET}  %s\n"   "$*"; }
warn()    { printf "${YELLOW}  ⚠${RESET}  %s\n"  "$*"; }
error()   { printf "${RED}  ✗${RESET}  %s\n"     "$*" >&2; }
abort()   { error "$*"; exit 1; }

# ─── Banner ───────────────────────────────────────────────────────────────────

printf "\n${BOLD}${CYAN}tilde 🌿 — macOS Developer Environment Setup${RESET}\n\n"

# ─── State flag for cleanup trap ──────────────────────────────────────────────

INSTALL_STARTED=false

# ─── Cleanup trap ─────────────────────────────────────────────────────────────
# Only cleans up partial npm downloads — never removes pre-existing tools.

cleanup() {
  local exit_code=$?
  if [[ "$INSTALL_STARTED" == "true" && "$exit_code" -ne 0 ]]; then
    warn "Cleaning up partial install..."
    npm cache clean --force 2>/dev/null || true
  fi
}
trap cleanup ERR EXIT

# ─── OS detection ─────────────────────────────────────────────────────────────

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)
    PLATFORM="macos"
    ;;
  Linux)
    PLATFORM="linux"
    warn "Linux support is experimental."
    ;;
  *)
    abort "tilde requires macOS or Linux. Windows support is coming — install via: npx @jwill824/tilde"
    ;;
esac

# ─── macOS: Xcode Command Line Tools ─────────────────────────────────────────

if [[ "$PLATFORM" == "macos" ]]; then
  if ! xcode-select -p &>/dev/null; then
    info "Installing Xcode Command Line Tools..."
    xcode-select --install
    info "Please complete the Xcode CLT install prompt, then re-run this script."
    exit 0
  else
    success "Xcode Command Line Tools found"
  fi
fi

# ─── Interactive package manager selection ────────────────────────────────────

select_package_manager() {
  local default="1"
  local choice

  if [[ "$PLATFORM" == "macos" ]]; then
    local prompt_text="Select a package manager:
  1) Homebrew (recommended)
  2) Skip (Node.js already managed)

Choice [${default}]: "
  else
    local prompt_text="Select a package manager:
  1) apt
  2) dnf
  3) pacman
  4) Skip (Node.js already managed)

Choice [${default}]: "
  fi

  # Non-interactive environments: auto-select default
  if [[ "${CI:-}" == "true" ]] || ! [ -t 0 ]; then
    warn "Non-interactive environment detected — using default package manager selection."
    PM_CHOICE="$default"
    return
  fi

  printf "%s" "$prompt_text"
  read -r choice
  choice="${choice:-$default}"

  # Validate input; re-prompt once on invalid input
  if [[ "$PLATFORM" == "macos" ]]; then
    if [[ "$choice" != "1" && "$choice" != "2" ]]; then
      warn "Invalid choice '${choice}'. Please enter 1 or 2."
      printf "%s" "$prompt_text"
      read -r choice
      choice="${choice:-$default}"
      if [[ "$choice" != "1" && "$choice" != "2" ]]; then
        abort "Invalid package manager selection. Aborting."
      fi
    fi
  else
    if [[ "$choice" != "1" && "$choice" != "2" && "$choice" != "3" && "$choice" != "4" ]]; then
      warn "Invalid choice '${choice}'. Please enter 1, 2, 3, or 4."
      printf "%s" "$prompt_text"
      read -r choice
      choice="${choice:-$default}"
      if [[ "$choice" != "1" && "$choice" != "2" && "$choice" != "3" && "$choice" != "4" ]]; then
        abort "Invalid package manager selection. Aborting."
      fi
    fi
  fi

  PM_CHOICE="$choice"
}

select_package_manager

# Translate numeric choice to PM name
if [[ "$PLATFORM" == "macos" ]]; then
  case "$PM_CHOICE" in
    1) SELECTED_PM="homebrew" ;;
    2) SELECTED_PM="skip" ;;
  esac
else
  case "$PM_CHOICE" in
    1) SELECTED_PM="apt" ;;
    2) SELECTED_PM="dnf" ;;
    3) SELECTED_PM="pacman" ;;
    4) SELECTED_PM="skip" ;;
  esac
fi

# ─── Package manager installation ────────────────────────────────────────────

case "$SELECTED_PM" in
  homebrew)
    if command -v brew &>/dev/null; then
      success "Homebrew found: $(brew --version | head -1)"
    else
      info "Installing Homebrew..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      if [[ "$ARCH" == "arm64" ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
      else
        eval "$(/usr/local/bin/brew shellenv)"
      fi
      success "Homebrew installed"
    fi
    ;;
  apt)
    warn "Linux support is experimental"
    info "Updating apt and installing Node.js..."
    sudo apt-get update -y && sudo apt-get install -y nodejs npm
    ;;
  dnf)
    warn "Linux support is experimental"
    info "Installing Node.js via dnf..."
    sudo dnf install -y nodejs npm
    ;;
  pacman)
    warn "Linux support is experimental"
    info "Installing Node.js via pacman..."
    sudo pacman -Sy --noconfirm nodejs npm
    ;;
  skip)
    info "Skipping package manager install — assuming Node.js is already managed."
    ;;
esac

# ─── Node.js 20+ detection and installation ──────────────────────────────────

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
  if [[ "$SELECTED_PM" == "homebrew" ]]; then
    info "Installing Node.js ${NODE_MAJOR_MIN} via Homebrew..."
    brew install node@${NODE_MAJOR_MIN}
    if [[ "$ARCH" == "arm64" ]]; then
      export PATH="/opt/homebrew/opt/node@${NODE_MAJOR_MIN}/bin:$PATH"
    else
      export PATH="/usr/local/opt/node@${NODE_MAJOR_MIN}/bin:$PATH"
    fi
  fi

  if check_node; then
    success "Node.js installed: $(node --version)"
  else
    abort "Failed to install Node.js ${NODE_MAJOR_MIN}. Please install manually: https://nodejs.org"
  fi
fi

# ─── Version resolution (T025) ───────────────────────────────────────────────

info "Resolving latest tilde version from npm registry..."
TILDE_VERSION="$(npm view @jwill824/tilde version 2>/dev/null || true)"

if [[ -z "$TILDE_VERSION" ]]; then
  abort "Could not resolve tilde version from npm registry. Check your internet connection or install directly: npx @jwill824/tilde"
fi

success "Resolved tilde v${TILDE_VERSION}"

# ─── tilde global install (T013, T026) ───────────────────────────────────────
# npm automatically verifies dist.integrity (sha512) during install.
# If integrity check fails, npm exits non-zero → abort() fires → cleanup trap runs.

INSTALL_STARTED=true
info "Installing tilde v${TILDE_VERSION}..."
if ! npm install -g "@jwill824/tilde@${TILDE_VERSION}"; then
  abort "npm install failed. The package may not exist yet in the registry."
fi
success "tilde v${TILDE_VERSION} installed"

# ─── Launch tilde ─────────────────────────────────────────────────────────────

# When piped (curl | bash), stdin/stdout are not a TTY — Ink cannot render.
# Print a success message and exit cleanly instead of crashing with a raw mode error.
if [ -t 0 ] && [ -t 1 ]; then
  success "Setup complete — launching tilde..."
  exec tilde "$@"
else
  success "Installation complete — open a new terminal and run: tilde"
  exit 0
fi
