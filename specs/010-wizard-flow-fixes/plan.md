# Implementation Plan: Wizard Flow Fixes & Enhancements

**Branch**: `010-wizard-flow-fixes` | **Date**: 2026-04-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-wizard-flow-fixes/spec.md`

## Summary

Fix four wizard regressions and enhancements in the tilde CLI: (1) restore step values on back-navigation so no user input is lost, (2) fix multi-language sequential traversal losing state mid-step, (3) update config auto-discovery search paths and add an explicit "found config — use it?" prompt with a "no → exit with instruction" path, and (4) add a structured note-taking app catalog to the tools step. All changes are in-process TypeScript/React/Ink components with Vitest test coverage.

## Technical Context

**Language/Version**: TypeScript 5.x (ESM, `.js` imports), Node.js 20+
**Primary Dependencies**: React 18, Ink 5 (CLI UI), Zod (schema validation), fast-glob, execa
**Storage**: JSON config file (`tilde.config.json`), atomic writes via `fs.rename()`
**Testing**: Vitest — `npm test` (unit), `npx vitest run --config vitest.integration.config.ts` (integration), `npx vitest run --config vitest.contract.config.ts` (contract)
**Target Platform**: macOS (darwin), interactive TTY
**Project Type**: CLI tool (Ink/React terminal UI)
**Performance Goals**: Wizard step transitions must be instant (no visible delay); config discovery must resolve in < 500ms
**Constraints**: No new npm dependencies; Ink requires TTY raw mode (non-TTY path is guarded in index.tsx); ESM-only (no CJS require)
**Scale/Scope**: Single-user setup tool; ~16 wizard steps; ~6 source files modified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| No new external dependencies | ✅ Pass | All changes use existing ink, react, node:fs, node:path |
| Atomic file writes | ✅ Pass | Config writes continue to use `atomicWriteConfig` (src/config/writer.ts) |
| Schema version bump required? | ✅ No | No new config fields added in this feature |
| ESM-only (no CJS) | ✅ Pass | All new files use `.js` imports |
| macOS only assertion remains | ✅ Pass | `assertMacOS()` guard unchanged |
| Ink TTY guard preserved | ✅ Pass | `process.stdin.isTTY` check in index.tsx stays |

## Project Structure

### Documentation (this feature)

```text
specs/010-wizard-flow-fixes/
├── plan.md              # This file
├── research.md          # Phase 0 output (written below)
├── data-model.md        # Phase 1 output (written below)
├── contracts/
│   └── cli-schema.md    # Updated config discovery + prompt contract
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── utils/
│   └── config-discovery.ts    # UPDATE: discovery paths + git root search
├── steps/
│   ├── 00-config-detection.tsx  # UPDATE: use shared discovery util, "no" → exit
│   ├── 05-languages.tsx         # FIX: accept initialValues, restore on back-nav
│   └── 09-tools.tsx             # EXTEND: add note-taking app catalog
├── modes/
│   ├── wizard.tsx               # FIX: pass initialValues to all steps on back-nav; wire onBack consistently
│   └── config-first.tsx         # REFERENCE ONLY — not modified
├── index.tsx                    # EXTEND: add discovery prompt before entering config-first mode
tests/
├── unit/
│   ├── config-discovery.test.ts       # UPDATE: new discovery paths + git root
│   ├── wizard-navigation.test.ts      # UPDATE: value restoration on back-nav
│   └── language-bindings.test.ts      # UPDATE: multi-language restore scenario
└── integration/
    └── wizard-flow.test.tsx           # UPDATE: discovery prompt + note-taking step
```

## Phase 0 — Research

### R1: Ink Rendering — Back-Navigation & Value Restoration

**Finding**: Ink re-mounts a component whenever its position in the render tree changes or the parent re-renders with a new key. When `wizard.tsx` calls `goBack()`, it decrements `currentStep` and the step component at that index is re-rendered fresh — any `useState` internal state is reset to initial values. To restore values, the previous `StepFrame.values` must be passed as an `initialValues` prop to the step component, which uses them as `useState` initial arguments (lazy initializer pattern: `useState(() => initialValues.field ?? default)`).

**Impact**: Every step component that captures user input must accept an `initialValues` prop; the wizard must pass `frame.values` when rendering a step that already has a frame in history.

### R2: Language Step Sequential Traversal

**Finding**: `src/steps/05-languages.tsx` maintains `currentIdx: number` via `useState(0)`. On back-navigation from step 6 → 5, the wizard re-renders step 5 from scratch, resetting `currentIdx` to 0 and losing all entered versions. The fix is: (a) pass `initialValues.entries` (the full `LanguageEntry[]` array) as an `initialValues` prop; (b) initialize `entries` state from `initialValues` instead of from `allLanguages`; (c) initialize `currentIdx` to `initialValues.currentIdx ?? 0`. The blank-omit logic (`.filter(e => e.version.trim())`) already works correctly and should not change.

### R3: Config Discovery Path Changes

**Finding**: Three inconsistencies exist in the codebase:
1. `src/utils/config-discovery.ts` `getDiscoveryPaths()` returns `[cwd, ~/.config/tilde/, ~/tilde.config.json]` — the `~/.config/tilde/` and `~/tilde.config.json` paths are wrong per the clarification.
2. `src/steps/00-config-detection.tsx` has its own **hardcoded** paths (`./tilde.config.json`, `~/Developer/personal/dotfiles/tilde.config.json`, etc.) — entirely inconsistent and never using the shared utility.
3. The prior contract in `specs/008-wizard-ux-enhancements/contracts/cli-schema.md` documented the old paths. That contract must be superseded here.

**Fix**: Update `getDiscoveryPaths()` to:
1. `path.join(process.cwd(), 'tilde.config.json')` — cwd
2. Result of `git rev-parse --show-toplevel` + `/tilde.config.json` — git repo root (only if cwd is inside a git repo; skip gracefully if not)
3. `path.join(homedir(), '.tilde', 'tilde.config.json')` — canonical home path (symlink-safe, `fs.existsSync` follows symlinks by default)

**Git root detection**: Use `execa('git', ['rev-parse', '--show-toplevel'])` — already available as a dep. Wrap in try/catch; return empty if not in a git repo or git is unavailable.

### R4: Config Discovery Prompt (Auto-Found Without --config)

**Finding**: In `src/index.tsx` lines 309-327, when `discoverConfig()` finds a config and no `--config` was given, tilde silently enters `config-first` mode. The user sees no prompt. Per US3, the tool must ask: "Found config at `<path>` — use it? yes / no / specify path". When the user says no: print `Run tilde install --config <path>` and exit code 0 (not an error — user made an explicit choice). When "specify path": show a text input.

**Approach**: Add a new step component `src/steps/00-config-detection.tsx` handles both the wizard-initial config check AND the "auto-discovered" prompt. However, since the auto-discovery prompt fires **before** the wizard renders (it's in `index.tsx`), the cleanest approach is a lightweight `render()` + early exit pattern in `main()`: render a `ConfigDiscoveryPrompt` component (new: `src/modes/config-discovery-prompt.tsx`), then exit with the user's choice.

### R5: Note-Taking Apps — Catalog Approach

**Finding**: `src/steps/09-tools.tsx` is a free-text input step. Looking at browser step pattern (step 14 / `BrowserPlugin`), steps with a fixed catalog of known apps use `SelectInput` with a predefined items list. For note-taking apps, the catalog is small (Obsidian, Notion, Bear, Logseq). Bear is App Store only — no `brewCask`. Obsidian and Notion both have Homebrew casks. Logseq has a cask but is less common.

**Approach**: Add a new sub-section inside `09-tools.tsx` (or a new step 16 if it's cleaner) that presents a multi-select of note-taking apps. Each item shows availability (Homebrew cask available / App Store only). When "App Store only" apps are selected, tilde shows a post-install note rather than running brew install. This matches the pattern from the browser step.

**Simpler alternative chosen**: Extend step 09 with a note-taking sub-section using `ink-select-input` — no new wizard step needed, no registry change needed, consistent with how tools step already works.

## Phase 1 — Design

### Data Model Changes

**`StepFrame` extension** (in `src/modes/wizard.tsx`):

No schema change needed. `StepFrame.values: Record<string, unknown>` already exists. The key is what each step stores in `values`:

| Step | values keys added/changed |
|------|--------------------------|
| `05-languages` | `entries: LanguageEntry[]`, `currentIdx: number` |
| `09-tools` | `noteApps: string[]` (selected note-taking app cask names or identifiers) |
| All input steps | `<field>: <value>` (already existing pattern) |

**`LanguageEntry` type** (already in `05-languages.tsx`):
```typescript
interface LanguageEntry {
  name: string;
  manager: string;
  version: string; // empty string means unbound → omitted from config on save
}
```
No change to shape. The save logic (`.filter(e => e.version.trim())`) already omits blank entries.

**Discovery result type** (in `src/utils/config-discovery.ts`):
```typescript
// Existing: returns string | null
export async function discoverConfig(): Promise<string | null>

// New helper (needed for git-root search):
async function getGitRepoRoot(): Promise<string | null>
```

### Contract Changes

The config discovery contract from `specs/008-wizard-ux-enhancements/contracts/cli-schema.md` §2 is superseded by this spec. The new contract:

**Discovery order:**
```
1. --config <explicit path>          (CLI arg / TILDE_CONFIG env var)
2. <cwd>/tilde.config.json           (current directory)
3. <git-repo-root>/tilde.config.json (git root of cwd, skipped if not in a git repo)
4. ~/.tilde/tilde.config.json        (canonical home location, may be a symlink)
```

**When auto-discovered without `--config` (interactive TTY, install/wizard mode):**
```
Found tilde.config.json: ~/.tilde/tilde.config.json
Use this config? (↑/↓ to select)
❯ Yes — apply this config
  No — I'll specify one manually
  Enter a path...
```

**When user chooses "No":**
```
Run tilde install --config <path> to proceed.
```
Exit code: 0

**When no config found and command requires one (install/update):**
```
Error: No tilde.config.json found.

Searched:
  <cwd>/tilde.config.json
  <git-root>/tilde.config.json    (if applicable)
  ~/.tilde/tilde.config.json

Run tilde to create one with the setup wizard.
Or specify: tilde install --config <path>
```
Exit code: 2

### Wizard `initialValues` Prop Contract

Every step component that accepts user input must be updated to:

```typescript
interface StepProps {
  onComplete: (values: Record<string, unknown>) => void;
  onBack?: () => void;
  isOptional?: boolean;
  initialValues?: Record<string, unknown>; // ← ADD to every step
}
```

The wizard passes `initialValues` when the step already has a frame in history:
```typescript
// In wizard.tsx render logic:
const frameForStep = history.find(f => f.stepIndex === currentStep);
const initialValues = frameForStep?.values ?? {};
// Pass to current step component
```

### Note-Taking App Catalog

```typescript
// In src/steps/09-tools.tsx (or new src/data/note-apps.ts):
export const NOTE_TAKING_APPS = [
  { id: 'obsidian',  label: 'Obsidian',  brewCask: 'obsidian',  available: 'homebrew' },
  { id: 'notion',    label: 'Notion',    brewCask: 'notion',    available: 'homebrew' },
  { id: 'logseq',    label: 'Logseq',    brewCask: 'logseq',    available: 'homebrew' },
  { id: 'bear',      label: 'Bear',      brewCask: null,        available: 'app-store' },
] as const;
```

Bear shown as: `Bear (App Store — install manually)` — selecting it adds a post-wizard note, no brew install attempted.

## Implementation Phases

### Phase 1A — Config Discovery (US3, FR-008/009/010/011)

**Files modified:**
- `src/utils/config-discovery.ts` — update `getDiscoveryPaths()` (add git root, fix `~/.tilde/` path)
- `src/steps/00-config-detection.tsx` — replace hardcoded paths with `getDiscoveryPaths()`, fix "no" response to exit with instruction
- `src/index.tsx` — add interactive discovery prompt when config is auto-found without `--config`
- `specs/010-wizard-flow-fixes/contracts/cli-schema.md` — new contract (supersedes 008)

**Tests modified:**
- `tests/unit/config-discovery.test.ts` — update for new path order (3 tests need new assertions, git-root test needs mock)
- `tests/integration/wizard-flow.test.tsx` — add "discovery prompt yes/no" scenarios

**Risk**: `git rev-parse --show-toplevel` adds a subprocess call on startup. Must be wrapped in try/catch + timeout; if it fails, skip gracefully (don't block startup). The `execa` call should be fire-and-forget with a 1s timeout.

### Phase 1B — Wizard Back-Navigation Value Restore (US1, FR-007)

**Files modified:**
- `src/modes/wizard.tsx` — pass `initialValues` from `StepFrame.values` to current step; wire `onBack` consistently (remove `_onBack` prefix pattern from all steps that suppress it)
- All input step components — add `initialValues` prop; use lazy `useState` initializer

**Steps requiring `initialValues` addition:**
| Step file | Fields to restore |
|-----------|-----------------|
| `02-shell.tsx` | `shell` |
| `03-package-manager.tsx` | `packageManager` |
| `04-version-manager.tsx` | `versionManagers` |
| `05-languages.tsx` | `entries`, `currentIdx` |
| `06-workspace.tsx` | `workspaceDir` |
| `07-contexts.tsx` | `contexts` |
| `08-git-auth.tsx` | `gitAuth` |
| `09-tools.tsx` | `tools`, `noteApps` |
| `10-app-config.tsx` | `editorConfig` |
| `11-accounts.tsx` | `accounts` |
| `12-secrets-backend.tsx` | `secretsBackend` |

**Tests modified:**
- `tests/unit/wizard-navigation.test.ts` — add test: `goBack()` restores values to `initialValues` at T-1
- `tests/integration/wizard-flow.test.tsx` — add end-to-end back-nav with value restoration

### Phase 1C — Language Binding State Fix (US2, FR-006)

**Files modified:**
- `src/steps/05-languages.tsx` — accept `initialValues.entries` and `initialValues.currentIdx`; init `entries` from `initialValues` (not from fresh `allLanguages` derivation); init `currentIdx` from `initialValues.currentIdx ?? 0`

**Tests modified:**
- `tests/unit/language-bindings.test.ts` — add: "navigating back from step 6 to step 5 restores all previously entered language versions"

### Phase 1D — Note-Taking Apps (US4, FR-012)

**Files modified:**
- `src/steps/09-tools.tsx` — add note-taking multi-select sub-section; add `NOTE_TAKING_APPS` catalog; handle App Store-only apps with post-note

**Tests modified:**
- `tests/unit/wizard-navigation.test.ts` — add: "note-taking apps stored in StepFrame values"
- `tests/integration/wizard-flow.test.tsx` — add: "selecting Obsidian adds obsidian cask to config"

## Commit Strategy

1. `fix(config-discovery): update discovery paths to cwd → git-root → ~/.tilde` — Phase 1A (paths only)
2. `feat(wizard): add config discovery prompt for auto-found configs` — Phase 1A (prompt)
3. `fix(wizard): restore step values on back-navigation via initialValues prop` — Phase 1B
4. `fix(languages): restore multi-language entries on back-navigation` — Phase 1C
5. `feat(tools): add note-taking app catalog to tools step` — Phase 1D
6. `docs(contracts): add cli-schema contract for 010-wizard-flow-fixes` — contract artifact
7. `docs(plan): finalize implementation plan for 010-wizard-flow-fixes` — this file

## Open Questions / Risks

| Item | Decision |
|------|----------|
| Git root detection timeout | 1s timeout via `execa` `timeout` option; on failure, skip git-root path |
| Symlink resolution for `~/.tilde/` | `fs.existsSync` follows symlinks natively — no special handling needed |
| Ink multi-select component | `ink-select-input` supports checkboxes via `isFocused` — already a dep |
| Step count stays at 16 | Note-taking apps added as sub-section of step 09, no new step index |
| Contract in 008 superseded | New `contracts/cli-schema.md` in this spec; old one left in place with a "superseded" note |
