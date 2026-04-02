---
title: Configuration Format
description: Complete field-by-field reference for tilde.config.json — schema, types, valid values, and examples.
---

> JSON Schema: `https://thingstead.io/tilde/config-schema/v1.json`  
> Schema version: `1.5`

`tilde.config.json` is the declarative configuration file for tilde. It describes your entire developer environment so that `tilde` can reproduce it on any machine.

## Minimal Example

```json
{
  "$schema": "https://thingstead.io/tilde/config-schema/v1.json",
  "schemaVersion": "1.5",
  "os": "macos",
  "shell": "zsh",
  "packageManager": "homebrew",
  "versionManagers": [{ "name": "vfox" }, { "name": "mise" }],
  "languages": [
    { "name": "node", "version": "22.0.0", "manager": "vfox" }
  ],
  "workspaceRoot": "~/Developer",
  "dotfilesRepo": "~/Developer/personal/dotfiles",
  "contexts": [
    {
      "label": "personal",
      "path": "~/Developer/personal",
      "git": { "name": "Jane Doe", "email": "jane@example.com" },
      "github": { "username": "janedoe" },
      "authMethod": "gh-cli",
      "envVars": [],
      "languageBindings": [
        { "runtime": "nodejs", "version": "22.0.0" }
      ]
    }
  ],
  "tools": ["ripgrep", "fzf", "bat"],
  "configurations": {
    "git": true,
    "vscode": false,
    "aliases": false,
    "osDefaults": false,
    "direnv": true
  },
  "secretsBackend": "1password",
  "browser": { "name": "arc", "isDefault": true },
  "editors": { "primary": "vscode", "additional": ["cursor"] },
  "aiTools": [{ "name": "claude-code" }]
}
```

---

## Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | `string` | no | JSON Schema URL for editor tooling |
| `schemaVersion` | `"1.5"` | **yes** | Schema version used for automatic migrations |
| `os` | `"macos"` | **yes** | Target OS — only `macos` supported |
| `shell` | `"zsh" \| "bash" \| "fish"` | **yes** | Primary shell |
| `packageManager` | `"homebrew"` | **yes** | Package manager — only `homebrew` supported |
| `versionManagers` | `VersionManager[]` | **yes** | List of version managers to install |
| `languages` | `Language[]` | **yes** | Language runtimes to install |
| `workspaceRoot` | `string` | **yes** | Root directory for all projects (e.g. `~/Developer`) |
| `dotfilesRepo` | `string` | **yes** | Path to your dotfiles repository (absolute or `~/`-prefixed) |
| `contexts` | `DeveloperContext[]` | **yes** | One or more developer contexts (at least one required) |
| `tools` | `string[]` | no | Homebrew packages to install |
| `configurations` | `ConfigurationDomains` | **yes** | Feature flags for which dotfiles to manage |
| `accounts` | `Account[]` | no | Service account references |
| `secretsBackend` | `"1password" \| "keychain" \| "env-only"` | **yes** | Where to store/retrieve secrets |
| `browser` | `BrowserConfig` | no | NEW v1.5 — browser selection |
| `editors` | `EditorsConfig` | no | NEW v1.5 — editor configuration |
| `aiTools` | `AIToolConfig[]` | no | NEW v1.5 — AI coding tools |

---

## VersionManager

```json
{ "name": "vfox" }
```

| Field | Type | Values |
|-------|------|--------|
| `name` | `string` | `"vfox"`, `"nvm"`, `"pyenv"`, `"sdkman"`, `"mise"` |

---

## Language

```json
{ "name": "node", "version": "22.0.0", "manager": "vfox" }
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Language identifier (e.g. `node`, `python`, `java`) |
| `version` | `string` | Version string (e.g. `22.0.0`, `3.12.0`) |
| `manager` | `string` | Must match a name in `versionManagers` |

> **Validation**: `languages[].manager` must reference a manager listed in `versionManagers`.

---

## DeveloperContext

A context maps a filesystem path to a git identity and optional tooling configuration.

```json
{
  "label": "work",
  "path": "~/Developer/work",
  "git": { "name": "Jane Doe", "email": "jane@acme.com" },
  "github": { "username": "jane-acme" },
  "authMethod": "gh-cli",
  "envVars": [
    { "key": "NPM_TOKEN", "value": "op://Work/NPM/token" }
  ],
  "vscodeProfile": "work",
  "isDefault": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | `string` | **yes** | Unique identifier for this context |
| `path` | `string` | **yes** | Workspace path this context applies to |
| `git.name` | `string` | **yes** | Git author name |
| `git.email` | `string` | **yes** | Git author email |
| `github.username` | `string` | no | GitHub username for `gh` CLI |
| `authMethod` | `"gh-cli" \| "https" \| "ssh"` | **yes** | Git authentication method |
| `envVars` | `EnvVarReference[]` | no | Environment variables to load in this context |
| `vscodeProfile` | `string` | no | VS Code profile name for this context |
| `isDefault` | `boolean` | no | Mark as the default context |
| `languageBindings` | `LanguageBinding[]` | no | NEW v1.5 — runtime version bindings for this context |

> **Validation**: Context labels must be unique across all contexts.

---

## EnvVarReference

Environment variables **must** use secrets backend references — raw secrets are rejected at validation time.

```json
{ "key": "GITHUB_TOKEN", "value": "op://Personal/GitHub/token" }
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Environment variable name |
| `value` | `string` | Backend reference (e.g. `op://Vault/Item/Field`) or plain value |

> **Security**: Values matching `ghp_`, `sk-`, `AKIA`, or `xox[bp]-` are **blocked** — use a secrets backend reference instead.

---

## ConfigurationDomains

Controls which dotfiles and integrations tilde manages:

```json
{
  "git": true,
  "vscode": false,
  "aliases": false,
  "osDefaults": false,
  "direnv": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `git` | `boolean` | Write `~/.gitconfig` and per-context gitconfigs |
| `vscode` | `boolean` | Write VS Code settings per context |
| `aliases` | `boolean` | Write shell aliases file |
| `osDefaults` | `boolean` | Apply macOS `defaults write` settings from `defaults.json` |
| `direnv` | `boolean` | Install direnv and generate `.envrc` files |

---

## Account

```json
{ "service": "npm", "identifier": "jane@example.com", "secretRef": "op://Personal/NPM/token" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `service` | `string` | **yes** | Service name |
| `identifier` | `string` | **yes** | Username or email |
| `secretRef` | `string` | no | Secrets backend reference for credentials |

---

## Secrets Backends

| Value | Description |
|-------|-------------|
| `"1password"` | Use 1Password CLI (`op`) for secret references |
| `"keychain"` | Use macOS Keychain |
| `"env-only"` | No secrets backend; environment variables only |

---

## File Locations

When tilde writes dotfiles, they go into your `dotfilesRepo`:

| Dotfile | Location in repo |
|---------|-----------------|
| Global `.gitconfig` | `git/.gitconfig` |
| Per-context gitconfig | `git/.gitconfig-{label}` |
| `.zshrc` | `shell/.zshrc` |
| VS Code settings | `vscode/{label}-settings.json` |
| macOS defaults | `defaults.json` (read from repo) |

Symlinks are created from `~/.gitconfig` → `{dotfilesRepo}/git/.gitconfig`, etc.

---

## Environment Variables

| Variable | Equivalent | Description |
|----------|-----------|-------------|
| `TILDE_CONFIG` | `--config` | Path to `tilde.config.json` |
| `TILDE_CI` | `--ci` | Non-interactive mode (`1` or `true`) |
| `TILDE_NO_COLOR` | — | Disable color output |
| `TILDE_STATE_DIR` | — | Override `~/.tilde/` state directory |

---

## LanguageBinding

```json
{ "runtime": "nodejs", "version": "22.0.0" }
```

| Field | Type | Description |
|-------|------|-------------|
| `runtime` | `string` | Runtime identifier (e.g. `nodejs`, `python`, `java`) |
| `version` | `string` | Version string to pin for this context |

> Written as `.nvmrc`, `.tool-versions`, or `.vfox.json` in the context's workspace directory on first tilde run.

---

## BrowserConfig

```json
{ "name": "arc", "isDefault": true }
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Browser identifier (e.g. `"chrome"`, `"firefox"`, `"arc"`, `"brave"`) |
| `isDefault` | `boolean` | Set as the macOS default browser |

---

## EditorsConfig

```json
{ "primary": "vscode", "additional": ["cursor"] }
```

| Field | Type | Description |
|-------|------|-------------|
| `primary` | `string` | Primary editor: `"vscode"`, `"cursor"`, `"neovim"`, `"jetbrains"`, `"zed"` |
| `additional` | `string[]` | Additional editors to install |

---

## AIToolConfig

```json
{ "name": "claude-code" }
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Tool identifier: `"claude-code"`, `"claude-desktop"`, `"cursor"`, `"windsurf"`, `"github-copilot-cli"` |

---

## Schema Versioning

Every `tilde.config.json` written by tilde includes a `schemaVersion` string field:

```json
{
  "schemaVersion": "1.5",
  ...
}
```

### What the version means

| Value | Meaning |
|-------|---------|
| `1` | Baseline schema (integer, legacy format — auto-migrated) |
| `"1.5"` | Current version — adds `browser`, `editors`, `aiTools`, `languageBindings` |

### Migration notifications

When tilde loads a config with an older `schemaVersion`, it automatically runs all applicable migration steps, rewrites the config atomically, and prints a notification. No manual action is required.

### Future-version warning

If tilde reads a config with a `schemaVersion` **higher** than the installed version supports, it prints a warning and opens the config in read-only mode (no rewrite). To resolve: upgrade tilde to the latest version.

---

## CLI Reference

### `--reconfigure`

Re-open the full configuration wizard with all existing values pre-populated as defaults:

```sh
tilde --reconfigure
```

**Behaviour**:
- Loads the existing `tilde.config.json` from the path specified by `--config` (or the default location)
- Opens the full 16-step wizard with every field pre-filled from the stored config
- On completion, atomically overwrites the config file with the updated values
- On early exit (Ctrl-C or Cancel), the original config file is **not modified**

**Error cases**:
- **No config found**: tilde exits with a message directing you to run `tilde` (without `--reconfigure`) to create your initial configuration
- **Invalid config**: tilde displays each invalid field by name before opening the wizard; those fields use their wizard defaults. All other fields remain pre-populated from the stored config.
- **Early exit** (Escape or Cancel): the original config file is **not modified**. tilde exits with code `5` to indicate user cancellation.

