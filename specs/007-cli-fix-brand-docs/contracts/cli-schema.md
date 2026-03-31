# CLI Command Schema

**Branch**: `007-cli-fix-brand-docs`  
**Contract Type**: CLI invocation schema  
**Enforced by**: `src/index.tsx` → `parseCliArgs()`, Zod config schema  
**Updated**: 2025-07-17

---

## Overview

Tilde exposes a single CLI command (`tilde`) with optional flags and subcommands. The binary entry point is `bin/tilde.ts` (compiled to `dist/bin/tilde.js`), which unconditionally delegates to `main()` from `src/index.tsx`.

This contract documents the stable CLI interface: all flags, subcommands, positional arguments, exit codes, and output guarantees that implementation must honour.

---

## Invocation Syntax

```
tilde [options] [subcommand [subcommand-args]]
```

---

## Root-Level Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--config <path-or-url>` | `-c` | `string` | Path to `tilde.config.json` or HTTPS URL |
| `--yes` | `-y` | `boolean` | Non-interactive mode; requires `--config` |
| `--ci` | | `boolean` | CI mode; implies `--yes` behaviour |
| `--reconfigure` | | `boolean` | Re-run wizard with existing config pre-populated |
| `--resume` | | `boolean` | Resume a previously interrupted wizard |
| `--no-resume` | | `boolean` | Suppress resume prompt even if checkpoint exists |
| `--dry-run` | | `boolean` | Simulate all operations without applying changes |
| `--verbose` | | `boolean` | Emit detailed diagnostic output |
| `--help` | `-h` | `boolean` | Print usage and exit with code 0 |
| `--version` | `-v` | `boolean` | Print version string and exit with code 0 |

**Parsing rules**:
- Unknown flags are silently ignored (`strict: false` in `parseArgs`)
- `--yes` and `--ci` are treated equivalently at mode resolution
- `--resume` is ignored when `--no-resume` is also present

---

## Subcommands

### `tilde plugin <action> [name]`

Manage tilde plugins.

| Action | Description |
|--------|-------------|
| `list` | List installed plugins (default if no action given) |
| `install <name>` | Install a plugin by package name |
| `remove <name>` | Remove an installed plugin |

**Exit codes**: 0 on success; 1 on plugin-not-found or install failure (PluginError → exit 4).

### `tilde config <action> [path]`

Manage the `tilde.config.json` configuration file.

| Action | Description |
|--------|-------------|
| `show` | Print the resolved config to stdout (default if no action given) |
| `validate [path]` | Validate a config file against the current schema |
| `migrate [path]` | Upgrade config `schemaVersion` to current |

**Exit codes**: 0 on success; 2 on config validation failure.

---

## Entry Modes (startup branching)

The CLI resolves one of three modes at startup before rendering any UI:

| Mode | Trigger Condition | Behaviour |
|------|------------------|-----------|
| `wizard` | No config file detected, no `--ci`/`--yes` | Full Ink interactive wizard |
| `config-first` | `tilde.config.json` found (local path, `--config`, or `TILDE_CONFIG` env) | Display config summary → confirm → apply |
| `non-interactive` | `--ci` or `--yes` flag | Silent apply; error if config missing or incomplete |

**TTY guard**: When `mode !== 'non-interactive'` and `process.stdin.isTTY === false`, the CLI exits with code 0 after printing:
```
✓ tilde is installed — open a new terminal and run: tilde
```
This applies to piped install scripts (`curl | bash`). Piped mode support is out of scope for issue #45.

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success (normal exit, `--help`, `--version`, TTY guard exit) |
| `1` | Fatal unhandled error |
| `2` | Config validation failure |
| `3` | `--ci`/`--yes` invoked without `--config` |
| `4` | Plugin error (`PluginError` thrown) |

---

## Environment Variables

| Variable | Effect |
|----------|--------|
| `TILDE_CONFIG=<path>` | Equivalent to `--config <path>` |
| `TILDE_CI=1` or `TILDE_CI=true` | Equivalent to `--ci` flag |
| `TILDE_FORCE_RUN=1` | **Deprecated** — was used to bypass `isMain` guard in v1.3.0; no longer needed after bin/tilde.ts restructuring; variable accepted but has no effect |

---

## Output Contract

### Interactive Mode (`wizard`, `config-first`)

When invoked in an interactive TTY, the CLI MUST emit at minimum:

1. A splash screen displaying: OS name/version, CPU architecture, shell name/version, tilde version
2. At least one prompt or status message before any blocking I/O wait

**Assertion for SC-001**: `stdout` is non-empty on a valid interactive invocation. Zero silent-exit occurrences are permitted.

### `--version` flag

```
tilde v<semver>
```
Printed to stdout; exit code 0.

### `--help` flag

```
tilde — macOS developer environment, one command away

USAGE
  tilde [options] [subcommand]

OPTIONS
  -c, --config <path>   Path to tilde.config.json or HTTPS URL
  -y, --yes             Non-interactive mode (requires --config)
      --ci              CI mode (implies --yes)
      --reconfigure     Re-run wizard with stored config
      --dry-run         Simulate without applying changes
      --verbose         Verbose diagnostic output
  -h, --help            Show this help
  -v, --version         Print version

SUBCOMMANDS
  plugin [list|install|remove]   Manage plugins
  config [show|validate|migrate] Manage configuration
```
Printed to stdout; exit code 0.

### Error output

All error messages MUST be written to stderr. Exit codes MUST match the table above. No error condition produces a silent exit (zero output, zero stderr) for interactive TTY invocations.

---

## Integration Test Assertions (SC-001)

The automated regression test in `tests/integration/cli-regression.test.ts` validates this contract:

```
GIVEN: bin/tilde.ts compiled to dist/bin/tilde.js
WHEN:  spawned via child_process with TILDE_CI=1
THEN:  stdout + stderr is non-empty (> 0 bytes)
AND:   exit code is 0
```

This test MUST pass on every CI run.

---

## Binary Entry Point Contract

| Property | Value |
|----------|-------|
| Source | `bin/tilde.ts` |
| Compiled output | `dist/bin/tilde.js` |
| npm bin key | `tilde` |
| Module type | ESM (`"type": "module"` in package.json) |
| Shebang | `#!/usr/bin/env node` |
| Top-level side effect | Unconditional `main()` call (no guard) |
| Import from | `../src/index.js` (compiled path) |

---

## Config File Schema (summary)

Full schema documentation: `docs/config-format.md`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | `string` | Yes | Config schema version for migration |
| `shell` | `string` | Yes | Selected shell (zsh, bash, fish, pwsh) |
| `packageManager` | `string` | Yes | Selected package manager |
| `versionManagers` | `string[]` | No | Selected version managers |
| `languages` | `object[]` | No | Languages and pinned versions |
| `devRoot` | `string` | No | Developer workspace root path |
| `contexts` | `object[]` | No | Named developer contexts |
| `gitAuth` | `object` | No | Git authentication method per context |
| `tools` | `string[]` | No | Additional CLI tools to install |
| `browser` | `string` | No | Preferred browser |
| `appConfigs` | `object` | No | App configuration domains to apply |
| `accounts` | `object[]` | No | Service account connections |
| `secretsBackend` | `string` | No | Secrets storage backend |
