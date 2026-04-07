# Tasks: Wizard Flow Fixes & Enhancements

**Input**: Design documents from `/specs/010-wizard-flow-fixes/`
**Branch**: `010-wizard-flow-fixes`
**GitHub Issues**: #67, #66, #74, #82
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/cli-schema.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in same phase (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: No new project init needed — this is an in-place feature. Phase 1 updates the shared discovery utility that all user stories depend on.

- [ ] T001 Refactor `src/utils/config-discovery.ts`: make `getDiscoveryPaths()` async; add `getGitRepoRoot()` helper using `execa('git', ['rev-parse', '--show-toplevel'], { timeout: 1000, reject: false })`; update search order to cwd → git-root (if differs from cwd) → `~/.tilde/tilde.config.json`; remove old `~/.config/tilde/` and `~/tilde.config.json` paths; update `formatNoConfigError()` to reference new paths
- [ ] T002 Update `tests/unit/config-discovery.test.ts`: fix all `getDiscoveryPaths()` assertions for new 3-path order; add `vi.mock('execa', ...)` to control git root detection; add test cases for (a) inside git repo, (b) not in git repo, (c) cwd equals git root (deduplication), (d) `formatNoConfigError` lists new paths

**Checkpoint**: Shared discovery utility updated — all user story phases can now begin

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add `initialValues` prop to the wizard's rendering pipeline — required by US1 and US2.

- [ ] T003 Update `src/modes/wizard.tsx`: in the step render section, look up `history.find(f => f.stepIndex === currentStep)` to get `prevFrame`; pass `prevFrame?.values ?? {}` as `initialValues` prop to every step component that is rendered by the wizard; remove `_onBack` suppression patterns — pass `onBack` consistently to all steps

**Checkpoint**: Wizard now forwards `initialValues` — step components can restore values from history

---

## Phase 3: User Story 1 — Fluid Wizard Navigation (Priority: P1) 🎯 MVP

**Goal**: Every wizard step restores previously entered values when the user navigates back. No data loss on back-navigation.

**Independent Test**: Run the wizard, complete steps 2–6 with specific values, navigate back to step 2, verify all entered values are pre-populated in each step.

- [ ] T004 [US1] Update `src/steps/02-shell.tsx`: add `initialValues?: Record<string, unknown>` to `Props`; change `useState(defaultShell)` to `useState(() => (initialValues?.shell as string) ?? defaultShell ?? '')`
- [ ] T005 [P] [US1] Update `src/steps/03-package-manager.tsx`: add `initialValues?` prop; restore `packageManager` selection via lazy `useState(() => initialValues?.packageManager ?? defaultPm)`
- [ ] T006 [P] [US1] Update `src/steps/04-version-manager.tsx`: add `initialValues?` prop; restore `versionManagers` array via lazy `useState(() => (initialValues?.versionManagers as VersionManagerChoice[]) ?? [])`
- [ ] T007 [P] [US1] Update `src/steps/06-workspace.tsx`: add `initialValues?` prop; restore `workspaceDir` via lazy `useState(() => (initialValues?.workspaceDir as string) ?? '')`
- [ ] T008 [P] [US1] Update `src/steps/07-contexts.tsx`: add `initialValues?` prop; restore `contexts` array via lazy `useState(() => (initialValues?.contexts as Context[]) ?? [])`
- [ ] T009 [P] [US1] Update `src/steps/08-git-auth.tsx`: add `initialValues?` prop; restore `gitAuth` fields via lazy `useState()`
- [ ] T010 [P] [US1] Update `src/steps/10-app-config.tsx`: add `initialValues?` prop; restore editor config selection via lazy `useState()`
- [ ] T011 [P] [US1] Update `src/steps/11-accounts.tsx`: add `initialValues?` prop; restore accounts entries via lazy `useState()`
- [ ] T012 [P] [US1] Update `src/steps/12-secrets-backend.tsx`: add `initialValues?` prop; restore secrets backend selection via lazy `useState()`
- [ ] T013 [US1] Update `tests/unit/wizard-navigation.test.ts`: add test `goBack() returns prevFrame.values as initialValues at T-1`; add test `navigating forward after back retains restored values`; add test `back disabled at step 0 (history empty)`

---

## Phase 4: User Story 2 — Multi-Language Version Binding (Priority: P1)

**Goal**: Navigating back to the languages step restores all previously entered version strings and the active cursor position. Blank versions are omitted from saved config.

**Independent Test**: Run the wizard, select 3 languages (node@18, python@3.12, go@blank), navigate to step 6, navigate back to step 5 — all three version strings must be pre-populated exactly as entered (including the blank one).

**Depends on**: T003 (async `getDiscoveryPaths`), T003 wizard `initialValues` wire-up

- [ ] T014 [US2] Update `src/steps/05-languages.tsx`: add `initialValues?: Record<string, unknown>` to `Props`; initialize `entries` state via `useState<LanguageEntry[]>(() => (initialValues?.entries as LanguageEntry[]) ?? unique)`; initialize `currentIdx` via `useState(() => (initialValues?.currentIdx as number) ?? 0)`; remove `_onBack` suppression and wire `onBack` prop to navigate back within the language list (decrement `currentIdx`, or call `onBack()` when at first language); ensure `advance()` in `wizard.tsx` stores `{ entries, currentIdx }` in `StepFrame.values` for step 5
- [ ] T015 [US2] Update `tests/unit/language-bindings.test.ts`: add test `restores all language entries (including blank) when navigating back from step 6 to step 5`; add test `currentIdx is restored to its last position on back-navigation`; add test `blank version entries are omitted from onComplete output` (verify existing filter is preserved)

---

## Phase 5: User Story 3 — Config Discovery Prompt (Priority: P2)

**Goal**: When tilde auto-discovers a config (without `--config`), it prompts the user: use it / no / specify path. "No" exits with an instruction message. "Specify path" shows a text input.

**Independent Test**: Run `tilde` with a `tilde.config.json` present in cwd (but no `--config` flag). A prompt must appear asking whether to use the found config. Pressing "No" must exit the process with the instruction message and code 0.

**Depends on**: T001 (updated discovery util), T002 (tests passing)

- [ ] T016 [US3] Update `src/steps/00-config-detection.tsx`: replace hardcoded `CONFIG_SEARCH_PATHS` array with `await getDiscoveryPaths()` from the shared utility; add a third menu option `Enter a path...` alongside `Use existing` and `Start fresh`; implement `Enter a path...` option with `ink-text-input`; add a new `outcome: 'decline'` path that calls a new `onDecline?: () => void` prop instead of `onComplete`
- [ ] T017 [US3] Update `src/index.tsx`: in `main()`, after `discoverConfig()` returns a non-null path and `configPath` was not explicitly provided, render `ConfigDetectionStep` (step 00) before entering config-first mode; wire `onDecline` callback to print `Run tilde install --config <path> to proceed.` and `process.exit(0)`; wire `onComplete` with `action: 'specify'` to validate the entered path exists before proceeding
- [ ] T018 [US3] Update `tests/integration/wizard-flow.test.tsx`: add test `auto-discovered config prompts user before entering config-first mode`; add test `"No" at discovery prompt exits with code 0 and instruction message`; add test `"Enter a path" shows text input and validates path exists`

---

## Phase 6: User Story 4 — Note-Taking App Catalog (Priority: P3)

**Goal**: The tools step presents a structured note-taking app catalog (Obsidian, Notion, Logseq, Bear). Homebrew-available apps are installed via `brew install --cask`. Bear (App Store only) shows a post-wizard reminder note.

**Independent Test**: Run the wizard to step 09 (tools), verify note-taking app options appear as a selectable list. Select Obsidian and Bear. Verify: Obsidian is added to brew install list; Bear shows a post-install reminder note; Bear is NOT added to the brew install list.

**Depends on**: T003 (wizard `initialValues` wiring — for step 09 restore)

- [ ] T019 [US4] Add note-taking app catalog to `src/steps/09-tools.tsx`: define `NOTE_TAKING_APPS` constant array with `{ id, label, brewCask, available }` for Obsidian, Notion, Logseq, Bear; add a multi-select UI section below the free-text tools input using `ink-select-input` (space to toggle, enter to confirm); handle `available === 'app-store'` items by adding them to a `appStoreReminders` list instead of brew casks; update `onComplete` data shape to include `noteApps: string[]` (cask names of selected homebrew apps) and `appStoreReminders: string[]`; add `initialValues?` prop and restore `noteApps` and `appStoreReminders` via lazy `useState()`
- [ ] T020 [US4] Update `tests/unit/wizard-navigation.test.ts`: add test `note-taking app selections stored in StepFrame.values.noteApps`; add test `Bear is not added to brew install list when selected`; add test `note-taking selections restored correctly on back-navigation`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify all fixes integrate correctly end-to-end and update existing contracts/docs to reflect new behavior.

- [ ] T021 [P] Add note to `specs/008-wizard-ux-enhancements/contracts/cli-schema.md` §2: prepend `> ⚠️ This section is superseded by [010-wizard-flow-fixes/contracts/cli-schema.md](../../010-wizard-flow-fixes/contracts/cli-schema.md) for config discovery paths.`
- [ ] T022 [P] Run full test suite (`npm test`) and fix any regressions caused by `getDiscoveryPaths()` becoming async — update all callers in `src/` that currently call it synchronously
- [ ] T023 Update `tests/integration/wizard-flow.test.tsx`: add end-to-end test `full wizard back-navigation preserves all values across all steps`; verify the complete forward → backward → forward journey produces the same config output

---

## Dependency Graph

```
T001 (discovery util) ─┬─ T002 (discovery tests)
                       ├─ T016 (step 00 update)
                       └─ T017 (index.tsx prompt)

T003 (wizard initialValues wire) ─┬─ T004–T012 (step components: US1)
                                  ├─ T014 (languages step: US2)
                                  └─ T019 (tools step: US4)

T004–T012 (US1 steps) ──── T013 (US1 tests)
T014 (US2 languages) ───── T015 (US2 tests)
T016 + T017 (US3 prompt) ─ T018 (US3 tests)
T019 (US4 tools) ────────── T020 (US4 tests)
T001–T020 ───────────────── T021–T023 (polish)
```

## Parallel Execution Opportunities

**Phase 3 (US1)**: T004–T012 are all parallelizable — each touches a different step file with no shared state.

**Phase 7 (Polish)**: T021 and T022 are parallelizable — different files.

**US2, US3, US4** (Phases 4–6): After T003 completes, these three phases can proceed independently of each other. US1 (Phase 3) and US2–US4 can interleave as long as T003 is done.

## Implementation Strategy

**MVP (deliver first)**: Phase 1 (T001–T002) + Phase 2 (T003) + Phase 3 US1 (T004–T013)

This delivers the highest-priority fix: back-navigation value restoration across all steps. Issues #67 is resolved. Users can run the full wizard without losing entered data on back-navigation.

**Increment 2**: Phase 4 (T014–T015) — resolves #66 (language step state loss)

**Increment 3**: Phase 5 (T016–T018) — resolves #74 (config discovery prompt)

**Increment 4**: Phase 6 + Phase 7 (T019–T023) — resolves #82 (note-taking apps), plus polish

---

## Phase 1 Complete ✅

All 23 original tasks (T001–T023) are implemented and committed on branch `010-wizard-flow-fixes`. See git log for details.

---

## Phase 2: Local Testing Findings

*Tasks below address issues discovered during local end-to-end testing of the wizard. See spec.md US5–US9 and BUG-001/BUG-002 for full requirements.*

---

### Phase 8: Critical Bug Fixes (P0)

**Purpose**: Fix regressions that prevent the wizard from completing.

- [ ] T024 Diagnose BUG-001 — steps 13, 14, 15 do not render: inspect `wizard.tsx` conditional rendering for steps 13–15; check `LAST_STEP` calculation; add temporary `console.error` in `13-config-export.tsx`, `14-browser.tsx`, `15-ai-tools.tsx` mount/useEffect to detect silent failures; check if async data load in step 14 (browser detection) or step 15 (AI tools detection) rejects silently and causes the component to never call `onComplete`; fix root cause once identified
- [ ] T025 [P] Fix BUG-002 — back key in text inputs: audit all step components that use both `useInput` (for 'b' → back) AND `<TextInput>`; for each, refactor so the back affordance is an explicit menu item shown after the user submits the text input (Enter), not a key binding intercepted while the text field is focused; acceptable pattern: text input → submit on Enter → show `[← Back]  [→ Continue]` SelectInput; update `09-tools.tsx` select-apps phase to expose a visible back item (currently no back possible in multi-select phase)

**Checkpoint**: Wizard completes all 13 steps (or 15 with optionals) without getting stuck or missing steps

---

### Phase 9: Navigation Standardization (US7, P1)

**Purpose**: Make back/skip behave identically on every wizard step.

- [ ] T026 Audit all 16 step files for navigation inconsistencies: for each step, document (a) how back is currently triggered, (b) how skip is currently triggered, (c) whether a text input is present; produce a table of steps that need refactoring (target: all steps use SelectInput-based back/skip or Ink focus-safe key intercept)
- [ ] T027 [P] Standardize `src/steps/02-shell.tsx`: ensure back is an explicit menu item, not a key binding; skip must match the wizard's global skip affordance
- [ ] T028 [P] Standardize `src/steps/03-package-manager.tsx`: verify multi-select + back works when focus is on a SelectInput item (not text)
- [ ] T029 [P] Standardize `src/steps/04-version-manager.tsx`: 'b' key back — refactor to SelectInput-based back for consistency; verify no text input conflict
- [ ] T030 [P] Standardize `src/steps/06-workspace.tsx`: text input present — apply two-phase pattern (input → confirm → back/continue)
- [ ] T031 [P] Standardize `src/steps/11-accounts.tsx`: text input present — apply two-phase pattern
- [ ] T032 [P] Standardize `src/steps/12-secrets-backend.tsx`: verify SelectInput-based back; no text input conflict expected
- [ ] T033 Update `tests/integration/wizard-flow.test.tsx`: add tests that verify back navigation from each step does NOT insert characters into any text field; add tests for skip consistency across optional steps

**Checkpoint**: All steps use identical navigation pattern; back from text-input steps never types into the field

---

### Phase 10: Contexts Step Unification (US5, P1)

**Purpose**: Merge steps 6 (workspace), 8 (git-auth), 11 (accounts) into a unified per-context sub-flow inside step 7.

- [ ] T034 Update `src/config/schema.ts`: add per-context fields to `ContextSchema` — `gitAuth: z.enum(['https', 'ssh', 'gh-cli']).optional()`, `account: z.string().optional()`, `dotfilesPath: z.string().optional()`; bump `schemaVersion` default to `'1.5'` (already at 1.5 — confirm no bump needed; or bump to `'1.6'` if contexts schema changes require it); add migration step if schema version bumps
- [ ] T035 Rewrite `src/steps/07-contexts.tsx`: implement per-context sub-flow: (1) context name input, (2) workspace path input (default `~/Developer/<name>`), (3) git auth SelectInput (per context), (4) VCS account input (shown only when auth method is `gh-cli` or `ssh`), (5) dotfiles path input (optional), (6) "Add another context?" prompt; restore all sub-flow state from `initialValues` on back-navigation
- [ ] T036 Update `src/modes/wizard.tsx`: remove steps 6 (`workspace`) and 8 (`git-auth`) and 11 (`accounts`) from `STEP_REGISTRY`; update `LAST_STEP`; update all `currentStep === N` render branches accordingly; update `advance()` handler for new step 7 data shape; pass `onBack` consistently to updated step 7
- [ ] T037 [P] Update `tests/integration/wizard-flow.test.tsx`: add test `contexts step collects workspace + git auth + account in one pass`; add test `back-navigation from within contexts sub-flow returns to previous sub-step, not previous wizard step`; add test `second context entry works after first is complete`
- [ ] T038 [P] Update `tests/unit/config-schema.test.ts` (or create): add tests for new per-context `gitAuth`, `account`, `dotfilesPath` fields; test migration from prior schema version

**Checkpoint**: Wizard reaches contexts step; all context sub-fields collected in one step; back-navigation within sub-flow works; steps 6, 8, 11 no longer appear in registry

---

### Phase 11: Language Bindings Inside Contexts (US6, P1)

**Purpose**: Remove standalone step 5 (Languages); add language selection as sub-flow inside the Contexts step.

- [ ] T039 Create `src/data/language-versions.ts`: define static version catalog per language — `NODE_VERSIONS: string[]` (e.g., `['22 (LTS)', '20 (LTS)', '18', '16']`), `PYTHON_VERSIONS`, `GO_VERSIONS`, `JAVA_VERSIONS`, `RUBY_VERSIONS`; export as `LANGUAGE_CATALOG: Record<string, { versions: string[]; managers: string[] }>`; managers list per language (e.g., Node → `['nvm', 'fnm', 'vfox', 'none']`)
- [ ] T040 Extend `src/steps/07-contexts.tsx`: add language sub-flow after dotfiles path: (1) SelectInput of languages from `LANGUAGE_CATALOG`; (2) per selected language: nested SelectInput of compatible version managers; (3) per language+manager: SelectInput of versions from catalog (plus "Other — enter manually" escape hatch that uses TextInput with two-phase pattern per BUG-002 fix); (4) "Add another language?" prompt; store result as `languages: Array<{ name, manager, version }>` per context
- [ ] T041 Update `src/modes/wizard.tsx`: remove step 5 (`languages`) from `STEP_REGISTRY`; remove `currentStep === 5` render branch; update `LAST_STEP`
- [ ] T042 [P] Update `tests/integration/wizard-flow.test.tsx`: add test `language sub-flow inside contexts produces correct per-context languages array`; add test `version manager choice for Node + nvm adds .nvmrc marker to context`; add test `selecting "Other" in version picker shows text input without back-key conflict`

**Checkpoint**: Step 5 removed from registry; language bindings collected per-context inside step 7; version catalog renders correctly

---

### Phase 12: Multiple Package Managers (US8, P2)

**Purpose**: Allow selecting Homebrew + MacPorts (or other combinations) simultaneously.

- [ ] T043 Update `src/steps/03-package-manager.tsx`: convert from single-select (`SelectInput`) to multi-select (same `useInput` + checkbox pattern as step 4 version managers); update `onComplete` to pass `packageManagers: string[]` instead of `packageManager: string`
- [ ] T044 [P] Update `src/config/schema.ts`: change `packageManager: z.string()` → `packageManagers: z.array(z.string()).min(1)`; add migration: `packageManager` (string) → `packageManagers: [packageManager]`; bump schema version if not already bumped in T034
- [ ] T045 [P] Update `tests/unit/config-schema.test.ts`: add test for `packageManagers` array; test migration from `packageManager` string

**Checkpoint**: User can select multiple package managers; config stores array; migration from old single-value config works

---

### Phase 13: Enhanced Environment Discovery (US9, P2)

**Purpose**: Step 1 detects languages, version managers, and dotfiles; passes results as wizard `initialValues`.

- [ ] T046 Extend `src/utils/env-detection.ts` (create if not exists): add `detectLanguages()` — runs `which node && node --version`, `which python3 && python3 --version`, `which go && go version`, `which java && java -version`, `which ruby && ruby --version` with 500ms timeout each; returns `Array<{ name: string; version: string }>` for each found; add `detectVersionManagers()` — checks `which nvm` (or `~/.nvm` exists), `which pyenv`, `which vfox`, `which rbenv`, `which fnm`, `which mise`; add `detectBrewLeaves()` — runs `brew leaves` if `which brew` succeeds, returns string array; add `detectDotfiles()` — checks existence of `~/.zshrc`, `~/.bashrc`, `~/.gitconfig`, `~/.ssh/config`, `~/.config/`
- [ ] T047 Update `src/steps/01-env-capture.tsx`: import and call `detectLanguages()`, `detectVersionManagers()`, `detectBrewLeaves()`, `detectDotfiles()` during the scan phase; display results grouped by category; pass detected values through `onComplete` so `wizard.tsx` can use them as `initialValues` for the contexts step (pre-populate language entries)
- [ ] T048 Update `src/modes/wizard.tsx`: when advancing from step 1, store `detectedLanguages` and `detectedVersionManagers` in the step 1 `StepFrame.values`; when rendering step 7 (contexts), pass these as `initialValues` suggestions so the language sub-flow can show detected languages pre-selected

**Checkpoint**: Step 1 surfaces detected languages, version managers, and dotfiles; detected languages appear as suggestions in the contexts language sub-flow

---

### Phase 14: Logic Tree Step Sequencing (US5/US9, P2)

**Purpose**: Replace linear `+1` step advancement with a function that computes next step from config state.

- [ ] T049 Add `getNextStep(step: number, config: Partial<TildeConfig>): number` to `src/modes/wizard.tsx`: implement initial logic tree — after step 3 (package manager): always → step 4; after step 4 (version manager): always → step 5 (contexts, formerly 7 after renumbering); after step 5 (contexts): if no account on any context → skip to tools; else → secrets; after tools: if no known editor detected → skip app-config; default: always +1; replace all `currentStep + 1` advancement calls with `getNextStep()`
- [ ] T050 Update `tests/unit/wizard-navigation.test.ts`: add tests for `getNextStep()` logic — "skips secrets step when no context has an account", "skips app-config when no editor tool selected", "advances normally when no skip condition met"

**Checkpoint**: Wizard flow adapts to prior answers; a user with no git accounts skips the git auth sub-flow

---

## Task Counts

| Phase | Tasks | User Story | Issues |
|-------|-------|-----------|--------|
| Phase 1: Setup | 2 | — | — |
| Phase 2: Foundational | 1 | — | — |
| Phase 3 | 10 | US1 (#67) | #67 |
| Phase 4 | 2 | US2 (#66) | #66 |
| Phase 5 | 3 | US3 (#74) | #74 |
| Phase 6 | 2 | US4 (#82) | #82 |
| Phase 7: Polish | 3 | — | — |
| **Phase 1 Subtotal** | **23** ✅ | | |
| Phase 8: Bug Fixes | 2 | BUG-001, BUG-002 | — |
| Phase 9: Nav Standardization | 8 | US7 | — |
| Phase 10: Contexts Unification | 5 | US5 | — |
| Phase 11: Languages in Contexts | 4 | US6 | — |
| Phase 12: Multi Package Manager | 3 | US8 | — |
| Phase 13: Enhanced Env Discovery | 3 | US9 | — |
| Phase 14: Logic Tree Sequencing | 2 | US5/US9 | — |
| **Phase 2 Subtotal** | **27** | | |
| **Grand Total** | **50** | | |
