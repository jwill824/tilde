# Contract: Install Script Interface

**File**: `site/tilde/install.sh`
**Served at**: `https://thingstead.io/tilde/install.sh`
**Version**: 1.0.0 | **Date**: 2026-03-29

---

## Invocation Contract

### Primary invocation (documented to users)

```bash
curl -fsSL https://thingstead.io/tilde/install.sh | bash
```

### Alternate invocations

```bash
# Download and inspect before running (recommended for security-conscious users)
curl -fsSL https://thingstead.io/tilde/install.sh -o tilde-install.sh
bash tilde-install.sh

# Pass arguments through to tilde after install
curl -fsSL https://thingstead.io/tilde/install.sh | bash -s -- --config ~/tilde.config.json
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success — tilde installed and launched (or already present) |
| `1` | Fatal error — script aborted; system left clean |

All non-zero exits MUST be preceded by an error message on stderr.

---

## Environment Assumptions

| Requirement | Value |
|-------------|-------|
| Shell | `bash` 3.2+ (ships with macOS) or `bash` 4+ (Linux) |
| Internet | Required for all steps |
| OS | macOS (Darwin) — primary; Linux — SHOULD |
| Windows | NOT supported; script exits with a friendly message |
| Privileges | Must NOT require `sudo` unless PM installer itself requires it |

---

## Stdio Contract

### stdout — progress messages (human-readable)

All progress messages use the following prefix format:

```
  →  <info message>         (cyan)
  ✓  <success message>      (green)
  ⚠  <warning message>      (yellow)
```

### stderr — error messages

```
  ✗  <error message>        (red)
```

Fatal errors print to stderr and set `exit 1`. Warnings print to stdout and continue.

---

## Interactive Prompt Contract

The script presents exactly one interactive prompt before taking any action:

```
Select a package manager:
  1) Homebrew (recommended)
  2) Skip (Node.js already managed)

Choice [1]:
```

- Default: `1` (Homebrew) — user presses Enter to accept
- Invalid input: re-prompt once, then abort
- Non-interactive environments (`CI=true` or no TTY): default selection applied without
  prompting; warn to stdout

---

## Version Resolution Contract

The script MUST:
1. Query `npm view @jwill824/tilde version` to resolve the latest stable version
2. Display the resolved version before installing: `→ Installing tilde v<version>`
3. Install exactly that version: `npm install -g "@jwill824/tilde@<version>"`
4. npm's native integrity verification (dist.integrity) runs automatically

If the npm registry is unavailable:
- Abort with: `✗ Could not resolve tilde version. Try: npx @jwill824/tilde`
- Exit code: 1

---

## Idempotency Contract

Re-running the script on a machine where tilde is already installed MUST:
- Detect existing Homebrew → skip Homebrew install (log: `✓ Homebrew found`)
- Detect existing Node.js 20+ → skip Node install (log: `✓ Node.js found: vX.Y.Z`)
- Still install/upgrade tilde to the latest version
- Re-launch tilde after install

---

## Cleanup Contract

On any fatal error after a partial download:
- Remove any partially downloaded npm tarballs
- Do NOT remove pre-existing Homebrew or Node.js installations
- Leave system PATH unchanged from pre-script state if install failed
