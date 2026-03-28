# Quickstart: CLI Polish & Resilience

**Branch**: `002-cli-polish-resilience`
**Prerequisites**: Node.js 20 LTS, pnpm or npm

---

## Setup

```bash
# Clone and install
git clone https://github.com/jwill824/tilde.git
cd tilde
npm install

# Confirm the branch
git checkout 002-cli-polish-resilience
```

---

## Building

```bash
npm run build          # TypeScript → dist/
npm run build:watch    # Incremental watch mode during development
```

---

## Running in Development

```bash
# Interactive wizard (prompt-first) — triggers splash with environment detection
node dist/index.js

# Reconfigure mode (requires tilde.config.json in cwd or via --config)
node dist/index.js --reconfigure
node dist/index.js --reconfigure --config ~/Developer/personal/dotfiles/tilde.config.json

# Config-first mode (also shows dynamic splash)
node dist/index.js --config ./tilde.config.json

# Non-interactive / CI mode (skips splash — verify no splash output)
node dist/index.js --ci --config ./tilde.config.json
```

---

## Running Tests

```bash
# All tests
npm test

# Unit tests only (fast; no filesystem side-effects)
npm run test:unit

# Integration tests (write to tmp directories)
npm run test:integration

# Contract tests (schema conformance)
npm run test:contract

# Watch mode for TDD
npx vitest --watch

# Run a single test file
npx vitest run tests/unit/utils/environment.test.ts
```

---

## Developing the Dynamic Splash Screen

The environment detection logic lives in `src/utils/environment.ts`. To exercise it manually:

```bash
# Run the CLI interactively — the splash screen appears first
node dist/index.js

# Expected output in splash: OS name+version, arch, shell name+version, tilde version
# Example:  macOS Sequoia 15.3 · arm64 · zsh 5.9 · v1.0.1
```

To test fallback behaviour, temporarily override `$SHELL`:

```bash
SHELL=/bin/unknown-shell node dist/index.js
# Splash should render shell name as "unknown-shell" with no version suffix
```

---

## Developing `--reconfigure`

The reconfigure mode lives in `src/modes/reconfigure.tsx`.

```bash
# 1. Generate a config first (run the wizard once)
node dist/index.js

# 2. Run reconfigure — all wizard fields should be pre-populated
node dist/index.js --reconfigure

# 3. Test error case: remove the config and try to reconfigure
mv tilde.config.json tilde.config.json.bak
node dist/index.js --reconfigure
# Expected: error message directing user to run `tilde` without flags
mv tilde.config.json.bak tilde.config.json
```

---

## Developing Schema Migrations

Migration steps live in `src/config/migrations/`. The runner is at
`src/config/migrations/runner.ts`.

```bash
# To simulate loading an old config (schemaVersion absent = treated as v1)
cat > /tmp/old-config.json << 'EOF'
{
  "$schema": "https://tilde.sh/config-schema/v1.json",
  "version": "1",
  "os": "macos",
  "shell": "zsh",
  "packageManager": "homebrew",
  "versionManagers": [],
  "languages": [],
  "workspaceRoot": "~/Developer",
  "dotfilesRepo": "~/Developer/personal/dotfiles",
  "contexts": [{ "label": "personal", "path": "~/Developer/personal",
    "git": { "name": "Test", "email": "test@example.com" }, "authMethod": "gh-cli" }],
  "tools": [],
  "configurations": { "git": true, "vscode": false, "aliases": false,
    "osDefaults": false, "direnv": true },
  "secretsBackend": "1password"
}
EOF

node dist/index.js --config /tmp/old-config.json
# Expected: config loads cleanly; schemaVersion defaults to 1 (no migration needed yet)
```

---

## Key File Locations

| Concern | File |
|---------|------|
| Environment detection | `src/utils/environment.ts` |
| Splash component | `src/ui/splash.tsx` |
| App mode branching | `src/app.tsx` |
| Reconfigure mode | `src/modes/reconfigure.tsx` |
| Config schema (Zod) | `src/config/schema.ts` |
| Config reader + migration call | `src/config/reader.ts` |
| Config writer + atomic write | `src/config/writer.ts` |
| Migration runner | `src/config/migrations/runner.ts` |
| Migration steps | `src/config/migrations/v1.ts`, `v2.ts`, … |
| Unit tests: env detection | `tests/unit/utils/environment.test.ts` |
| Unit tests: migration runner | `tests/unit/config/migration-runner.test.ts` |
| Integration tests: reconfigure | `tests/integration/reconfigure.test.ts` |
