# Tasks: Wizard Bug Fixes

**Input**: Design documents from `/specs/011-wizard-bug-fixes/`
**Branch**: `011-wizard-bug-fixes`
**GitHub Issues**: #90, #91, #92, #93, #94, #66, #103

**Regression tests** (stack.md absent — inferred from codebase):
- Lint: `npm run lint`
- Unit: `npm test`
- Integration: `npm run test:integration`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to
- All paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Establish a clean baseline before making changes.

- [X] T001 Run `npm run lint && npm test && npm run test:integration` to confirm zero pre-existing failures and record baseline output

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No shared infrastructure changes are required for this spec — all user stories touch independent files. This phase is intentionally minimal.

- [X] T002 Audit `src/ui/step-nav.tsx`, `src/modes/wizard.tsx`, `src/ui/config-summary.tsx`, `src/index.tsx`, and `src/steps/contexts.tsx` to confirm line-level locations for each fix match the root causes in `specs/011-wizard-bug-fixes/research.md` before editing any file

**Checkpoint**: File locations confirmed — user story work can begin

---

## Phase 3: User Story 1 — Consistent Back Navigation (Priority: P1) 🎯 MVP

**Goal**: Every wizard step responds to `(b)` / `←`; text-input steps block back nav while field is focused; first step shows inline hint instead of silently ignoring.

**Independent Test**: Launch wizard, navigate to each step, press `(b)` — every step transitions back. On step 0, press `(b)` — hint appears. In Contexts text-input phase, press `(b)` — no navigation; blur field, press `(b)` — navigation fires.

### Implementation

- [X] T003 [US1] Add `isInputFocused?: boolean` and `onAtFirstStep?: () => void` props to `StepNavProps` interface in `src/ui/step-nav.tsx`
- [X] T004 [US1] Update `StepNav.useInput` call to pass `{ isActive: !isInputFocused }` option, and call `onAtFirstStep()` when `(b)` is pressed but `onBack` is undefined, in `src/ui/step-nav.tsx`
- [X] T005 [US1] Add `showFirstStepHint` boolean state to `src/modes/wizard.tsx`; wire `onAtFirstStep={() => setShowFirstStepHint(true)}` when rendering `StepNav` at step 0; render inline `<Text color="yellow">Already on the first step — press (q) to quit.</Text>` below step title when `showFirstStepHint` is true; auto-clear after 2s via `setTimeout`
- [~] T006 [P] [US1] ~~Derive `isInputFocused` from current phase name in `src/steps/contexts.tsx`~~ — **Deferred**: `GateInput` in `contexts.tsx` already uses `{ isActive: !!onBack }` which satisfies FR-001's focus-safe back-nav requirement without the `isInputFocused` prop thread. No code change needed.
- [~] T007 [P] [US1] ~~Derive `isInputFocused` from whether the step is in text-entry mode in `src/steps/app-config.tsx`~~ — **N/A**: `app-config.tsx` has no text-input phases; the `isInputFocused` guard is not required here.
- [X] T008 [US1] Update `tests/unit/wizard-navigation.test.ts` to add: (a) test that `onAtFirstStep` is called when `onBack` is absent and `(b)` is pressed, (b) test that `useInput` is inactive (`isActive: false`) when `isInputFocused` is true

**Checkpoint**: All wizard steps respond to `(b)`; text-input focus guard works; first-step hint renders and clears

---

## Phase 4: User Story 2 — Resume Wizard from Any Step (Priority: P1) 🎯 MVP

**Goal**: Resuming with a saved config places the user at the correct step (not beyond the last), pre-populates all prior steps with saved values, and allows full backward traversal.

**Independent Test**: Run wizard to completion, save config, re-run `tilde` — wizard resumes at Apply step (not blank screen); press `(b)` through all prior steps — each shows pre-filled values from the saved config.

### Implementation

- [X] T009 [US2] Add `extractStepValues(stepIdx: number, cfg: Partial<TildeConfig>): Record<string, unknown>` helper function in `src/modes/wizard.tsx` using the mapping table from `specs/011-wizard-bug-fixes/data-model.md §2` (steps 2–10 map to config fields; steps 0, 1, 11, 12 return `{}`)
- [X] T010 [US2] Replace `values: {}` with `values: extractStepValues(idx, resumeConfig)` in the `setHistory(...)` call within the resume branch of `src/modes/wizard.tsx` so all history frames carry per-step values derived from the saved config
- [X] T011 [US2] Replace `setCurrentStep(resumeStep + 1)` with `setCurrentStep(Math.min(resumeStep + 1, LAST_STEP))` in the resume branch of `src/modes/wizard.tsx` to prevent an out-of-bounds current step when resuming from the final step
- [X] T012 [US2] Update `tests/unit/wizard-navigation.test.ts` to add: (a) test that `extractStepValues(2, { shell: 'zsh' })` returns `{ shell: 'zsh' }`, (b) test that resuming with `lastCompletedStep: 12` sets `currentStep` to `12` (not `13`), (c) test that history frames after resume carry non-empty `values` matching the mock config

**Checkpoint**: Resume flow works end-to-end; no blank-screen exit; back navigation through all prior steps shows saved values

---

## Phase 5: User Story 3 — Terminal Cursor Visible After Apply (Priority: P1)

**Goal**: Terminal cursor is always restored when tilde exits — normal completion, error, `Ctrl-C`, or `SIGTERM`.

**Independent Test**: Run tilde through the full apply step. After exit, confirm the terminal cursor is visible and shell input is echoed normally. Test Ctrl-C mid-wizard and confirm cursor is restored.

### Implementation

- [X] T013 [P] [US3] At the top of `main()` in `src/index.tsx` — before any Ink renders — register: `process.stdout.write('\x1b[?25h')` (safety write); `process.on('exit', () => process.stdout.write('\x1b[?25h'))`;  `process.on('SIGINT', () => { process.stdout.write('\x1b[?25h'); process.exit(130); })`; `process.on('SIGTERM', () => { process.stdout.write('\x1b[?25h'); process.exit(143); })` (see `specs/011-wizard-bug-fixes/research.md §R2`)
- [ ] T014 [P] [US3] *(Deferred — complex process-level test; SIGINT handler verified manually. Track as a follow-up issue.)* Update `tests/integration/wizard-flow.test.tsx` to add a test that sending SIGINT to a running wizard process results in exit code 130 (not 0 or 1) confirming the signal handler fires

**Checkpoint**: Cursor restored on all exit paths; SIGINT exits with code 130

---

## Phase 6: User Story 4 — Optional Steps Display Correctly (Priority: P2)

**Goal**: Optional step labels in the sidebar read clearly as "(opt)" annotations, not as greyed-out disabled controls.

**Independent Test**: Run tilde, observe sidebar — "Editor Configuration (opt)", "Browser Selection (opt)", "AI Coding Tools (opt)" must appear in the same visual weight as their label text, not dim grey.

### Implementation

- [X] T015 [P] [US4] In `src/modes/wizard.tsx` sidebar render, change `{!step.required && !done && <Text dimColor> (opt)</Text>}` to `{!step.required && !done && <Text> (opt)</Text>}` (remove `dimColor` prop from the `(opt)` suffix only; the outer step label dimming is unchanged)

**Checkpoint**: Optional step labels render with "(opt)" in normal text weight, not greyed out

---

## Phase 7: User Story 5 — Configuration Summary Reflects All Steps (Priority: P2)

**Goal**: The summary/review step shows browser and AI coding tool selections alongside all other configured fields; skipped optional steps are omitted entirely.

**Independent Test**: Select a browser and one AI tool in the wizard; proceed to summary — both must appear. Skip the AI tools step; proceed to summary — the AI tools section must be absent.

### Implementation

- [X] T016 [P] [US5] In `src/ui/config-summary.tsx`, after the Secrets Backend section, add browser section (conditional on `config.browser?.selected?.length`) and AI Coding Tools section (conditional on `config.aiTools?.length`), using `config.browser.selected.join(', ')` and `config.aiTools.map(t => t.label).join(', ')` — actual `browser` field is `{ selected: string[], default: string|null }`, not a plain string
- [X] T017 [P] [US5] Add tests to `tests/unit/config-summary.test.ts` (new file) covering: config with `browser.selected: ['arc']` and `aiTools: [{ label: 'Claude Code', ... }]` renders both sections, and config with no browser/aiTools renders neither section

**Checkpoint**: Summary shows browser + AI tools when configured; omits them when not configured

---

## Phase 8: User Story 6 — Contexts Language Version Selection (Priority: P2)

**Goal**: Users can select multiple languages per context and specify a version for each; validation blocks empty/invalid version input.

**Independent Test**: Open Contexts step, add a context, navigate to language binding — select Node.js and Python, enter versions `20.0.0` and `3.12.0`; proceed to summary — both language-version pairs appear in the config.

### Implementation

- [X] T018 [US6] Investigate `lang-select`, `lang-manager`, `lang-version`, and `lang-version-manual` phases in `src/steps/contexts.tsx` — **Finding**: multi-language loop (`lang-gate → lang-select → ... → lang-gate again`) was already implemented correctly pre-spec; no structural fix required. T020 (validation) was the only change needed.
- [X] T019 [US6] ~~Fix the multi-language selection flow~~ — **No change required**: investigation (T018) confirmed the `lang-gate → lang-select → lang-manager → lang-version → lang-gate` loop already advances correctly through multiple languages without losing prior entries.
- [X] T020 [US6] Fix `lang-version` and `lang-version-manual` phases in `src/steps/contexts.tsx` to validate that version input is non-empty and matches a semver-like pattern; show inline error `<Text color="red">Version cannot be empty — enter a valid version (e.g., 20.0.0)</Text>` without advancing until corrected
- [X] T021 [US6] Update `tests/unit/wizard-navigation.test.ts` (not language-bindings.test.ts) to add tests covering: (a) `LanguageBindingSchema` validation rejects empty version, (b) valid semver passes schema validation

**Checkpoint**: Users can configure ≥ 2 language-version pairs per context; invalid versions show error and block proceed

---

## Phase 9: User Story 7 — Site Docs Reflect Spec 010 Changes (Priority: P2)

**Goal**: The docs site accurately describes the current 13-step wizard, merged Contexts step, back-navigation, and new tool support (MacPorts, rbenv, fnm, python-venv).

**Independent Test**: Read updated docs end-to-end — all 13 steps listed, back-nav `(b)` documented, Contexts step described as merged (workspace + git auth + accounts + languages), new tools appear in supported options lists.

### Implementation

- [X] T022 [P] [US7] Rewrite `site/docs/src/content/docs/getting-started.md`: replace old 15-step list with condensed 13-step STEP_REGISTRY walkthrough; update "Back Navigation" section to reference StepNav `(b)` key and `onAtFirstStep` hint; add note that steps 10, 11 are optional (STEP_REGISTRY `required: false` entries); add MacPorts, rbenv, fnm, python-venv to supported tool lists
- [X] T023 [P] [US7] Update `site/docs/src/content/docs/config-reference.md`: fix `browser` field shape from `string` to `{ selected: string[], default: string | null }`; fix `aiTools` entry shape from `string[]` to `{ name: string; label: string; variant: string }[]`; update schemaVersion default value to `"1.6"`; add `fnm`, `rbenv`, `python-venv` to versionManagers enum list; update full config example

**Checkpoint**: Docs site reflects current spec 010 implementation with no stale step references or missing tool entries

---

## Phase 10: Polish & Regression Validation

**Purpose**: Verify no regressions introduced, lint clean, all tests passing.

- [X] T024 Run `npm run lint` and fix any lint errors introduced by changes in T003–T023
- [X] T025 [P] Run `npm test` and confirm all unit tests pass (includes wizard-navigation, language-bindings, ai-tools, config-summary coverage)
- [X] T026 [P] Run `npm run test:integration` and confirm all integration tests pass (includes wizard-flow, cli-regression, reconfigure)
- [ ] T027 Manual smoke test: launch `tilde` wizard, navigate forward through all 13 steps, navigate back through all steps (including text-input steps), confirm `(opt)` labels, confirm cursor visible after quit, confirm summary shows browser + AI tools when configured

---

## Dependency Graph

```
T001 (baseline)
  └── T002 (file audit)
        ├── T003 → T004 → T005 → T006 → T007 → T008  [US1 — sequential in step-nav + wizard]
        ├── T009 → T010 → T011 → T012                  [US2 — sequential in wizard.tsx]
        ├── T013 → T014                                 [US3 — independent: index.tsx only]
        ├── T015                                        [US4 — independent: 1-line change in wizard.tsx]
        ├── T016 → T017                                 [US5 — independent: config-summary.tsx only]
        ├── T018 → T019 → T020 → T021                  [US6 — sequential in contexts.tsx]
        ├── T022                                        [US7a — independent: docs only]
        └── T023                                        [US7b — independent: docs only]

T024 → T025 → T026 → T027  [all user stories must complete before polish phase]
```

**Parallel opportunities** (after T002):
- US3, US4, US5, US6, US7 can all start in parallel once T002 is done
- US1 and US2 should be sequential (both edit `wizard.tsx`; US1 must land first to avoid merge conflict)
- Within US7: T022 and T023 are parallel (different doc files)
- T025 and T026 can run in parallel

---

## Implementation Strategy

**MVP scope** (deliver first): US1 + US2 + US3 (P1 bugs — all three ship together as they represent the core wizard usability issues)

**Increment 2**: US4 + US5 (P2 visual/summary bugs — cosmetic, low risk, small diffs)

**Increment 3**: US6 (P2 language version bug — larger change in contexts.tsx, needs investigation first via T018)

**Increment 4**: US7 (docs update — content-only, no code risk, verify last against the implemented behaviour)

**Format validation**: All 27 tasks follow `- [ ] TNNN [P?] [Story?] Description with file path` format ✅

| Phase | Tasks | User Story | Count |
|-------|-------|-----------|-------|
| Setup | T001 | — | 1 |
| Foundational | T002 | — | 1 |
| Phase 3 | T003–T008 | US1 | 6 |
| Phase 4 | T009–T012 | US2 | 4 |
| Phase 5 | T013–T014 | US3 | 2 |
| Phase 6 | T015 | US4 | 1 |
| Phase 7 | T016–T017 | US5 | 2 |
| Phase 8 | T018–T021 | US6 | 4 |
| Phase 9 | T022–T023 | US7 | 2 |
| Polish | T024–T027 | — | 4 |
| **Total** | | | **27** |
