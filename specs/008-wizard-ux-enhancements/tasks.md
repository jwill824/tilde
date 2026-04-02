# Tasks: Wizard UX & CLI Interaction Improvements

**Input**: Design documents from `/specs/008-wizard-ux-enhancements/`
**Branch**: `008-wizard-ux-enhancements`
**Issues**: #49, #50, #51, #53, #59, #11, #9, #27, #47

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1–US7)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Audit & Orientation)

**Purpose**: Understand the current wizard wiring before refactoring

- [X] T001 Audit `src/modes/wizard.tsx` — document current step registration pattern, step sequencing, StepProps interface location, and currentStep state shape; capture findings as inline comments to guide Phase 2+ refactoring

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema changes, plugin interfaces, and shared utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Extend Zod schema in `src/config/schema.ts` — add `BrowserConfig`, `EditorsConfig` (primary + additional), `AIToolConfig`, and `LanguageBinding` types; bump `schemaVersion: '1.5'`; update `TildeConfig` root type
- [X] T003 Add schema migration `v1.5` in `src/config/migrations/` (new file `v1-5.ts`) — auto-populate `browser: {selected:[], default:null}`, `aiTools: []`, `languageBindings: []` per context, normalize `editors` string → `{primary, additional:[]}` on load
- [X] T004 [P] Add `BrowserPlugin` and `EditorPlugin` interface types to `src/plugins/api.ts` — per data-model.md §4; include `detectInstalled()`, `install()`, `setAsDefault?()`, `applyProfile?()`, `getProfileGuidance?()` signatures
- [X] T005 [P] Create `src/utils/package-manager.ts` — Homebrew helpers: `listInstalledFormulae()`, `listInstalledCasks()`, `installCask(name: string)`, `installFormula(name: string)`, `runBrew(args: string[]): Promise<string>`
- [X] T006 Update `tests/contract/config-schema.test.ts` — add contract tests validating schema v1.5 shape: browser, aiTools, editors object, languageBindings per context, and migration from v1 (original — `schemaVersion` absent or integer `1`)

**Checkpoint**: Schema, plugin API contracts, and Homebrew utils are ready — all user stories can now begin

---

## Phase 3: User Story 1 — Wizard Navigation & Step Usability (Priority: P1) 🎯 MVP

**Goal**: Users can navigate backwards through wizard steps with values pre-populated, skip optional steps, and the context step presents a list view rather than losing defined contexts on back-navigation

**Independent Test**: Run the wizard, advance past 4 steps, press Back — previous step renders with original values intact. Navigate back to the contexts step after defining 2 contexts — both contexts appear in a list, none are lost.

- [X] T007 Refactor `src/modes/wizard.tsx` — replace `currentStep: number` with `WizardState` containing `steps: StepDefinition[]`, `history: StepFrame[]`, and `sharedValues: Record<string, unknown>`; implement `goNext(values)` (merges step output into `sharedValues`), `goBack()`, and `skip()` navigation actions; StepDefinition carries `required: boolean` flag
- [X] T007a Add `sharedValues` field to `WizardState` interface in `src/modes/wizard.tsx` — initialize as `{}`; extend `goNext(values)` to shallow-merge the provided step values into `sharedValues` so later steps can read earlier steps' values (e.g., shell selection pre-populated when reopened via `tilde update`); expose `sharedValues` in `StepProps` as optional `initialValues?: Record<string, unknown>` for consuming steps to read from
- [X] T008 [P] Add `StepDefinition` and `StepFrame` type declarations to `src/modes/wizard.tsx` — per data-model.md §1; register all 14 existing steps (00–13) with `required: true`; mark step 10 (app-config) and step 11 (accounts) as `required: false`
- [X] T009 Update step props type (in `src/modes/wizard.tsx` or shared types file) — add `onBack?: () => void` and `isOptional: boolean` to `StepProps`; propagate `onBack` and `isOptional` from wizard state to all existing step components `src/steps/00-config-detection.tsx` through `src/steps/13-config-export.tsx`; render Back control when `onBack` defined, Skip control when `isOptional: true`
- [X] T010 Update `src/steps/07-contexts.tsx` — add `ContextListView` sub-component rendered when `history` shows user arrived via back-navigation; list all previously defined contexts with edit/remove actions; "Add new" enters blank form; "Done" advances to next step; no contexts discarded on back-nav
- [X] T011 Write `tests/unit/wizard-navigation.test.ts` — unit tests covering: back nav restores values at T-1, back disabled at step 0, skip on optional step advances without values, context list view triggered on back-nav, context data preserved across back/forward navigation

**Checkpoint**: Wizard back navigation and context list view fully functional and independently testable

---

## Phase 4: User Story 2 — CLI Hardening: Config-Required Behavior (Priority: P2)

**Goal**: Running config-dependent commands without a discoverable config produces a clear error; tilde never launches the wizard unintentionally; configs are auto-discovered from standard locations

**Independent Test**: Run `tilde install` with no config file present anywhere → clear error message displayed, wizard does not launch. Run `tilde install` with `./tilde.config.json` present → config summary shown, confirmation requested.

- [X] T012 Implement config auto-discovery in `src/modes/config-first.tsx` — search in priority order: `--config` flag → `./tilde.config.json` → `~/.config/tilde/tilde.config.json` → `~/tilde.config.json`; when found via auto-discovery display found-path + config summary and require confirmation before applying
- [X] T013 Update `src/index.tsx` — when a config-dependent command (`install`) is run and no config is discoverable, display the actionable error message defined in `contracts/cli-schema.md §2` (searched locations listed) and exit with code 2; the wizard MUST NOT be launched
- [X] T014 Write `tests/unit/config-discovery.test.ts` — unit tests covering: discovery priority order, confirmation prompt on auto-discovery, error output when no config found, exit code 2, wizard not invoked when config missing

**Checkpoint**: CLI config-required behavior fully hardened; auto-discovery works correctly

---

## Phase 5: User Story 3 — Targeted Config Resource Updates (Priority: P2)

**Goal**: `tilde update <resource>` launches an interactive mini-wizard for one named config section and writes only that section back to the config, leaving all other fields unchanged

**Independent Test**: Run `tilde update shell` against an existing config → interactive shell-selection prompt appears → only `shell` field changes in saved config, all other fields identical. Run `tilde update widgets` → error listing valid resources, exit code 1.

- [X] T015 Create `src/modes/update.tsx` — `UpdateCommand` mode: accept `resource: UpdateResource`, validate against the enum from `contracts/cli-schema.md §1`, load full config via reader; for `languages` resource: two-step flow — first render a context selector (list all contexts from config), then render the language bindings form for the selected context only; for all other resources: mount the matching step component as a standalone mini-wizard; write only the updated section back via `atomicWriteConfig`
- [X] T016 Update `src/index.tsx` — add `tilde update <resource>` subcommand: parse resource arg, resolve config path (auto-discovery from Phase 4), route to `UpdateCommand` mode; display usage help when no resource provided
- [X] T017 Add validation and error output to `src/modes/update.tsx` — when resource name is not in `UpdateResource` enum, print the error format from `contracts/cli-schema.md §1` (invalid-name message + valid resource list) and exit code 1; when no config discoverable, print config-missing error and exit code 2
- [X] T018 Write `tests/unit/update-command.test.ts` — tests covering: valid resource routes to correct step, invalid resource prints error + exit 1, no-config-found prints error + exit 2, only targeted section changes after update, all other config fields preserved; for `languages` resource: context selector renders all contexts from config, context selection scopes the language bindings form to that context only, write-back modifies only the targeted context's `languageBindings` (other contexts unchanged)

**Checkpoint**: `tilde update <resource>` fully functional for all 7 resource types

---

## Phase 6: User Story 4 — Browser Selection Wizard Step (Priority: P3)

**Goal**: Wizard step 14 detects installed browsers, lets users select additional ones for installation via Homebrew, and optionally sets a system default browser via the `defaultbrowser` CLI

**Independent Test**: Run wizard to step 14 → installed browsers shown pre-selected, uninstalled options visible. Select an uninstalled browser → it installs via Homebrew. Select a default → `defaultbrowser` invoked, macOS dialog guidance shown. Skip step → no browsers changed.

- [X] T019 Create `src/plugins/first-party/browser/index.ts` — `BrowserPlugin` implementations for Safari, Chrome, Firefox, Arc, Brave, Edge; `detectInstalled()` checks known `.app` bundle paths (per research.md §2); `install()` calls `installCask()` from package-manager.ts; `setAsDefault()` runs `defaultbrowser <id>` and handles the macOS dialog confirmation message
- [X] T020 Create `src/steps/14-browser.tsx` — browser selection wizard step: on mount call `detectInstalled()` for all registered browser plugins and pre-select installed ones; multi-select UI via `ink-select-input`; "Set as default" sub-prompt after selection; offline detection (catch install errors) → warn with skipped-installs list and continue; skip action (isOptional: true)
- [X] T021 Register step 14 (browser) in `src/modes/wizard.tsx` step list — `{ id: "browser", label: "Browser Selection", required: false }` — positioned after step 13 (config-export) per constitution v2.3.0 §Setup Wizard Flow
- [X] T022 Write `tests/unit/browser-step.test.ts` — tests covering: installed browser detection via app path, pre-selection of detected browsers, install triggers Homebrew cask install, default-setting shows macOS dialog guidance, skip advances without changes, offline error produces warn-and-skip behavior

**Checkpoint**: Browser step fully functional, skippable, and gracefully handles offline and permission scenarios

---

## Phase 7: User Story 5 — Additional Editor Support (Priority: P3)

**Goal**: The editor/configuration wizard step (step 10) surfaces VS Code, Cursor, JetBrains IDEs, Neovim, and Zed; users can select a primary editor and additional editors; profile/settings guidance is provided per editor

**Independent Test**: Run wizard to step 10 → all 5 editor options visible. Select Neovim as primary → config records `editors.primary: "neovim"`. Select JetBrains + Cursor as additional → `editors.additional: ["webstorm", "cursor"]`. No VS Code required.

- [X] T023 Refactor `src/dotfiles/vscode.ts` into `src/plugins/first-party/vscode/index.ts` — implement `EditorPlugin` interface: `editorId: "vscode"`, `detectInstalled()` checks `/Applications/Visual Studio Code.app`, `install()` via Homebrew cask, `applyProfile()` wraps existing VS Code profile logic from dotfiles/vscode.ts
- [X] T024 [P] Create `EditorPlugin` implementations for Cursor (`src/plugins/first-party/cursor/index.ts`), Neovim (`src/plugins/first-party/neovim/index.ts`), JetBrains (`src/plugins/first-party/jetbrains/index.ts`), and Zed (`src/plugins/first-party/zed/index.ts`) — each implements `detectInstalled()` via app path, `install()` via Homebrew, `getProfileGuidance()` returning setup instructions string
- [X] T025 Update `src/steps/10-app-config.tsx` — replace VS Code-only logic with dynamic editor list from all registered `EditorPlugin` instances; primary editor selector + additional multi-select; render `getProfileGuidance()` result for each selected editor; save as `editors: { primary, additional }` in wizard state

**Checkpoint**: Editor step shows all 5 editors; primary + additional selection works; profile guidance displayed

---

## Phase 8: User Story 6 — AI Coding Assistant Tools Wizard Step (Priority: P3)

**Goal**: Wizard step 15 shows all Homebrew-installable AI coding tools with variant labels and install status; user selects tools to install; offline degrades gracefully

**Independent Test**: Run wizard to step 15 → all registered `AI_TOOL_PLUGINS` shown with install status for each. Select Claude Code → installed via Homebrew formula. Select Claude Desktop → installed via Homebrew cask. Tools with variants (Claude CLI vs Desktop) appear as separate labeled rows. Skip → no tools installed.

- [X] T026 Create `src/steps/15-ai-tools.tsx` — AI tools step: query `AI_TOOL_PLUGINS` from `src/plugins/first-party/ai-tools/index.ts` (all plugins with `category === "ai-tool"`); on mount call `listInstalledFormulae()` and `listInstalledCasks()` from package-manager.ts to mark install status against each plugin's `brewId`; multi-select with variant labels; install selected tools on confirm via each plugin's `install()` method; catch network errors → warn with uninstalled list and continue; skip action (isOptional: true) — no tool definitions embedded as inline literals in the step component
- [X] T027 Register step 15 (ai-tools) in `src/modes/wizard.tsx` step list — `{ id: "ai-tools", label: "AI Coding Tools", required: false }` — positioned after step 14 (browser)
- [X] T028 Write `tests/unit/ai-tools-step.test.ts` — tests covering: plugin registry queried on mount — all `AI_TOOL_PLUGINS` returned with install status, variant plugins appear as separate labeled entries, install triggers correct Homebrew command (formula vs cask) via each plugin's `install()` method, offline error produces warn-and-skip, skip advances without installing anything

**Checkpoint**: AI tools step fully functional with Homebrew discovery, variant labeling, and offline resilience

---

## Phase 9: User Story 7 — Language Version Scoping Per Workspace Context (Priority: P4)

**Goal**: Each workspace context can have one or more language runtime + version bindings; activating a context writes the appropriate version file (`.nvmrc`, `.vfox.json`, `.tool-versions`) to the context directory so the version manager activates it automatically

**Independent Test**: Define two contexts — personal (Node 22) and work (Java 21, Node 18). `cd` into personal directory → `.nvmrc` / `.vfox.json` contains `22`; `cd` into work → version file contains `java 21.0.3` and `nodejs 18.20.0`. Switching contexts changes active runtime automatically via the version manager's own shell hook.

- [X] T029 Update `src/steps/07-contexts.tsx` — within the context edit form, add "Language Versions" section: runtime selector (nodejs, java, python, go, ruby) + version text input; support adding/removing multiple bindings; store bindings array in wizard state under `contexts[].languageBindings`
- [X] T030 Update `src/dotfiles/cd-hook.ts` — on context activation, iterate `context.languageBindings` and write the appropriate version file to the context directory root: `.nvmrc` (nvm), `.vfox.json` (vfox), `.tool-versions` (mise/asdf); operation must be idempotent (overwrite if file exists with different version)
- [X] T031 Update `src/dotfiles/cd-hook.ts` — add missing-version handling: when activated context has a language binding whose version is not installed, display a prompt with install instructions for the configured version manager; do not block context activation
- [X] T032 Write `tests/unit/language-binding.test.ts` — tests covering: version file written correctly for nvm (.nvmrc), vfox (.vfox.json), and mise (.tool-versions); multiple bindings in single context; idempotent overwrite; missing version prompts with install guidance; context with no bindings activates cleanly

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Integration tests, documentation, and regression validation

- [X] T033 [P] Update `tests/integration/wizard-flow.test.ts` — extend existing integration tests to cover: back navigation across 3+ steps with value restoration, skip on browser and ai-tools steps, new step sequence (14-browser, 15-ai-tools), context list view on back-nav
- [X] T034 [P] Update `tests/contract/config-schema.test.ts` — validate complete schema v1.5 round-trip: write config with all new fields, reload, assert equality; validate v1 (original — `schemaVersion` absent or integer `1`) → v1.5 migration produces correct defaults
- [X] T035 [P] Update `docs/config-format.md` — document new config fields: `browser` (selected, default), `aiTools` (name, label, variant), `editors` object (primary, additional), `contexts[].languageBindings` (runtime, version); add annotated examples
- [X] T036 [P] Update `src/dotfiles/vscode.ts` import references throughout codebase to point to `src/plugins/first-party/vscode/index.ts` after T023 refactor — run `grep -r "dotfiles/vscode"` to find all consumers
- [X] T037 Run `npm test` — fix any regressions introduced by the `src/modes/wizard.tsx` StepHistory refactor in T007–T009; confirm all pre-existing unit, integration, and contract tests pass
- [X] T038 Validate `quickstart.md` scenarios manually — run each documented user flow (back nav, `tilde update shell`, browser step, AI tools step, language bindings) against a local build to confirm the quickstart accurately reflects delivered behavior
- [X] T039 Write `tests/integration/context-switching.test.ts` — integration tests for language version activation on context switch (required by constitution Dev Workflow §362): (1) cd to personal context (Node 22 binding) → `.nvmrc` contains `22`; (2) cd to work context (Java 21 + Node 18 bindings) → `.tool-versions` contains correct entries; (3) context with no bindings activates cleanly with no version files written; (4) version files are overwritten idempotently when context is re-activated with different binding values; (5) context with a binding whose version is not installed → installation guidance prompt is displayed and activation does not block; use `tmp` directories and real `fs` writes (no mocks for file I/O); assert each activation completes in ≤ 5 seconds (SC-006)
- [X] T040 Extract `src/ui/step-nav.tsx` — shared `StepNav` component rendering Back ('b') and Skip ('s') keyboard-shortcut controls; used by all wizard step components that receive `onBack`/`isOptional` props; eliminates duplicated navigation bar rendering across the 16-step component tree
- [X] T091 Create `src/modes/reconfigure.tsx` — `ReconfigureMode` component wired to `--reconfigure` flag in `src/index.tsx`; phases: `loading` (calls `loadConfig(configPath)`) → `wizard` (passes loaded config as `initialConfig`) → `saving` (calls `atomicWriteConfig`) → `done`; ENOENT path → `error` phase with actionable message; validation failure path → `field-errors` phase showing invalid fields as warnings then opening wizard with partial values; update `src/index.tsx` to parse `--reconfigure` boolean and route to `ReconfigureMode` before other mode logic
- [X] T092 Write `tests/unit/reconfigure.test.ts` and `tests/integration/reconfigure.test.ts` — unit tests (T091): (1) valid config pre-populates `initialConfig` on Wizard mock (verified via `mock.calls[0][0].initialConfig`); (2) wizard completion triggers `atomicWriteConfig` with correct path and schema version; (3) ENOENT → error rendered, wizard NOT launched; (4) validation error → `field-errors` phase renders without blocking; integration tests: write real temp config, run `ReconfigureMode`, assert overwrite; use `vi.resetModules()` + `vi.doMock()` pattern for isolation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user story phases**
- **Phase 3 (US1)**: Depends on Phase 2 only
- **Phase 4 (US2)**: Depends on Phase 2 only
- **Phase 5 (US3)**: Depends on Phase 4 (uses config discovery from US2)
- **Phase 6 (US4)**: Depends on Phase 2 (needs BrowserPlugin from T004, package-manager.ts from T005)
- **Phase 7 (US5)**: Depends on Phase 2 (needs EditorPlugin from T004)
- **Phase 8 (US6)**: Depends on Phase 2 (needs package-manager.ts from T005)
- **Phase 9 (US7)**: Depends on Phase 3 (extends contexts step from US1)
- **Phase 10 (Polish)**: Depends on all desired user stories complete

### User Story Dependencies

| Story | Depends On | Blocks |
|-------|-----------|--------|
| US1 (Wizard Nav) | Phase 2 | US7 (extends contexts step) |
| US2 (CLI Hardening) | Phase 2 | US3 (update command uses discovery) |
| US3 (tilde update) | US2 | — |
| US4 (Browser) | Phase 2 | — |
| US5 (Editors) | Phase 2 | — |
| US6 (AI Tools) | Phase 2 | — |
| US7 (Language Versions) | US1 | — |

### Within Each User Story

- Foundational types/interfaces before step components
- Plugin implementations before wizard step registration
- Step registration before integration testing

---

## Parallel Opportunities

### Phase 2 (Foundational) — T004 and T005 are parallel
```
T002 → T003 (sequential — migration builds on schema)
T004 [P]    (independent — plugin interfaces only touch api.ts)
T005 [P]    (independent — new file, no deps)
T006        (after T002 — contract tests validate new schema)
```

### Phase 3 (US1) — T007 and T008 are parallel then converge
```
T007 (wizard.tsx refactor)
T008 [P] (StepDefinition types — separate concern in same file, coordinate)
→ T009 (StepProps propagation — depends on both T007 and T008)
→ T010 (contexts list view — depends on T009 for onBack prop)
→ T011 (tests — after T010)
```

### Phases 6, 7, 8 — can run in parallel after Phase 2
```
Phase 6 (US4 Browser):  T019 → T020 → T021 → T022
Phase 7 (US5 Editors):  T023 → T024 [P] → T025
Phase 8 (US6 AI Tools): T026 → T027 → T028
```

### Phase 10 (Polish) — T033, T034, T035, T036 all parallel
```
T033 [P]  T034 [P]  T035 [P]  T036 [P]
→ T037 (run tests — after all implementation complete)
→ T038 (manual validation — final)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T006)
3. Complete Phase 3: US1 — Wizard Navigation (T007–T011)
4. **STOP and VALIDATE**: Run wizard, test back nav, test context list view
5. Ship — back navigation alone closes 3 open issues (#49, #50, #51)

### Incremental Delivery

| Milestone | Stories | Closes Issues |
|-----------|---------|--------------|
| M1: Wizard Nav | US1 | #49, #50, #51 |
| M2: CLI Hardening | US2 + US3 | #59, #47 |
| M3: New Steps | US4 + US5 + US6 | #11, #9, #27 |
| M4: Language Scoping | US7 | #53 |

### Parallel Team Strategy

After Phase 2 is complete:
- **Developer A**: US1 (T007–T011) then US7 (T029–T032)
- **Developer B**: US2 (T012–T014) then US3 (T015–T018)
- **Developer C**: US4 (T019–T022), US5 (T023–T025), US6 (T026–T028) in sequence

---

## Summary

| Phase | Tasks | Stories | Parallel Ops |
|-------|-------|---------|-------------|
| 1: Setup | T001 | — | — |
| 2: Foundational | T002–T006 | — | T004, T005 |
| 3: US1 Wizard Nav | T007–T011 | US1 | T008 |
| 4: US2 CLI Hardening | T012–T014 | US2 | — |
| 5: US3 tilde update | T015–T018 | US3 | — |
| 6: US4 Browser | T019–T022 | US4 | — |
| 7: US5 Editors | T023–T025 | US5 | T024 |
| 8: US6 AI Tools | T026–T028 | US6 | — |
| 9: US7 Lang Versions | T029–T032 | US7 | — |
| 10: Polish | T033–T039, T040, T091–T092 | — | T033–T036 |
| **Total** | **41 tasks** | **8 stories** | **8 parallel tasks** |
