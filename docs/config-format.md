# tilde.config.json Format

> JSON Schema: `https://tilde.sh/config-schema/v1.json`  
> Schema version: `1`

`tilde.config.json` is the declarative configuration file for tilde. It describes your entire macOS developer environment so that `tilde` can reproduce it on any machine.

## Minimal Example

```json
{
  "$schema": "https://tilde.sh/config-schema/v1.json",
  "version": "1",
  "os": "macos",
  "shell": "zsh",
  "packageManager": "homebrew",
  "versionManagers": [{ "name": "vfox" }],
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
      "envVars": []
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
  "secretsBackend": "1password"
}
```

---

## Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | `string` | no | JSON Schema URL for editor tooling |
| `version` | `"1"` | **yes** | Schema version — always `"1"` |
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

---

## VersionManager

```json
{ "name": "vfox" }
```

| Field | Type | Values |
|-------|------|--------|
| `name` | `string` | `"vfox"`, `"nvm"`, `"pyenv"`, `"sdkman"` |

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
