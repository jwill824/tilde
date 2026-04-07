# CLI Schema Contract: Wizard UX & CLI Interaction Improvements

**Branch**: `008-wizard-ux-enhancements`
**Phase**: 1 — Design
**Date**: 2026-04-01

---

## 1. `tilde update` Subcommand

### Synopsis

```
tilde update <resource> [--config <path>]
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `resource` | string | Yes | Name of the config resource to update |
| `--config` | path | No | Path to `tilde.config.json`; auto-discovered if omitted |

### Valid Resources

| Resource | Config Section Updated | Mini-Wizard Step |
|----------|----------------------|-----------------|
| `shell` | `shell` | Step 02 |
| `editor` | `editors` | Step 10 |
| `applications` | `tools` | Step 09 |
| `browser` | `browser` | Step 14 |
| `ai-tools` | `aiTools` | Step 15 |
| `contexts` | `contexts` | Step 07 (list view) |
| `languages` | `contexts[].languageBindings` | Step 05 + 07 |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Update completed successfully |
| 1 | Invalid resource name — valid list printed to stdout |
| 2 | No config file discoverable — path guidance printed |
| 3 | Config file found but invalid/unreadable |

### Error Messages

**Invalid resource name:**
```
Error: "widgets" is not a valid update resource.

Valid resources:
  shell, editor, applications, browser, ai-tools, contexts, languages

Usage: tilde update <resource>
```

**No config found:**
```
Error: No tilde.config.json found.

Searched:
  ./tilde.config.json
  ~/.config/tilde/tilde.config.json
  ~/tilde.config.json

Run the wizard first: tilde
Or specify a path: tilde update shell --config ~/dotfiles/tilde.config.json
```

---

## 2. Config-Dependent Command Error Behavior

> ⚠️ This section is superseded by [010-wizard-flow-fixes/contracts/cli-schema.md](../../010-wizard-flow-fixes/contracts/cli-schema.md) for config discovery paths.

All config-dependent commands (`tilde install`, `tilde update`) follow the same discovery and error contract.

### Config Discovery Order

```
1. --config <explicit path>         (highest priority)
2. ./tilde.config.json              (current directory)
3. ~/.config/tilde/tilde.config.json
4. ~/tilde.config.json
```

When config is found via auto-discovery, tilde MUST display:
```
Found config: ~/.config/tilde/tilde.config.json
Applying 1 workspace context, 3 tools, shell: zsh
Proceed? [Y/n]
```

When no config found and command requires one:
```
Error: tilde requires a config file to run install.
No config found at any of the standard locations.

Run the wizard to create one: tilde
Or specify: tilde install --config <path>
```

The wizard MUST NOT be invoked automatically in this scenario.

---

## 3. Wizard Step Sequence (updated)

The full wizard step order after this feature ships:

| Index | Step ID | Label | Required |
|-------|---------|-------|----------|
| 00 | `config-detection` | Config Detection | — (meta step) |
| 01 | `env-capture` | Environment Capture | Yes |
| 02 | `shell` | Shell | Yes |
| 03 | `package-manager` | Package Manager | Yes |
| 04 | `version-manager` | Version Manager | Yes |
| 05 | `languages` | Languages | Yes |
| 06 | `workspace` | Workspace Directory | Yes |
| 07 | `contexts` | Workspace Contexts | Yes |
| 08 | `git-auth` | Git Authentication | Yes |
| 09 | `tools` | Tools & Applications | Yes |
| 10 | `app-config` | Editor Configuration | **Optional** |
| 11 | `accounts` | Accounts | **Optional** |
| 12 | `secrets-backend` | Secrets Backend | Yes |
| 13 | `config-export` | Config Export | Yes |
| **14** | **`browser`** | **Browser Selection** | **Optional** ← NEW |
| **15** | **`ai-tools`** | **AI Coding Tools** | **Optional** ← NEW |

Steps 14 and 15 are inserted between `config-export` and final completion, or may be repositioned during tasks breakdown based on logical flow (e.g., before `accounts`).

---

## 4. Config Schema Version Contract

| Version | Changes |
|---------|---------|
| `1.4` (pre-spec baseline) | — |
| `1.5` (this feature) | Add `browser`, `aiTools`; extend `editors` object; add `contexts[].languageBindings` array |

**Migration rule**: Configs with `schemaVersion: '1.5'` are auto-migrated on load:
- `browser` → `{ selected: [], default: null }`
- `aiTools` → `[]`
- `editors` string → `{ primary: <value>, additional: [] }`
- `contexts[].languageBindings` → `[]` per context

---

## 5. `BrowserPlugin` API Contract

```typescript
interface BrowserPlugin {
  readonly category: "browser";
  readonly id: string;         // e.g., "chrome", "arc"
  readonly label: string;      // e.g., "Google Chrome", "Arc"
  readonly appPath: string;    // e.g., "/Applications/Arc.app"
  readonly brewCask?: string;  // e.g., "arc" — undefined if not Homebrew-installable

  detectInstalled(): Promise<boolean>;
  install(): Promise<void>;            // installs via Homebrew cask
  setAsDefault(): Promise<void>;       // invokes `defaultbrowser <id>`
}
```

## 6. `EditorPlugin` API Contract

```typescript
interface EditorPlugin {
  readonly category: "editor";
  readonly id: string;         // e.g., "neovim", "cursor", "webstorm"
  readonly label: string;      // e.g., "Neovim", "Cursor", "WebStorm"
  readonly brewCask?: string;  // e.g., "neovim", "cursor"

  detectInstalled(): Promise<boolean>;
  install(): Promise<void>;
  applyProfile?(): Promise<void>;  // optional — applies dotfiles/settings
  getProfileGuidance?(): string;   // optional — returns human-readable setup instructions
}
```

---

## 7. `--reconfigure` Flag Contract

### Synopsis

```
tilde --reconfigure [--config <path>]
```

### Behavior

| Scenario | Outcome |
|----------|---------|
| Config found, valid | Wizard opens with all fields pre-populated from existing config |
| Config found, validation errors | Invalid field list shown as warnings; wizard opens with valid partial values pre-populated |
| Config not found (ENOENT) | Error message shown referencing the searched path; wizard NOT launched; exit code 2 |

### Error Messages

**Config not found:**
```
Reconfigure Error
Config file not found at <path>.
Run `tilde` (without --reconfigure) to create your initial configuration.
```

**Config has validation errors (non-blocking):**
```
⚠ Config has invalid fields — wizard will use defaults for these:
  • <field.path>: <issue message>
  • ...
```
(Wizard then opens below with remaining valid fields.)

### Implementation

- `ReconfigureMode` (`src/modes/reconfigure.tsx`) handles the three scenarios above.
- On wizard completion, `atomicWriteConfig(configPath, content)` overwrites the original file.
- The `--reconfigure` flag is parsed in `src/index.tsx` and routes to `ReconfigureMode` before any other mode is entered.
