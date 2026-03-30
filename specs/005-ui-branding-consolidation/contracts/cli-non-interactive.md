# Contract: CLI Non-Interactive Behavior

**Branch**: `005-ui-branding-consolidation` | **Date**: 2026-03-30

---

## Overview

This contract defines the observable behavior of the `tilde` CLI when launched in a non-interactive (non-TTY) environment — specifically when invoked via `curl -fsSL https://thingstead.io/tilde/install.sh | bash`.

---

## Detection Contract

The CLI (and install script) MUST determine interactivity using the POSIX TTY test:

| Check | Meaning |
|-------|---------|
| `stdin is TTY` (`process.stdin.isTTY === true`) | Interactive terminal — proceed normally |
| `stdin is not TTY` (`process.stdin.isTTY` is `undefined` or `false`) | Piped/headless — apply non-interactive behavior |

**In `install.sh`** (primary enforcement point):
```bash
if [ -t 0 ] && [ -t 1 ]; then
  exec tilde "$@"
else
  # Print success message; do not launch Ink
  printf "\n  ✓  Installation complete — open a new terminal and run: tilde\n\n"
  exit 0
fi
```

**In `src/index.tsx`** (safety guard):
Before calling `render(React.createElement(App, ...))`, add:
```ts
if (!process.stdin.isTTY && mode !== 'non-interactive') {
  process.stdout.write('\n  ✓  tilde installed — run tilde in an interactive terminal to complete setup.\n\n');
  process.exit(0);
}
```

---

## Behavior Matrix

| Launch context | stdin TTY | Expected outcome |
|----------------|-----------|-----------------|
| `tilde` in terminal | ✅ TTY | Splash screen → wizard |
| `tilde --ci --config path` | ❌ not TTY | Non-interactive mode runs (existing behavior) |
| `curl \| bash` → `exec tilde` | ❌ not TTY | Print success message, exit 0 (NEW) |
| `tilde` piped accidentally | ❌ not TTY | Print message, exit 0 (NEW) |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (interactive completion OR clean non-interactive exit) |
| 1 | General error |
| 2 | Config validation error |
| 3 | Non-interactive mode execution error |
| 4 | Plugin error |

---

## Out of Scope

- CI/CD pipeline environments (deferred to future iteration)
- Windows PowerShell TTY detection
- `TILDE_CI` environment variable behavior (already implemented)
