# tilde Configuration Format

> JSON Schema: `https://thingstead.io/tilde/config-schema/v1.json`  
> Schema version: `1.5`

`tilde.config.json` is the declarative configuration file for tilde. It describes your entire developer environment so that `tilde` can reproduce it on any machine.

---

## Annotated Example

The following complete example shows every field with inline explanations. (Standard JSON does not support `//` comments — strip them before using this example as a real config file.)

```json
{
  "$schema": "https://thingstead.io/tilde/config-schema/v1.json", // enables editor autocomplete and validation
  "schemaVersion": "1.5",      // schema version — "1.5" adds browser, editors, aiTools, languageBindings
  "version": "1",              // tilde configuration format revision — always "1"
  "os": "macos",               // target OS — only macOS is currently supported
  "shell": "zsh",              // your primary shell: "zsh", "bash", or "fish"
  "packageManager": "homebrew", // package manager — only Homebrew is currently supported
  "workspaceRoot": "~/Developer", // root directory where all your projects live
  "dotfilesRepo": "~/Developer/personal/dotfiles", // path to your dotfiles repository
  "secretsBackend": "1password", // where should tilde store and retrieve your secrets? — "1password", "keychain", or "env-only"
  "versionManagers": [
    { "name": "vfox" }          // version managers to install: "vfox", "nvm", "pyenv", or "sdkman"
  ],
  "languages": [
    { "name": "node", "version": "22.0.0", "manager": "vfox" }, // language runtimes; "manager" must match a name in versionManagers
    { "name": "python", "version": "3.12.0", "manager": "vfox" }
  ],
  "tools": ["ripgrep", "fzf", "bat"], // Homebrew packages to install (optional)
  "configurations": {
    "git": true,           // write ~/.gitconfig and per-context gitconfigs
    "vscode": true,        // write VS Code settings per context
    "aliases": false,      // write shell aliases file
    "osDefaults": false,   // apply macOS system preferences from defaults.json
    "direnv": true         // install direnv and generate .envrc files for auto context-switching
  },
  "accounts": [
    {
      "service": "npm",                           // service name (optional, can add multiple)
      "identifier": "jane@example.com",           // username or email for this service
      "secretRef": "op://Personal/NPM/token"      // secrets backend reference for credentials
    }
  ],
  "contexts": [
    {
      "label": "personal",                    // unique name for this context
      "path": "~/Developer/personal",         // filesystem path this context applies to
      "git": {
        "name": "Jane Doe",                   // your git author name in this context
        "email": "jane@example.com"           // your git author email — must be a valid address
      },
      "github": { "username": "janedoe" },    // your GitHub username for the gh CLI (optional)
      "authMethod": "gh-cli",                 // how will you authenticate to GitHub in this context? — "gh-cli", "https", or "ssh"
      "envVars": [],                          // environment variables to load when you're working in this context (use your secrets backend references — not raw tokens)
      "vscodeProfile": "personal",            // which VS Code profile should be active in this context? (optional)
      "isDefault": true,                      // is this the context tilde should use when you're not inside any named workspace path? (optional)
      "languageBindings": [                   // NEW v1.5: runtime version bindings for this context
        { "runtime": "nodejs", "version": "22.0.0" }
      ]
    },
    {
      "label": "work",
      "path": "~/Developer/work",
      "git": {
        "name": "Jane Doe",
        "email": "jane@acme.com"
      },
      "github": { "username": "jane-acme" },
      "authMethod": "ssh",
      "envVars": [
        { "key": "NPM_TOKEN", "value": "op://Work/NPM/token" } // use backend references, not raw values
      ],
      "vscodeProfile": "work",
      "isDefault": false
    }
  ]
}
```

---

## Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string | no | JSON Schema URL for editor tooling (autocomplete, inline validation) |
| `schemaVersion` | string | **yes** | Schema version — current value is `"1.5"`. tilde uses this for automatic migrations from v1. |
| `version` | `"1"` | **yes** | tilde configuration format revision — always `"1"` |
| `os` | `"macos"` | **yes** | Target OS — only macOS is currently supported |
| `shell` | one of `"zsh"`, `"bash"`, `"fish"` | **yes** | Your primary shell |
| `packageManager` | `"homebrew"` | **yes** | Package manager — only Homebrew is currently supported |
| `versionManagers` | list of VersionManager | **yes** | Version managers to install |
| `languages` | list of Language | **yes** | Language runtimes to install |
| `workspaceRoot` | string | **yes** | Root directory for all your projects (e.g. `~/Developer`) |
| `dotfilesRepo` | string | **yes** | Path to your dotfiles repository — must be an absolute path or start with `~/` |
| `contexts` | list of DeveloperContext | **yes** | One or more developer contexts (at least one required) |
| `tools` | list of strings | no | Homebrew packages to install |
| `configurations` | ConfigurationDomains | **yes** | Feature flags for which dotfiles and integrations tilde manages |
| `accounts` | list of Account | no | Service account references |
| `secretsBackend` | one of `"1password"`, `"keychain"`, `"env-only"` | **yes** | Where should tilde store and retrieve your secrets? |
| `browser` | BrowserConfig | no | **NEW v1.5** — browser selection and default configuration |
| `editors` | EditorsConfig | no | **NEW v1.5** — editor configuration (primary + additional editors) |
| `aiTools` | list of AIToolConfig | no | **NEW v1.5** — AI coding tools to install and configure |

---

## VersionManager

```json
{ "name": "vfox" }
```

| Field | Type | Valid values |
|-------|------|-------------|
| `name` | string | `"vfox"`, `"nvm"`, `"pyenv"`, `"sdkman"` |

---

## Language

```json
{ "name": "node", "version": "22.0.0", "manager": "vfox" }
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Language identifier (e.g. `node`, `python`, `java`) |
| `version` | string | Version string (e.g. `22.0.0`, `3.12.0`) |
| `manager` | string | Must match one of the names in your `versionManagers` list |

> **Validation**: Every language's `manager` value must reference a manager listed in `versionManagers`.

---

## DeveloperContext

A context maps a filesystem path to a git identity and optional tooling configuration.

```json
{
  "label": "work",
  "path": "~/Developer/work",
  "git": { "name": "Jane Doe", "email": "jane@acme.com" },
  "github": { "username": "jane-acme" },
  "authMethod": "ssh",
  "envVars": [
    { "key": "NPM_TOKEN", "value": "op://Work/NPM/token" }
  ],
  "vscodeProfile": "work",
  "isDefault": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | string | **yes** | Unique name for this context — no two contexts may share a label |
| `path` | string | **yes** | Workspace path this context applies to |
| `git.name` | string | **yes** | Git author name in this context |
| `git.email` | string | **yes** | Git author email — must be a valid email address |
| `github.username` | string | no | GitHub username for the `gh` CLI |
| `authMethod` | one of `"gh-cli"`, `"https"`, `"ssh"` | **yes** | How will you authenticate to GitHub in this context? — `gh-cli`: use the GitHub CLI; `https`: HTTPS with a credential helper; `ssh`: SSH key pair |
| `envVars` | list of EnvVarReference | no | Environment variables to load when you're working in this context (use your secrets backend references — not raw tokens) |
| `vscodeProfile` | string | no | Which VS Code profile should be active in this context? |
| `isDefault` | boolean | no | Is this the context tilde should use when you're not inside any named workspace path? |
| `languageBindings` | list of LanguageBinding | no | **NEW v1.5** — runtime version bindings for this context. Written as version files (`.nvmrc`, `.vfox.json`, `.tool-versions`) on first tilde run. |

> **Validation**: Context labels must be unique across all contexts.

---

## EnvVarReference

Environment variables **must** use secrets backend references — raw secrets are rejected at validation time.

```json
{ "key": "GITHUB_TOKEN", "value": "op://Personal/GitHub/token" }
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Environment variable name |
| `value` | string | Backend reference (e.g. `op://Vault/Item/Field`) or plain value |

> **Security**: Values beginning with `ghp_`, `sk-`, `AKIA`, or `xox[bp]-` are **blocked** — use a secrets backend reference instead.

---

## ConfigurationDomains

Controls which dotfiles and integrations tilde manages:

```json
{
  "git": true,
  "vscode": true,
  "aliases": false,
  "osDefaults": false,
  "direnv": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `git` | boolean | Write `~/.gitconfig` and per-context gitconfigs |
| `vscode` | boolean | Write VS Code settings per context |
| `aliases` | boolean | Write shell aliases file |
| `osDefaults` | boolean | Should tilde apply macOS system preferences defined in your dotfiles? |
| `direnv` | boolean | Should tilde manage `.envrc` files for automatic context switching? |

---

## Account

```json
{ "service": "npm", "identifier": "jane@example.com", "secretRef": "op://Personal/NPM/token" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `service` | string | **yes** | Service name (e.g. `npm`, `docker`) |
| `identifier` | string | **yes** | Username or email for this service |
| `secretRef` | string | no | Secrets backend reference for credentials |

---

## Secrets Backends

| Value | Description |
|-------|-------------|
| `"1password"` | Use 1Password CLI (`op`) — reference secrets as `op://Vault/Item/Field` |
| `"keychain"` | Use macOS Keychain |
| `"env-only"` | No secrets backend; environment variables only (local non-tracked file) |

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

| Variable | Equivalent flag | Description |
|----------|----------------|-------------|
| `TILDE_CONFIG` | `--config` | Path to `tilde.config.json` |
| `TILDE_CI` | `--ci` | Non-interactive mode — set to `1` or `true` |
| `TILDE_NO_COLOR` | — | Disable color output |
| `TILDE_STATE_DIR` | — | Override `~/.tilde/` state directory |

---

## Schema Versioning and Migration

Every `tilde.config.json` written by tilde includes a `schemaVersion` string field:

```json
{
  "schemaVersion": "1.5",
  ...
}
```

### What `schemaVersion` means

The `schemaVersion` field records the version of the config file format. tilde reads this field at startup to decide whether the config needs to be updated before use.

| Value | Meaning |
|-------|---------|
| `"1.5"` | Current version — adds browser, editors, aiTools, languageBindings |
| `1` | Legacy integer — auto-migrated to `"1.5"` on first load |

### v1 → v1.5 migration

Configs with `schemaVersion: 1` (integer) are automatically migrated to `"1.5"` on first load. The migration adds default empty values for the new optional fields and rewrites the config atomically.

### How the migration runner works

When tilde loads a config whose `schemaVersion` is lower than the current version it supports, it automatically:

1. Detects the `schemaVersion` on load
2. Applies all applicable migration steps in order (oldest to newest)
3. Writes the updated config back to disk atomically (via a temp file + rename)
4. Notifies you that your config was updated

Migration steps are **additive and non-destructive** — they add defaults for new fields and rename deprecated fields, but they never remove user-provided values or alter data you have set intentionally.

**If migration fails**: tilde warns you, preserves your original config file unmodified, and offers to re-run the setup wizard so you can re-enter your preferences safely.

### Forward-version handling

If tilde reads a config whose `schemaVersion` is **higher** than the installed tilde version supports, tilde will:

1. Warn you that your config was written by a newer version of tilde
2. Open the config in **read-only mode** — no changes will be written to disk
3. Prompt you to upgrade tilde to the latest version

### Future migration template skeleton

The following is the pattern that future migration steps will follow. It is provided here as a reference for contributors adding v2 or later migrations. *(No v2 migration exists yet.)*

```typescript
// Future migration skeleton — not active code
// migrations/v2.ts

export const migrateV1toV2 = (config: unknown): unknown => {
  const c = config as Record<string, unknown>;
  // Example: rename a deprecated field
  // if ('oldFieldName' in c) {
  //   c['newFieldName'] = c['oldFieldName'];
  //   delete c['oldFieldName'];
  // }
  // Example: add a new field with a default value
  // c['newFeature'] ??= false;
  c['schemaVersion'] = 2;
  return c;
};
```

---

## CLI Reference

### `--reconfigure`

Re-open the full configuration wizard with all existing values pre-populated as defaults:

```sh
tilde --reconfigure
```

**Behaviour**:
- Loads the existing `tilde.config.json` from the path specified by `--config` (or the default location)
- Opens the full 14-step wizard with every field pre-filled from the stored config
- On completion, atomically overwrites the config file with the updated values
- On early exit (Ctrl-C or Cancel), the original config file is **not modified**

**Error cases**:
- **No config found**: tilde exits with a message directing you to run `tilde` (without `--reconfigure`) to create your initial configuration
- **Invalid config**: tilde displays each invalid field by name before opening the wizard; those fields use their wizard defaults. All other fields remain pre-populated from the stored config.
- **Early exit** (Escape or Cancel): the original config file is **not modified**. tilde exits with code `5` to indicate user cancellation.
