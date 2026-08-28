#!/usr/bin/env bash
# install.sh - tilde hosted installer status stub
# Served at: https://tilde.thingstead.io/install.sh
#
# tilde is currently a public proof of concept and is not published to npm yet.

set -euo pipefail

[ -n "${BASH_VERSION:-}" ] || {
  echo "x This script requires bash." >&2
  exit 1
}

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

info() { printf "${CYAN}  ->${RESET}  %s\n" "$*"; }
warn() { printf "${YELLOW}  !${RESET}  %s\n" "$*"; }

printf "\n${BOLD}${GREEN}tilde${RESET} - macOS developer environment inventory and provenance\n\n"

warn "tilde is currently a public proof of concept."
warn "The npm package is not published yet, so this hosted installer is unavailable."
info "Read the docs: https://tilde.thingstead.io/docs/"
info "View source: https://github.com/jwill824/tilde"

exit 1

# TODO(npm-release): Replace this PoC status stub with the full installer when
# @jwill824/tilde is published. The previous installer implementation covered:
# - bash-only execution guard for curl-pipe usage
# - Windows unsupported message
# - colorized info/warn/error helpers and setup banner
# - cleanup trap for partial npm installs
# - macOS/Linux OS and architecture detection
# - macOS Xcode Command Line Tools detection and prompt
# - interactive package manager selection, with non-interactive fallback
# - Homebrew detection/install on macOS
# - experimental apt/dnf/pacman Node.js install paths on Linux
# - Node.js 20+ detection and PATH handling for Homebrew node@20
# - npm registry version resolution with `npm view @jwill824/tilde version`
# - npm global install with npm integrity verification
# - TTY-aware launch behavior for Ink, falling back to "run tilde manually"
#
# Keep this note here so the hosted script explains current project status
# without losing the release-time installer requirements.
