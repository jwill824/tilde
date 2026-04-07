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
| **Total** | **23** | | |

Parallelizable tasks: 10 (T005–T012, T021–T022)
