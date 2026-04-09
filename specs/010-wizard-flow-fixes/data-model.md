# Data Model: Wizard Flow Fixes & Enhancements

**Branch**: `010-wizard-flow-fixes` | **Date**: 2026-04-07

---

## Entities

### `StepFrame` (extended usage)

Exists in `src/modes/wizard.tsx`. No type change — the `values` field already supports arbitrary key-value pairs. This spec defines what each affected step must store.

```typescript
interface StepFrame {
  stepIndex: number;
  values: Record<string, unknown>;
}
```

**Per-step `values` shape**:

| Step | Key | Type | Notes |
|------|-----|------|-------|
| `05-languages` | `entries` | `LanguageEntry[]` | Full array including blank versions |
| `05-languages` | `currentIdx` | `number` | Index of the active language input |
| `09-tools` | `tools` | `string[]` | Homebrew formula names (existing) |
| `09-tools` | `noteApps` | `NoteAppSelection[]` | New — selected note-taking apps |
| All input steps | `<field>` | varies | Existing pattern, unchanged |

---

### `LanguageEntry`

Exists in `src/steps/05-languages.tsx`. No shape change.

```typescript
interface LanguageEntry {
  name: string;     // e.g., "node", "python"
  manager: string;  // e.g., "nvm", "vfox"
  version: string;  // empty string = unbound (omitted from saved config)
}
```

**Validation rule**: On save, entries where `version.trim() === ''` are omitted entirely from `config.contexts[].languageBindings`. No null, no empty string — absence signals "unbound". This logic already exists in the filter (`.filter(e => e.version.trim())`).

**State transitions**:
```
Entry created (version = '') → user inputs version → version stored → omit-or-save decision on complete
                                                   ↑ back-nav: restored from StepFrame.values
```

---

### `NoteAppSelection`

New. Stored in `StepFrame.values.noteApps` and passed to config on wizard completion.

```typescript
interface NoteAppSelection {
  id: string;           // e.g., "obsidian", "bear"
  label: string;        // e.g., "Obsidian", "Bear"
  brewCask: string | null;  // null = App Store only
  available: 'homebrew' | 'app-store';
}
```

**Static catalog** (in `src/steps/09-tools.tsx` or `src/data/note-apps.ts`):

```typescript
export const NOTE_TAKING_APPS: NoteAppSelection[] = [
  { id: 'obsidian', label: 'Obsidian', brewCask: 'obsidian', available: 'homebrew' },
  { id: 'notion',   label: 'Notion',   brewCask: 'notion',   available: 'homebrew' },
  { id: 'logseq',   label: 'Logseq',   brewCask: 'logseq',   available: 'homebrew' },
  { id: 'bear',     label: 'Bear',     brewCask: null,        available: 'app-store' },
];
```

**Config storage**: Selected apps where `available === 'homebrew'` are added to the tools/applications section of the config (same bucket as other Homebrew casks). Apps where `available === 'app-store'` are recorded separately as a post-install reminder list.

---

### `ConfigDiscoveryResult`

Already exists in `src/steps/00-config-detection.tsx`. Refined to add a "no" outcome.

```typescript
type ConfigDiscoveryOutcome =
  | { action: 'use';     configPath: string }  // user chose to use found config
  | { action: 'specify'; configPath: string }  // user entered a custom path
  | { action: 'decline' }                      // user said "no" → caller exits with instruction
  | { action: 'wizard' }                       // no config found → proceed to wizard
```

---

### `DiscoveryPath` (conceptual, not a new type)

Represents a single entry in the search order returned by `getDiscoveryPaths()`.

```
Priority 1: <cwd>/tilde.config.json
Priority 2: <git-repo-root>/tilde.config.json  (omitted if not in a git repo)
Priority 3: ~/.tilde/tilde.config.json          (may be a symlink)
```

The function signature stays the same (`getDiscoveryPaths(): string[]`) — it returns 2 or 3 entries depending on whether git root detection succeeds and whether git root differs from cwd.

---

## State Transitions: Wizard Navigation with Value Restoration

```
Step N (fresh render, no history frame)
  → user inputs values
  → advance(): push StepFrame{ stepIndex: N, values: { ...captured } }
  → render Step N+1

Step N+1
  → user presses back
  → goBack(): pop frame, currentStep = N
  → render Step N with initialValues = frame.values  ← NEW

Step N (re-render with initialValues)
  → lazy useState initializer: useState(() => initialValues.entries ?? [])
  → UI shows previously entered values
  → user may edit or advance again
```

---

## No Schema Version Bump Required

This feature does not add new top-level config fields. The `noteApps` selection maps to existing `tools` (Homebrew casks) and a new in-memory reminder list. The `languageBindings` field already exists per spec 008. Config `schemaVersion` remains `"1.4"`.
