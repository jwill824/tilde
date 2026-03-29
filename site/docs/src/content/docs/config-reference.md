---
title: Configuration Reference
description: Complete reference for tilde.config.json — all top-level keys, types, valid values, and examples.
---

`tilde.config.json` (stored at `~/.tilde/tilde.config.json`) is the single source of
truth for your developer environment. Every key is documented below.

The file is created and maintained by the tilde interactive wizard. You can also edit
it directly — tilde validates the schema on startup.

---

### $schema

**Type**: `string`  
**Required**: No  
**Default**: `"https://tilde.sh/config-schema/v1.json"`  
**Description**: JSON Schema URL for editor validation and autocomplete. Recommended.  
**Since**: `0.1.0`

```json
{
  "$schema": "https://tilde.sh/config-schema/v1.json"
}
```

---

### schemaVersion

**Type**: `number` (integer)  
**Required**: Yes  
**Valid values**: `1` (current)  
**Default**: `1`  
**Description**: Internal schema version. Increment when breaking changes are made to
the config format. tilde uses this for automatic migrations.  
**Since**: `0.1.0`

```json
{
  "schemaVersion": 1
}
```

---

### os

**Type**: `string`  
**Required**: Yes  
**Valid values**: `"macos"`  
**Default**: `"macos"` (auto-detected)  
**Description**: Target operating system. Currently only `"macos"` is supported. This
field is set automatically by the wizard and is used to apply OS-specific defaults.  
**Since**: `0.1.0`

```json
{
  "os": "macos"
}
```

---

### shell

**Type**: `string`  
**Required**: Yes  
**Valid values**: `"zsh"` | `"bash"` | `"fish"`  
**Default**: None (selected during wizard)  
**Description**: Your primary shell. tilde writes shell configuration (aliases, exports,
hooks) to the appropriate profile file for the selected shell.  
**Since**: `0.1.0`

```json
{
  "shell": "zsh"
}
```

---

### packageManager

**Type**: `string`  
**Required**: Yes  
**Valid values**: `"homebrew"`  
**Default**: `"homebrew"`  
**Description**: The package manager used to install CLI tools. Only Homebrew is
supported on macOS. Future versions may support MacPorts or Nix.  
**Since**: `0.1.0`

```json
{
  "packageManager": "homebrew"
}
```

---

### versionManagers

**Type**: `array` of objects  
**Required**: No  
**Default**: `[]`  
**Description**: List of version managers to install and configure. Each entry installs
the named version manager and integrates it with your shell.  

Each item:

| Field | Type | Valid values |
|-------|------|-------------|
| `name` | string | `"vfox"` \| `"nvm"` \| `"pyenv"` \| `"sdkman"` |

**Since**: `0.1.0`

```json
{
  "versionManagers": [
    { "name": "vfox" }
  ]
}
```

---

### languages

**Type**: `array` of objects  
**Required**: No  
**Default**: `[]`  
**Description**: Programming languages to install. Each entry specifies the language
name, desired version, and which version manager to use. The `manager` value must
reference a name listed in `versionManagers`.  

Each item:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Language name (e.g., `"nodejs"`, `"python"`) |
| `version` | string | Version string (e.g., `"20"`, `"3.12.4"`) |
| `manager` | string | Version manager name — must match a `versionManagers[].name` |

**Since**: `0.1.0`

```json
{
  "languages": [
    { "name": "nodejs", "version": "20", "manager": "vfox" },
    { "name": "python", "version": "3.12.4", "manager": "vfox" }
  ]
}
```

---

### workspaceRoot

**Type**: `string`  
**Required**: Yes  
**Default**: None (set during wizard, e.g. `"~/dev"`)  
**Description**: Absolute path (or `~/`-prefixed path) to your local workspace root.
tilde creates this directory and organizes per-context project folders inside it.  
**Since**: `0.1.0`

```json
{
  "workspaceRoot": "~/dev"
}
```

---

### dotfilesRepo

**Type**: `string`  
**Required**: Yes  
**Default**: None  
**Description**: Absolute path or `~/`-prefixed path to your dotfiles repository.
Must start with `/` or `~/`. tilde reads dotfile templates from this directory and
writes rendered configs to the appropriate system paths.  
**Since**: `0.1.0`

```json
{
  "dotfilesRepo": "~/dev/personal/dotfiles"
}
```

---

### contexts

**Type**: `array` of objects  
**Required**: Yes (minimum 1)  
**Default**: None  
**Description**: Developer contexts — one per identity (e.g., personal, work). Each
context maps a workspace path to a git identity, GitHub account, and auth method.
Context labels must be unique.

Each item:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | string | Yes | Unique display name (e.g., `"personal"`, `"work"`) |
| `path` | string | Yes | Directory path for this context's projects |
| `git.name` | string | Yes | Git commit author name |
| `git.email` | string | Yes | Git commit author email |
| `github.username` | string | No | GitHub username for this context |
| `authMethod` | string | Yes | `"gh-cli"` \| `"https"` \| `"ssh"` |
| `envVars` | array | No | Environment variable references (backend refs, not secrets) |
| `vscodeProfile` | string | No | VS Code profile name to activate in this directory |
| `isDefault` | boolean | No | Mark as the default context |

**Since**: `0.1.0`

```json
{
  "contexts": [
    {
      "label": "personal",
      "path": "~/dev/personal",
      "git": {
        "name": "Jane Doe",
        "email": "jane@example.com"
      },
      "github": { "username": "janedoe" },
      "authMethod": "ssh",
      "isDefault": true
    }
  ]
}
```

---

### tools

**Type**: `array` of strings  
**Required**: No  
**Default**: `[]`  
**Description**: Additional CLI tools to install via Homebrew. Each entry is a valid
Homebrew formula or cask name.  
**Since**: `0.1.0`

```json
{
  "tools": ["docker", "terraform", "kubectl", "helm"]
}
```

---

### configurations

**Type**: `object`  
**Required**: Yes  
**Description**: Feature flags controlling which configuration domains tilde manages.
Set to `false` to opt out of a domain entirely.

| Field | Type | Description |
|-------|------|-------------|
| `git` | boolean | Manage global `.gitconfig` |
| `vscode` | boolean | Manage VS Code settings and profiles |
| `aliases` | boolean | Write shell aliases to profile |
| `osDefaults` | boolean | Apply macOS system defaults |
| `direnv` | boolean | Install and configure `direnv` |

**Since**: `0.1.0`

```json
{
  "configurations": {
    "git": true,
    "vscode": true,
    "aliases": true,
    "osDefaults": true,
    "direnv": true
  }
}
```

---

### accounts

**Type**: `array` of objects  
**Required**: No  
**Default**: `[]`  
**Description**: Third-party service accounts (beyond GitHub) to configure. Each
entry links a service identifier to an optional secrets backend reference.

Each item:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `service` | string | Yes | Service name (e.g., `"npm"`, `"vercel"`) |
| `identifier` | string | Yes | Username or account ID |
| `secretRef` | string | No | Reference key in your secrets backend |

**Since**: `0.1.0`

```json
{
  "accounts": [
    {
      "service": "npm",
      "identifier": "janedoe",
      "secretRef": "NPM_TOKEN"
    }
  ]
}
```

---

### secretsBackend

**Type**: `string`  
**Required**: Yes  
**Valid values**: `"1password"` | `"keychain"` | `"env-only"`  
**Default**: None (selected during wizard)  
**Description**: The backend used to resolve secret references in `contexts[].envVars`
and `accounts[].secretRef`.

| Value | Description |
|-------|-------------|
| `"1password"` | 1Password CLI (`op`) — recommended for macOS |
| `"keychain"` | macOS Keychain — no third-party dependency |
| `"env-only"` | Plain environment variables — no secrets manager |

**Since**: `0.1.0`

```json
{
  "secretsBackend": "1password"
}
```

---

## Full example

```json
{
  "$schema": "https://tilde.sh/config-schema/v1.json",
  "schemaVersion": 1,
  "os": "macos",
  "shell": "zsh",
  "packageManager": "homebrew",
  "versionManagers": [
    { "name": "vfox" }
  ],
  "languages": [
    { "name": "nodejs", "version": "20", "manager": "vfox" },
    { "name": "python", "version": "3.12.4", "manager": "vfox" }
  ],
  "workspaceRoot": "~/dev",
  "dotfilesRepo": "~/dev/personal/dotfiles",
  "contexts": [
    {
      "label": "personal",
      "path": "~/dev/personal",
      "git": { "name": "Jane Doe", "email": "jane@example.com" },
      "github": { "username": "janedoe" },
      "authMethod": "ssh",
      "isDefault": true
    }
  ],
  "tools": ["docker", "terraform"],
  "configurations": {
    "git": true,
    "vscode": true,
    "aliases": true,
    "osDefaults": true,
    "direnv": true
  },
  "accounts": [
    { "service": "npm", "identifier": "janedoe", "secretRef": "NPM_TOKEN" }
  ],
  "secretsBackend": "1password"
}
```
