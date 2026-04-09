# CLI Schema Contract: Wizard Flow Fixes & Enhancements

**Branch**: `010-wizard-flow-fixes`
**Phase**: 1 — Design
**Date**: 2026-04-07
**Supersedes**: `specs/008-wizard-ux-enhancements/contracts/cli-schema.md` §2 (Config Discovery Order)

---

## 1. Config Discovery Order

The following search order applies to all config-dependent commands when `--config` is not provided. The first path where a file exists is used.

```
Priority 1: --config <explicit path>           (CLI arg or TILDE_CONFIG env var)
Priority 2: <cwd>/tilde.config.json            (current working directory)
Priority 3: <git-repo-root>/tilde.config.json  (git root of cwd; skipped if not in a git repo)
Priority 4: ~/.tilde/tilde.config.json         (canonical home location; may be a symlink)
```

**Notes**:
- Git root detection uses `git rev-parse --show-toplevel` with a 1-second timeout; if the command fails or times out, Priority 3 is silently skipped.
- If Priority 2 (cwd) and Priority 3 (git root) resolve to the same directory, only one path is searched.
- `~/.tilde/tilde.config.json` is resolved following symlinks — no special handling needed.

**Replaces prior contract** (`specs/008-wizard-ux-enhancements/contracts/cli-schema.md` §2):

| Old path | New path |
|----------|----------|
| `~/.config/tilde/tilde.config.json` | *(removed)* |
| `~/tilde.config.json` | *(removed)* |
| *(not present)* | `<git-repo-root>/tilde.config.json` ← NEW |
| *(not present)* | `~/.tilde/tilde.config.json` ← NEW canonical home |

---

## 2. Config Discovery Prompt (Interactive Mode Only)

When a config is found via auto-discovery (Priorities 2–4) and `--config` was **not** explicitly provided, and the command is interactive (`tilde` or `tilde install` without `--ci`/`--yes`):

### Prompt UI

```
Found tilde.config.json: ~/.tilde/tilde.config.json
Use this config?

❯ Yes — apply this config
  No — I'll specify one manually
  Enter a path...
```

### Response Behaviors

| Selection | Behavior | Exit Code |
|-----------|----------|-----------|
| **Yes** | Enter `config-first` mode with the discovered path | (continues) |
| **No** | Print instruction and exit | 0 |
| **Enter a path...** | Show text input; user types path; validate exists; enter `config-first` mode | (continues) |

### "No" Output

```
Run tilde install --config <path> to proceed.
```

The `<path>` placeholder is literal — the user must supply their own path. Exit code 0 (this is a deliberate choice, not an error).

---

## 3. No-Config Error (Config-Required Commands)

When no config is found anywhere in the discovery order and the command requires one (`tilde install`, `tilde update`):

```
Error: tilde requires a config file to run install.
No config found at any of the standard locations.

Searched:
  <cwd>/tilde.config.json
  <git-root>/tilde.config.json    ← omitted line if not in a git repo
  ~/.tilde/tilde.config.json

Run the wizard to create one: tilde
Or specify: tilde install --config <path>
```

Exit code: 2

---

## 4. Wizard Step: Languages (Step 05) — Back-Navigation Contract

When a user navigates back from step 06 to step 05:

- All previously entered language versions **must** be restored exactly as entered.
- The active input cursor position (`currentIdx`) must be restored to its last position.
- Blank (unbound) versions must be shown as blank inputs — not as the default empty placeholder.

On wizard completion, language entries where `version.trim() === ''` are **omitted** from `config.contexts[].languageBindings`. No `null`, no `""` — omission signals "unbound".

---

## 5. Note-Taking App Catalog (Step 09)

The tools step presents a note-taking app sub-section with the following static catalog:

| App | Brew Cask | Availability | Install Behavior |
|-----|-----------|--------------|-----------------|
| Obsidian | `obsidian` | Homebrew | `brew install --cask obsidian` |
| Notion | `notion` | Homebrew | `brew install --cask notion` |
| Logseq | `logseq` | Homebrew | `brew install --cask logseq` |
| Bear | — | App Store only | Post-wizard reminder note (no brew install) |

### Bear Handling

When Bear is selected:
- A post-install note is displayed: `Bear is available on the App Store. Install it manually at: https://bear.app`
- Bear is **not** added to the Homebrew install list.
- Bear's selection is recorded in the wizard state for display in the completion summary.

### Config Output

Selected Homebrew-installable note-taking apps are written to the same `tools` config section as other cask-installed applications:

```json
{
  "tools": ["obsidian", "notion"]
}
```

---

## 6. `getDiscoveryPaths()` Function Contract

**Module**: `src/utils/config-discovery.ts`

```typescript
// Returns 2–3 paths in priority order (cwd, optional git root, ~/.tilde/)
export function getDiscoveryPaths(): Promise<string[]>
// Note: signature changes from sync to async to support git root detection
```

**Return value**: Array of 2–3 absolute paths. Git root path is included only if:
1. `git rev-parse --show-toplevel` succeeds within 1 second, AND
2. The resolved root directory differs from `process.cwd()`

---

## 7. Step Component `initialValues` Prop Contract

All wizard step components that accept user input must implement:

```typescript
interface BaseStepProps {
  onComplete: (values: Record<string, unknown>) => void;
  onBack?: () => void;
  isOptional?: boolean;
  initialValues?: Record<string, unknown>;  // ← required in all input steps
}
```

The wizard (`src/modes/wizard.tsx`) passes `initialValues` populated from `StepFrame.values` when rendering a step that already has a frame in history. Steps use lazy `useState` initialization:

```typescript
const [field, setField] = useState(() => (initialValues?.field as FieldType) ?? defaultValue);
```
