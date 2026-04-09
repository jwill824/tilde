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
| Schema version bump required? | ✅ Yes — bumped to `1.6` | Schema bumped twice: v1.5 (packageManagers array, contexts per-context fields), v1.6 (migration runner cleanup). Migration chain: `'1'→'1.1'→'1.2'→'1.3'→'1.4'→'1.5'→'1.6'` |
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
│   ├── config-discovery.ts    UPDATE: discovery paths + git root search
│   └── env-detection.ts       NEW: detectLanguages(), detectVersionManagers(), detectBrewLeaves(), detectDotfiles()
├── data/
│   └── language-versions.ts   NEW: LANGUAGE_CATALOG with version + manager lists per language
├── steps/
│   ├── config-detection.tsx   UPDATE: use shared discovery util, "no" → exit, custom path option
│   ├── contexts.tsx            REWRITE: unified workspace + contexts + git-auth + accounts + languages sub-flow
│   ├── tools.tsx               EXTEND: note-taking app catalog
│   ├── browser.tsx             FIX: remove conflicting SelectInput from multi-select step
│   ├── ai-tools.tsx            FIX: remove unused SelectInput import
│   ├── apply.tsx               NEW: Apply & Finish step (installAll + writeAll)
│   └── env-capture.tsx         UPDATE: surface detected languages/version managers
├── modes/
│   ├── wizard.tsx               FIX+EXTEND: initialValues/poppedFrame for back-nav; getNextStep() logic tree; sidebar panel; step registry updated to 12 canonical steps
│   └── config-first.tsx         REFERENCE ONLY — not modified
├── config/
│   └── migrations/runner.ts    UPDATE: v1.5→v1.6 migration; Object.fromEntries() for ESLint compliance
├── installer/
│   └── index.ts                FIX: config.languages ?? [] nullish guard
└── index.tsx                    EXTEND: config discovery prompt before config-first mode
tests/
├── unit/
│   ├── config-discovery.test.ts       UPDATE: new discovery paths + git root
│   ├── wizard-navigation.test.ts      UPDATE: value restoration on back-nav; getNextStep() logic tree
│   ├── config-schema.test.ts          UPDATE: packageManagers array; per-context fields; migration v1.5→v1.6
│   └── config/migration-runner.test.ts UPDATE: v1.6 migration
└── integration/
    └── wizard-flow.test.tsx            UPDATE: 11 import paths renamed; discovery prompt; contexts; nav consistency
```

## Phase 0 — Research

### R1: Ink Rendering — Back-Navigation & Value Restoration

**Finding**: Ink re-mounts a component whenever its position in the render tree changes or the parent re-renders with a new key. When `wizard.tsx` calls `goBack()`, it decrements `currentStep` and the step component at that index is re-rendered fresh — any `useState` internal state is reset to initial values. To restore values, the previous `StepFrame.values` must be passed as an `initialValues` prop to the step component, which uses them as `useState` initial arguments (lazy initializer pattern: `useState(() => initialValues.field ?? default)`).

**Impact**: Every step component that captures user input must accept an `initialValues` prop; the wizard must pass `frame.values` when rendering a step that already has a frame in history.

### R2: Language Step Sequential Traversal

**Finding**: `src/steps/languages.tsx` maintains `currentIdx: number` via `useState(0)`. On back-navigation from step 6 → 5, the wizard re-renders step 5 from scratch, resetting `currentIdx` to 0 and losing all entered versions. The fix is: (a) pass `initialValues.entries` (the full `LanguageEntry[]` array) as an `initialValues` prop; (b) initialize `entries` state from `initialValues` instead of from `allLanguages`; (c) initialize `currentIdx` to `initialValues.currentIdx ?? 0`. The blank-omit logic (`.filter(e => e.version.trim())`) already works correctly and should not change.

### R3: Config Discovery Path Changes

**Finding**: Three inconsistencies exist in the codebase:
1. `src/utils/config-discovery.ts` `getDiscoveryPaths()` returns `[cwd, ~/.config/tilde/, ~/tilde.config.json]` — the `~/.config/tilde/` and `~/tilde.config.json` paths are wrong per the clarification.
2. `src/steps/config-detection.tsx` has its own **hardcoded** paths (`./tilde.config.json`, `~/Developer/personal/dotfiles/tilde.config.json`, etc.) — entirely inconsistent and never using the shared utility.
3. The prior contract in `specs/008-wizard-ux-enhancements/contracts/cli-schema.md` documented the old paths. That contract must be superseded here.

**Fix**: Update `getDiscoveryPaths()` to:
1. `path.join(process.cwd(), 'tilde.config.json')` — cwd
2. Result of `git rev-parse --show-toplevel` + `/tilde.config.json` — git repo root (only if cwd is inside a git repo; skip gracefully if not)
3. `path.join(homedir(), '.tilde', 'tilde.config.json')` — canonical home path (symlink-safe, `fs.existsSync` follows symlinks by default)

**Git root detection**: Use `execa('git', ['rev-parse', '--show-toplevel'])` — already available as a dep. Wrap in try/catch; return empty if not in a git repo or git is unavailable.

### R4: Config Discovery Prompt (Auto-Found Without --config)

**Finding**: In `src/index.tsx` lines 309-327, when `discoverConfig()` finds a config and no `--config` was given, tilde silently enters `config-first` mode. The user sees no prompt. Per US3, the tool must ask: "Found config at `<path>` — use it? yes / no / specify path". When the user says no: print `Run tilde install --config <path>` and exit code 0 (not an error — user made an explicit choice). When "specify path": show a text input.

**Approach**: Add a new step component `src/steps/config-detection.tsx` handles both the wizard-initial config check AND the "auto-discovered" prompt. However, since the auto-discovery prompt fires **before** the wizard renders (it's in `index.tsx`), the cleanest approach is a lightweight `render()` + early exit pattern in `main()`: render a `ConfigDiscoveryPrompt` component (new: `src/modes/config-discovery-prompt.tsx`), then exit with the user's choice.

### R5: Note-Taking Apps — Catalog Approach

**Finding**: `src/steps/tools.tsx` is a free-text input step. Looking at browser step pattern (step 14 / `BrowserPlugin`), steps with a fixed catalog of known apps use `SelectInput` with a predefined items list. For note-taking apps, the catalog is small (Obsidian, Notion, Bear, Logseq). Bear is App Store only — no `brewCask`. Obsidian and Notion both have Homebrew casks. Logseq has a cask but is less common.

**Approach**: Add a new sub-section inside `tools.tsx` (or a new step 16 if it's cleaner) that presents a multi-select of note-taking apps. Each item shows availability (Homebrew cask available / App Store only). When "App Store only" apps are selected, tilde shows a post-install note rather than running brew install. This matches the pattern from the browser step.

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

**`LanguageEntry` type** (already in `languages.tsx`):
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
// In src/steps/tools.tsx (or new src/data/note-apps.ts):
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
- `src/steps/config-detection.tsx` — replace hardcoded paths with `getDiscoveryPaths()`, fix "no" response to exit with instruction
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
| `shell.tsx` | `shell` |
| `package-manager.tsx` | `packageManager` |
| `version-manager.tsx` | `versionManagers` |
| `languages.tsx` | `entries`, `currentIdx` |
| `workspace.tsx` | `workspaceDir` |
| `contexts.tsx` | `contexts` |
| `git-auth.tsx` | `gitAuth` |
| `tools.tsx` | `tools`, `noteApps` |
| `app-config.tsx` | `editorConfig` |
| `accounts.tsx` | `accounts` |
| `secrets-backend.tsx` | `secretsBackend` |

**Tests modified:**
- `tests/unit/wizard-navigation.test.ts` — add test: `goBack()` restores values to `initialValues` at T-1
- `tests/integration/wizard-flow.test.tsx` — add end-to-end back-nav with value restoration

### Phase 1C — Language Binding State Fix (US2, FR-006)

**Files modified:**
- `src/steps/languages.tsx` — accept `initialValues.entries` and `initialValues.currentIdx`; init `entries` from `initialValues` (not from fresh `allLanguages` derivation); init `currentIdx` from `initialValues.currentIdx ?? 0`

**Tests modified:**
- `tests/unit/language-bindings.test.ts` — add: "navigating back from step 6 to step 5 restores all previously entered language versions"

### Phase 1D — Note-Taking Apps (US4, FR-012)

**Files modified:**
- `src/steps/tools.tsx` — add note-taking multi-select sub-section; add `NOTE_TAKING_APPS` catalog; handle App Store-only apps with post-note

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

---

## Phase 2 — Revised Architecture (from Local Testing)

*These phases address the US5–US9 user stories and BUG-001/BUG-002 discovered after local testing.*

### Summary of Structural Changes

| Change | Old | New |
|--------|-----|-----|
| Step 5 (Languages) | Standalone global step | Removed — absorbed into Contexts step |
| Step 6 (Workspace) | Standalone | Merged into new Contexts step |
| Step 7 (Contexts) | Standalone | Expanded into unified Contexts step |
| Step 8 (Git Auth) | Standalone | Per-context sub-flow inside Contexts step |
| Step 11 (Accounts) | Optional standalone | Per-context sub-flow inside Contexts step |
| Step count | 16 | ~12 (+ dynamic logic-tree steps) |
| Navigation pattern | Mixed key-binding + menu | Uniform: explicit menu items or focus-safe key intercept |
| Package manager | Single select | Multi-select |
| Language version input | Free text | Catalog picker (pre-defined versions) |
| Language → version manager | Separate step | Nested menu per language, inside each context |
| Step sequencing | Linear (always +1) | Logic-tree (next step determined by prior answers) |

### Phase 2A — Fix Steps 13–15 Rendering Bug (BUG-001, P0)

**Goal**: Diagnose and fix why steps 13, 14, and 15 never render in the wizard.

**Investigation approach**:
1. Check `wizard.tsx` conditional rendering for steps 13–15 — look for missing branches, off-by-one, or unreachable conditions
2. Check if `LAST_STEP` calculation is wrong (step count vs. index mismatch)
3. Check whether step components `config-export.tsx`, `browser.tsx`, `ai-tools.tsx` throw on mount (async data load failure silently skips)
4. Add `console.error` guards inside each component to detect mount failures in dev mode

**Files potentially modified**: `src/modes/wizard.tsx`, `src/steps/config-export.tsx`, `src/steps/browser.tsx`, `src/steps/ai-tools.tsx`

### Phase 2B — Navigation Standardization (US7, BUG-002, P1)

**Goal**: Every wizard step uses the same back/skip affordance. No step uses a bare key binding for back when a text input may be focused.

**Design decision**: The standard back affordance is a SelectInput item labeled `← Back` (or equivalent). This is placed outside of any text input's focus context. Steps with text inputs should:
- Show the text input for data entry
- After entry (on Enter), show a confirmation sub-view with `← Back` and `→ Continue` as SelectInput items
- OR use a two-panel layout: text field on top, action menu below (common Ink pattern)

**Files to audit**: All 16 step components. Any that use `useInput` for 'b' back key AND also render `<TextInput>` need refactoring.

**Tests modified**: Integration tests for each affected step — verify 'b' key does not insert character in text fields.

### Phase 2C — Contexts Step Merger (US5, P1)

**Goal**: Replace steps 6, 7, 8, 11 with a single `contexts.tsx` that drives a per-context nested sub-flow.

**New step sub-flow per context:**
```
1. Context name/label input
2. Workspace root path (default: ~/Developer on macOS; allow per-context override)
3. Git auth method (SelectInput: gh-cli, SSH key, HTTPS, none)
4. VCS account (text input, shown only if gh-cli or SSH selected — scoped logic)
5. Languages (repeat: language → version manager → version → add another?)
6. Dotfiles location (optional: path inside or alongside this context)
```

**Step registry changes:**
- Remove indices 6 (workspace), 8 (git-auth), 11 (accounts) from registry
- Step 7 (contexts) becomes the unified Contexts step
- All remaining steps shift index accordingly (or use string IDs instead of numeric indices for routing)

**Config schema impact**: `TildeConfig.contexts[]` must accommodate `gitAuth`, `account`, `languages[]`, `dotfilesPath` per context. Schema version bump to `"1.6"` required.

**Files modified**: `src/steps/contexts.tsx` (major rewrite), `src/modes/wizard.tsx` (remove steps 6/8/11 from registry and rendering), `src/config/schema.ts` (schema version bump), `src/config/migrations/runner.ts` (add `'1.4' → '1.6'` migration).

### Phase 2D — Remove Step 5, Language Bindings in Contexts (US6, P1)

**Goal**: Step 5 (Languages) is removed from the wizard registry. Language configuration happens inside the Contexts sub-flow (Phase 2C step 5).

**Language sub-menu design** (inside contexts step):
```
Select a language:
❯ Node.js
  Python
  Go
  Java
  Ruby
  (done — no more languages)

Select version manager for Node.js:
❯ nvm    (.nvmrc in workspace root)
  vfox   (.envrc with vfox use)
  fnm    (.node-version)
  none   (no version pinning)

Select Node.js version:
❯ 22 (LTS)
  20 (LTS)
  18
  16
  Other (enter manually)
```

**Version catalog source**: Static catalog in `src/data/language-versions.ts` — updated periodically, not fetched at runtime (avoids network dependency during setup).

**Integration patterns added to config per language+manager:**
- `nvm` → add `.nvmrc` with version to context workspace
- `vfox` → add `.envrc` with `vfox use <lang>@<version>`
- `pyenv` → add `.python-version`
- `direnv` → ensure `.envrc` is in `.gitignore` of context workspace

**Files modified**: `src/modes/wizard.tsx` (remove step 5 from registry), `src/steps/languages.tsx` (keep file, but no longer registered — or delete), `src/steps/contexts.tsx` (add language sub-flow), `src/data/language-versions.ts` (new static catalog).

### Phase 2E — Multiple Package Managers (US8, P2)

**Goal**: Step 3 (Package Manager) changes from single-select to multi-select. Tool installation logic dispatches per package manager.

**UI change**: `SelectInput` → `MultiSelect` (same pattern as version managers step 4).

**Files modified**: `src/steps/package-manager.tsx` (multi-select UI), `src/config/schema.ts` (packageManagers: string[] instead of packageManager: string), `src/config/migrations/runner.ts` (migrate `packageManager` → `packageManagers: [value]`).

### Phase 2F — Enhanced Environment Discovery (US9, P2)

**Goal**: Step 1 detects more of the user's existing environment to pre-populate wizard defaults.

**Detection additions to `src/steps/env-capture.tsx`:**
- Language installs: `which node`, `node --version`; `which python3`, `python3 --version`; `which go`, `go version`; `which java`, `java -version`; `which ruby`, `ruby --version`
- Version managers: `which nvm` (or `~/.nvm` exists), `which pyenv`, `which vfox`, `which rbenv`, `which fnm`
- Dotfiles: check `~/.zshrc`, `~/.bashrc`, `~/.gitconfig`, `~/.ssh/config`, `~/.config/` exists
- Homebrew direct installs: `brew leaves` → list of directly installed formulae/casks (separate from `brew list`)

**Output shape** (added to env detection result):
```typescript
detectedLanguages: Array<{ name: string; version: string; versionManager?: string }>
detectedDotfiles: string[]  // paths that exist
brewLeaves: string[]        // direct installs (only if homebrew present)
```

**Files modified**: `src/steps/env-capture.tsx`, `src/utils/env-detection.ts` (new or extended), possibly `src/modes/wizard.tsx` (pass env detection results forward as initialValues to contexts step).

### Phase 2G — Logic Tree Step Sequencing (US5/US9, P2)

**Goal**: The wizard's step progression becomes dynamic. Instead of always advancing by +1, `advance()` computes the next step based on current config state.

**Design**: Add a `getNextStep(currentStep: number, config: Partial<TildeConfig>): number` function to `wizard.tsx`. This function encodes the logic tree:

```typescript
function getNextStep(step: number, config: Partial<TildeConfig>): number {
  switch (step) {
    case 3: // package-manager
      // skip version manager step if no language-capable PM selected? No — always show
      return 4;
    case 7: // contexts
      // skip secrets step if no sensitive accounts configured
      if (!config.contexts?.some(c => c.account)) return 9; // skip to tools
      return 8; // secrets-backend
    case 9: // tools
      return hasEditor(config) ? 10 : 11; // skip app-config if no known editor
    // ... etc.
  }
}
```

**Files modified**: `src/modes/wizard.tsx` (replace `currentStep + 1` with `getNextStep()` calls).

## Updated Commit Strategy (Phase 2)

8. `fix(wizard): diagnose and fix steps 13-15 rendering bug` — Phase 2A
9. `fix(wizard): standardize back/skip navigation across all steps` — Phase 2B
10. `refactor(contexts): merge workspace/git-auth/accounts into unified contexts step` — Phase 2C
11. `refactor(languages): move language bindings into contexts; remove standalone step` — Phase 2D
12. `feat(package-manager): support multiple package managers (multi-select)` — Phase 2E
13. `feat(env-capture): detect existing languages, version managers, and dotfiles` — Phase 2F
14. `feat(wizard): dynamic step sequencing via logic tree` — Phase 2G
15. `chore(schema): bump schema version to 1.6 with migration` — Schema changes

## Updated Open Questions / Risks

| Item | Status |
|------|--------|
| Steps 13–15 root cause | ✅ Resolved — off-by-one in LAST_STEP and missing render branches. Fixed in Phase 2A. |
| Config schema bump to 1.6 | ✅ Done — per-context gitAuth, account, languages, dotfilesPath; packageManagers array |
| Static version catalog staleness | ✅ Accepted — `src/data/language-versions.ts` versioned in repo, updated on LTS releases |
| Logic tree completeness | ✅ Initial tree implemented in `getNextStep()` — case 5 (contexts → tools skip), case 6 (tools → skip app-config if no editor) |
| `brew leaves` performance | ✅ Acceptable — ~200ms, runs async during step 1 |
| Contexts step complexity | ✅ Sub-step progress handled by history stack; back-navigation works within sub-flow |

---

## Phase 3 — Final Review & Cleanup (2026-04-09)

All 50 tasks complete. Final review identified and resolved the following before merge:

### Review Findings

| ID | Severity | Finding | Fix |
|----|----------|---------|-----|
| H1 | HIGH | 11 integration test imports used old numeric step file names | Updated all imports in `wizard-flow.test.tsx` |
| H2 | HIGH | 3 ESLint errors in `ai-tools.tsx`, `wizard.tsx`, `runner.ts` | Removed unused import; renamed arg; replaced destructure-discard with `Object.fromEntries()` |
| H3 | HIGH | `PackageManagerStep` lost user selection on back-navigation — popped history frame was gone before `initialValues` lookup | Added `poppedFrame` state; `goBack()` saves popped frame; `initialValues` prefers `poppedFrame` when `stepIndex` matches current step |
| H4 | HIGH | `src/steps/accounts.tsx` was orphaned dead code after context unification | Deleted |
| M1 | MEDIUM | Dead `hasAccount` conditional in `getNextStep()` case 5 — both branches identical | Removed dead `if`; case 5 now returns `6` unconditionally |

### Additional Cleanup

- **Step file renames**: All 17 step files renamed from `NN-name.tsx` to `name.tsx` (e.g., `07-contexts.tsx` → `contexts.tsx`). Step ordering lives in the registry, not filenames.
- **Default dotfiles path**: Changed from `{context-path}/dotfiles` to `{workspaceRoot}/dotfiles` (one shared dotfiles repo per workspace root, e.g., `~/Developer/dotfiles/`).
- **`config.languages ?? []`**: Nullish guard added in `src/installer/index.ts` — wizard builds config piecemeal without Zod defaults, so `languages` was `undefined` at apply time.

### Final Test Coverage

| Suite | Result |
|-------|--------|
| Unit (208 tests) | ✅ All passing |
| Integration (42 tests) | ✅ All passing |
| Contract | ✅ Passing |
| ESLint | ✅ 0 errors |

