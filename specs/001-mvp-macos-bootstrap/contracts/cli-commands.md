# Contract: CLI Commands

The tilde CLI exposes the following commands and flags.

---

## Entry Commands

### `tilde` / `tilde install`

The primary command. Runs either config-first or prompt-first mode depending on context.

```
tilde [install] [options]

Options:
  --config <path|url>   Load tilde.config.json from a file path or HTTPS URL.
                        Activates config-first mode.
  --yes, --ci           Non-interactive mode. Requires a complete --config.
                        Errors on any missing required field.
  --reconfigure         Re-run wizard from scratch, ignoring any existing config.
  --resume              Resume from last checkpoint (default if checkpoint exists).
  --no-resume           Ignore checkpoint and start fresh.
  --dry-run             Print all planned actions without executing them.
  --verbose             Show full command output during installs.
  --help, -h            Show help.
  --version, -v         Show tilde version.
```

**Mode selection logic**:
1. `--config` provided → config-first mode
2. `tilde.config.json` found in cwd or `~/Developer/*/dotfiles/` → offer config-first
3. Checkpoint exists and `--no-resume` not passed → offer resume
4. Otherwise → prompt-first wizard

---

### `tilde capture`

Run environment capture standalone, without the full wizard.

```
tilde capture [options]

Options:
  --output <path>   Write capture report to a JSON file instead of stdout.
  --dry-run         Print what would be scanned without reading file contents.
```

---

### `tilde context`

Inspect and manage the active developer context.

```
tilde context [subcommand]

Subcommands:
  list              List all configured contexts
  current           Show the currently active context
  switch <label>    Manually switch to a named context
```

---

### `tilde plugin`

Manage tilde plugins.

```
tilde plugin [subcommand]

Subcommands:
  list              List all registered plugins (first-party and community)
  add <name>        Install a community plugin (npm package tilde-plugin-<name>)
  remove <name>     Remove a community plugin
  info <name>       Show plugin details and supported interface
```

---

### `tilde config`

Inspect and validate the active config file.

```
tilde config [subcommand]

Subcommands:
  validate [path]   Validate a config file against the schema
  show [path]       Pretty-print the active config
  edit              Open config in $EDITOR
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error (see stderr) |
| 2 | Invalid config / schema validation failure |
| 3 | Missing required field in --ci mode |
| 4 | Plugin error (see stderr for plugin name) |
| 5 | User cancelled (Ctrl-C during wizard) |

---

## Environment Variables

| Variable | Effect |
|----------|--------|
| `TILDE_CONFIG` | Path to config file (same as `--config`) |
| `TILDE_STATE_DIR` | Override `~/.tilde/` state directory |
| `TILDE_NO_COLOR` | Disable color output |
| `TILDE_CI` | Equivalent to `--ci` flag |
