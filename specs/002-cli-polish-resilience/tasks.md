# Tasks: CLI Polish & Resilience

**Feature**: `002-cli-polish-resilience`
**Branch**: `002-cli-polish-resilience`
**Input**: `specs/002-cli-polish-resilience/` — spec.md, plan.md, research.md, data-model.md,
  contracts/config-schema.md, contracts/cli-commands.md, quickstart.md
**Stack**: Node.js 20 LTS · TypeScript 5.4 · Ink 6.8 · Zod 4.3 · execa 9.6 · Vitest 2

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Parallelisable — different files, no dependency on an incomplete task in this phase
- **[Story]**: User story label — [US1] Dynamic Splash, [US2] `--reconfigure`, [US3] Schema Migration
- File paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Confirm the branch is in a green state before making any changes.

- [X] T001 Run `npm run build && npm test` on branch `002-cli-polish-resilience` and confirm all existing unit, integration, and contract tests pass before any changes are made

**Checkpoint**: All existing tests pass — safe to begin feature work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Two additive changes that both US2 and US3 depend on. Neither user-story phase
can begin until these are complete.

**⚠️ CRITICAL**: The `schemaVersion` Zod field (T002) is required by US2 (the loaded config
type changes) and US3 (migration reads/writes the field). The `atomicWriteConfig()` helper
(T003) is required by US2 (reconfigure write-back) and US3 (migration write-back).

- [X] T002 Add `schemaVersion: z.number().int().min(1).default(1)` to `TildeConfigSchema` in `src/config/schema.ts` — place immediately after `version: z.literal('1').default('1')`; the Zod `.default(1)` satisfies FR-020 (configs predating spec 002 have no `schemaVersion` field and parse cleanly as version 1)
- [X] T003 [P] Add `atomicWriteConfig(targetPath: string, content: string): Promise<void>` export to `src/config/writer.ts` — implementation: write content to `${targetPath}.tmp` via `fs/promises.writeFile`, then `fs/promises.rename` into place; wrap in try/finally to `unlink` the `.tmp` file and rethrow on rename failure (R-004 pattern from research.md)

**Checkpoint**: Foundation ready — US1, US2, and US3 can now proceed. US2 and US3 can
proceed in parallel once US1's `app.tsx` changes are complete (see dependency notes).

---

## Phase 3: User Story 1 — Dynamic Splash Screen (Priority: P1) 🎯 MVP

**Goal**: Every interactive startup (wizard, config-first, reconfigure) displays a live
environment snapshot — macOS name+version, CPU arch, shell name+version, tilde version —
before any wizard step or config prompt appears.

**Independent Test**: Run `node dist/index.js` on any supported Mac. The splash screen
renders with all four fields populated accurately (OS name+version, arch, shell name+version,
tilde version). No static placeholder text. Non-interactive mode (`--ci`) produces zero
splash output. Verifiable without completing the wizard.

### Tests for User Story 1

- [X] T004 [P] [US1] Write unit tests for `src/utils/environment.ts` in `tests/unit/utils/environment.test.ts` covering: (a) `detectOsVersion()` returns trimmed string from mocked `sw_vers -productVersion` output; (b) `detectOsName()` maps major version 13→Ventura, 14→Sonoma, 15→Sequoia, and falls back to `"macOS {version}"` for unmapped versions (e.g., 16); (c) `detectShellName()` returns basename of `$SHELL` env var; (d) `detectShellVersion()` parses zsh/bash/fish `--version` first-line format and returns `undefined` when detection fails; (e) `captureEnvironment()` completes within 500 ms wall time (FR-006, SC-002) — write these tests first so they fail before T005 is implemented

### Implementation for User Story 1

- [X] T005 [US1] Create `src/utils/environment.ts` — define and export the `EnvironmentSnapshot` interface (`os`, `arch`, `shellName`, `shellVersion?`, `tildeVersion`); implement `detectOsVersion(): Promise<string>` (calls `sw_vers -productVersion` via execa, 3 s timeout, catches all errors → `"unknown"`); implement `detectOsName(version: string): string` (static lookup map keyed by major version 13→Ventura/14→Sonoma/15→Sequoia, falls back to `"macOS ${version}"` per R-002); implement `detectArch(): string` (calls `node:os.arch()`, maps `"x64"` → `"x64"`, passes through `"arm64"`, falls back to `"unknown"`); implement `detectShellName(): string` (basenames `process.env.SHELL`, falls back to `"unknown"`); implement `detectShellVersion(shellPath: string): Promise<string | undefined>` (runs `shellPath --version`, matches `/(\d+\.\d+[\.\d]*)/` on first line of stdout, returns `undefined` on any failure per R-003); implement `captureEnvironment(tildeVersion: string): Promise<EnvironmentSnapshot>` (runs all detections in parallel via `Promise.all`, composes result object)
- [X] T006 [US1] Update `src/ui/splash.tsx` — change `SplashProps` to replace `version: string` with `environment: EnvironmentSnapshot`; add the four labeled display rows below the wave animation (row 1: `environment.os`; row 2: `environment.arch`; row 3: `environment.shellName` + optional `" " + environment.shellVersion` when defined per FR-004; row 4: `environment.tildeVersion`); update `CompactHeader` props from `{ version: string }` to `{ tildeVersion: string }` and update its internal reference accordingly
- [X] T007 [US1] Update `src/app.tsx` — add state `const [environment, setEnvironment] = useState<EnvironmentSnapshot | null>(null)`; in interactive modes, call `captureEnvironment(version)` via `useEffect` at startup and `setEnvironment` on resolution; pass `environment` to `<Splash environment={environment} onDone={...} />` (render a loading state or defer splash until environment is ready); pass `environment.tildeVersion` to `<CompactHeader tildeVersion={...} />`; do not call `captureEnvironment()` when `mode === 'non-interactive'` (FR-005); handle rejection by falling back to a minimal `EnvironmentSnapshot` with unknown fields rather than crashing

**Checkpoint**: `node dist/index.js` shows dynamic OS/arch/shell/version in splash. `--ci` shows no splash output. US1 independently complete and testable.

---

## Phase 4: User Story 2 — `--reconfigure` Flag (Priority: P2)

**Goal**: `tilde --reconfigure` loads the existing `tilde.config.json`, opens the full
14-step wizard with every field pre-populated, and atomically writes the updated config on
completion. Exiting early preserves the original file.

**Independent Test**: Start with a complete, valid `tilde.config.json`. Run
`node dist/index.js --reconfigure`. Verify all 14 wizard steps show stored values as
defaults. Change one field and complete. Verify only that one field differs in the written
config; all other fields are byte-identical to the original.

### Tests for User Story 2

- [X] T008 [P] [US2] Write integration tests for the full reconfigure flow in `tests/integration/reconfigure.test.ts` covering: (a) valid config is loaded and all fields are available as `initialConfig` to `Wizard`; (b) completing the wizard with one changed field writes only that change (all other fields preserved); (c) no `tilde.config.json` found → non-zero exit + actionable message per FR-010; (d) schema-invalid config → valid fields loaded as defaults + wizard opens per FR-012; (e) user exits early (simulated) → original file preserved unmodified per FR-011 — write these tests first so they fail before T009 is implemented

### Implementation for User Story 2

- [X] T009 [US2] Create `src/modes/reconfigure.tsx` — `ReconfigureMode` Ink component with props `{ configPath: string; environment: EnvironmentSnapshot; onComplete: () => void }`; implement a `Phase` union type mirroring `config-first.tsx`'s pattern with states: `loading` → `error` → `wizard` → `saving` → `done`; in `useEffect` call `loadConfig(configPath)`, on success transition to `wizard` phase with `initialConfig = loadedConfig`; handle errors: (a) file not found (ENOENT) → `error` phase with FR-010 message directing user to run `tilde` without flags; (b) config parse/schema failure → extract valid fields via `TildeConfigSchema.safeParse`, display field-level errors, open wizard with valid fields as `initialConfig` per FR-012; (c) permissions/read error → `error` phase showing file path and suggested fix; render `<Wizard initialConfig={loadedConfig} onComplete={async (newConfig) => { await atomicWriteConfig(configPath, JSON.stringify(newConfig, null, 2) + '\n'); transition to done }}>`; on wizard `onExit` / early cancel, transition to a `cancelled` phase that calls `onComplete()` without writing (FR-011); render appropriate Ink UI for each phase state
- [X] T010 [US2] Update `src/app.tsx` — import `ReconfigureMode` from `'./modes/reconfigure.js'`; replace the existing stub `{reconfigure && <Text color="yellow">Reconfiguring from scratch...</Text>}` block inside the `Wizard` render with a proper branch: when `reconfigure === true` and `mode !== 'non-interactive'`, render `<ReconfigureMode configPath={configPath ?? ''} environment={environment} onComplete={() => setDone(true)} />` instead of `<Wizard>`; ensure the branch check occurs before the Wizard render and after the splash/header block set up in T007

**Checkpoint**: `tilde --reconfigure` opens wizard pre-populated with stored values. Exiting early leaves original config unmodified. No-config case shows clear error. US2 independently complete and testable.

---

## Phase 5: User Story 3 — Config Schema Versioning & Migration (Priority: P3)

**Goal**: Every `tilde.config.json` carries an integer `schemaVersion`. On every config
load, if the file's version is behind the current version, all applicable migration steps
run in ascending order, the migrated config is written back atomically, and the user is
notified. Migration failures preserve the original file. Future-version configs are warned
but not modified.

**Independent Test**: Create a `tilde.config.json` with `schemaVersion: 1` (or with the
field absent entirely). Load it against the migration layer targeting the current version.
Verify the runner's `MigrationResult` has `didMigrate: false` for a version-1 config (no
migrations registered yet), all original values are preserved, and the file is not rewritten.
Confirm the future-version warning path by setting `schemaVersion: 99`.

### Tests for User Story 3

- [X] T011 [P] [US3] Write unit tests for `src/config/migrations/runner.ts` in `tests/unit/config/migration-runner.test.ts` covering: (a) same-version input → `MigrationResult` with `didMigrate: false`; (b) single-hop: register a dummy step, input at v1 → output at v2 with all original fields preserved and `schemaVersion` updated; (c) multi-hop: register steps for v1→v2 and v2→v3, input at v1 → output at v3 in correct order; (d) missing `schemaVersion` field defaults to 1 (FR-020); (e) step throws → error propagates and config is unchanged; (f) `schemaVersion` higher than target → `MigrationResult.isFutureVersion === true`, `didMigrate === false` (FR-018) — write these tests first so they fail before T012 is implemented
- [X] T012 [P] [US3] Write unit tests for `schemaVersion` schema field round-trip in `tests/unit/config/schema-v2.test.ts` covering: (a) valid config with `schemaVersion: 1` passes Zod validation; (b) config with `schemaVersion` field absent defaults to `1` (`.default(1)` on the Zod field); (c) config with `schemaVersion: 0` fails validation (min(1)); (d) config with `schemaVersion: 1.5` fails validation (`.int()`); (e) `JSON.stringify` of a parsed config always includes `"schemaVersion": 1` in the output — write these tests first so they fail before T002's effect is testable end-to-end

### Implementation for User Story 3

- [X] T013 [US3] Create `src/config/migrations/runner.ts` — export `type MigrationStep = (config: Record<string, unknown>) => Record<string, unknown>`; export `interface MigrationResult { config: Record<string, unknown>; migratedFrom: number; migratedTo: number; didMigrate: boolean; isFutureVersion: boolean }`; export `const CURRENT_SCHEMA_VERSION = 1`; declare `const MIGRATIONS: Map<number, MigrationStep> = new Map()` (empty — first real step ships with whatever spec next changes the schema, per spec assumptions); export `function runMigrations(raw: Record<string, unknown>, targetVersion: number): MigrationResult` implementing: read `raw.schemaVersion` defaulting absent to `1` (FR-020); if equal to target return `{ ..., didMigrate: false, isFutureVersion: false }`; if greater than target return `{ ..., isFutureVersion: true, didMigrate: false }`; otherwise iterate `for (let v = fromVersion; v < targetVersion; v++)`, apply registered step if present, set `current.schemaVersion = v + 1` after each step, return `{ config: current, migratedFrom, migratedTo: targetVersion, didMigrate: true, isFutureVersion: false }` (R-005 pattern from research.md)
- [X] T014 [US3] Replace `src/config/migrations/v1.ts` — remove the `migrateConfig()` stub function; replace the file body with a concise module comment explaining the baseline pattern ("v1 is the starting point; no data transformation is required — register steps here when new schema versions are introduced"), a re-export of `MigrationStep` from `./runner.js` for convenience, and a JSDoc block showing the exact pattern for adding a future `v1ToV2` step
- [X] T015 [US3] Update `src/config/reader.ts` — replace `import { migrateConfig } from './migrations/v1.js'` with `import { runMigrations, CURRENT_SCHEMA_VERSION, type MigrationResult } from './migrations/runner.js'`; add optional parameter `onMigrated?: (result: MigrationResult) => void` to `loadConfig()`; after parsing raw JSON, call `runMigrations(rawRecord, CURRENT_SCHEMA_VERSION)`; if `result.isFutureVersion` is true, log a console warning per FR-018 and proceed with the raw config (do not modify); if `result.didMigrate` is true, atomically write the migrated config back to disk via `atomicWriteConfig()` imported from `./writer.js`, then call `onMigrated?.(result)` with the version numbers for the caller to surface to the user (FR-016); if the migration step throws, catch, preserve the original file (no write), rethrow with a FR-017-compliant message identifying the failed migration
- [X] T016 [US3] Update `src/config/writer.ts` — import `CURRENT_SCHEMA_VERSION` from `'./migrations/runner.js'`; update the `writeConfig()` function to use `atomicWriteConfig()` (already added in T003) instead of `fs/promises.writeFile` directly; ensure the serialized `config` object always includes `schemaVersion: CURRENT_SCHEMA_VERSION` in the JSON output (FR-013) — add it to the config object before `JSON.stringify`, overriding whatever value the caller passed
- [X] T017 [US3] Update `src/modes/config-first.tsx` — replace `import { migrateConfig } from '../config/migrations/v1.js'` with `import { runMigrations, CURRENT_SCHEMA_VERSION } from '../config/migrations/runner.js'`; update the `load()` function to call `runMigrations(raw, CURRENT_SCHEMA_VERSION)` and use `result.config` instead of the direct `migrateConfig()` call, keeping migration logic centralized in the runner
- [X] T018 [US3] Update `tests/contract/config-schema.test.ts` — add `schemaVersion` assertions: (a) a config written via `writeConfig()` contains `"schemaVersion": 1` as a top-level integer field; (b) a config loaded via `loadConfig()` from a file without a `schemaVersion` field parses successfully with `config.schemaVersion === 1`; (c) a config loaded from a file with `schemaVersion: 1` matches the current `CURRENT_SCHEMA_VERSION`

**Checkpoint**: Migration runner chains correctly. `schemaVersion` field appears in all written configs. Absent `schemaVersion` in input defaults to 1 without error. Future-version warning fires. US3 independently complete and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final integration verification and documentation.

- [X] T019 [P] Update `docs/` — add a brief section (or update the existing CLI reference) documenting: (a) `--reconfigure` flag usage and behaviour (pre-populated wizard, no-config error, early-exit safety); (b) `schemaVersion` field in `tilde.config.json` and what users should do if they see a migration notification or a future-version warning
- [X] T020 Run full test suite: `npm run build && npm test` — confirm all unit tests (including new `environment.test.ts`, `migration-runner.test.ts`, `schema-v2.test.ts`), integration tests (including new `reconfigure.test.ts`), and contract tests (including updated `config-schema.test.ts`) pass with zero failures
- [X] T021 Manual quickstart validation — exercise all scenarios from `specs/002-cli-polish-resilience/quickstart.md`: (a) `node dist/index.js` → splash renders OS/arch/shell/version; (b) `SHELL=/bin/unknown-shell node dist/index.js` → shell field shows name without version; (c) `node dist/index.js --reconfigure` after running wizard once → all fields pre-populated; (d) remove config then `node dist/index.js --reconfigure` → FR-010 error message appears; (e) `node dist/index.js --ci --config <path>` → zero splash output in stdout

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)         → No dependencies. Start immediately.
Phase 2 (Foundational)  → Requires Phase 1 completion. BLOCKS Phases 3, 4, and 5.
Phase 3 (US1)           → Requires Phase 2 completion.
Phase 4 (US2)           → Requires Phase 3 completion (both modify src/app.tsx; T010 builds on T007).
Phase 5 (US3)           → Requires Phase 2 completion. CAN run in parallel with Phase 3 (disjoint files).
Phase 6 (Polish)        → Requires Phases 3, 4, and 5 all complete.
```

### User Story Dependencies

| Story | Depends On | Reason |
|-------|-----------|--------|
| US1 (P1) | Phase 2 complete | Uses `TildeConfig` type (T002 adds `schemaVersion`) |
| US2 (P2) | Phase 2 + US1 complete | `app.tsx` changes in T010 build on T007; `atomicWriteConfig` from T003 |
| US3 (P3) | Phase 2 complete | Shares no files with US1; can start after T002+T003 |

### Within Each User Story

```
US1:  T004 (tests) can run in parallel with T005 (implementation)
      T006 (splash.tsx) depends on T005 (EnvironmentSnapshot type must exist)
      T007 (app.tsx) depends on T005 + T006

US2:  T008 (tests) can run in parallel with T009 (ReconfigureMode implementation)
      T010 (app.tsx update) depends on T009

US3:  T011 + T012 (tests for runner + schema) run in parallel with each other
      T013 (runner.ts) depends on nothing new — creates the file
      T014 (v1.ts cleanup) can run in parallel with T013
      T015 (reader.ts) depends on T013 (imports runMigrations)
      T016 (writer.ts) depends on T013 (imports CURRENT_SCHEMA_VERSION) + T003 (atomicWriteConfig)
      T017 (config-first.tsx) depends on T013
      T018 (contract tests) depends on T002 (schema field) + T013 (runner)
```

### Critical Path (single developer, sequential)

```
T001 → T002 → T003 → T005 → T004* → T006 → T007
                   → T009 → T008* → T010
                   → T013 → T014* → T015 → T016 → T017 → T011* → T012* → T018
                                                                              → T019 → T020 → T021

* = can run before or in parallel with its preceding sibling (tests)
```

---

## Parallel Execution Examples

### Phase 2 (Foundational)

```
# T002 and T003 have disjoint files — run in parallel:
Task: "Add schemaVersion to src/config/schema.ts"           (T002)
Task: "Add atomicWriteConfig helper to src/config/writer.ts" (T003)
```

### Phase 3 — User Story 1

```
# Write tests while scaffolding implementation:
Task: "Write unit tests in tests/unit/utils/environment.test.ts" (T004) [tests]
Task: "Create src/utils/environment.ts"                           (T005) [impl]

# Then sequentially:
T005 → T006 (splash.tsx) → T007 (app.tsx)
```

### Phase 5 — User Story 3

```
# Tests and implementation can interleave — runner.ts and v1.ts are independent:
Task: "Write tests in tests/unit/config/migration-runner.test.ts" (T011) [tests]
Task: "Write tests in tests/unit/config/schema-v2.test.ts"        (T012) [tests]
Task: "Create src/config/migrations/runner.ts"                    (T013) [impl]
Task: "Replace src/config/migrations/v1.ts stub"                  (T014) [impl, parallel with T013]

# Then sequentially (all depend on T013):
T013 → T015 (reader.ts)
T013 → T016 (writer.ts, also needs T003)
T013 → T017 (config-first.tsx)
T013 + T002 → T018 (contract tests)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only — Phase 3)

1. Complete Phase 1: Verify green baseline
2. Complete Phase 2: Foundational (schema + atomic write)
3. Complete Phase 3: US1 — Dynamic Splash Screen
4. **STOP and VALIDATE**: Run `node dist/index.js` and confirm splash shows live environment data
5. Ship / demo if ready — the splash is fully independent of US2 and US3

### Incremental Delivery

```
Phase 1+2 done → Foundation ready (no user-visible change)
+ Phase 3 done → Dynamic splash on every interactive run          (MVP)
+ Phase 4 done → `--reconfigure` closes the config lifecycle
+ Phase 5 done → Schema migration infrastructure for future specs
+ Phase 6 done → Fully validated, documented, production-ready
```

### Parallel Team Strategy

With two developers, after Phase 2:

```
Developer A: Phase 3 (US1 — environment.ts, splash.tsx, app.tsx)
Developer B: Phase 5 (US3 — runner.ts, reader.ts, writer.ts — all disjoint from US1 files)

After both complete:
Either developer: Phase 4 (US2 — reconfigure.tsx + app.tsx integration)
```

---

## Task Summary

| Phase | Tasks | Files Touched |
|-------|-------|---------------|
| 1 — Setup | T001 | — (validation only) |
| 2 — Foundational | T002, T003 | `src/config/schema.ts`, `src/config/writer.ts` |
| 3 — US1 Splash | T004–T007 | `tests/unit/utils/environment.test.ts` *(new)*, `src/utils/environment.ts` *(new)*, `src/ui/splash.tsx`, `src/app.tsx` |
| 4 — US2 Reconfigure | T008–T010 | `tests/integration/reconfigure.test.ts` *(new)*, `src/modes/reconfigure.tsx` *(new)*, `src/app.tsx` |
| 5 — US3 Migration | T011–T018 | `tests/unit/config/migration-runner.test.ts` *(new)*, `tests/unit/config/schema-v2.test.ts` *(new)*, `src/config/migrations/runner.ts` *(new)*, `src/config/migrations/v1.ts`, `src/config/reader.ts`, `src/config/writer.ts`, `src/modes/config-first.tsx`, `tests/contract/config-schema.test.ts` |
| 6 — Polish | T019–T021 | `docs/` *(update)*, — (validation) |

**Total tasks**: 21
**US1 tasks**: 4 (T004–T007)
**US2 tasks**: 3 (T008–T010)
**US3 tasks**: 8 (T011–T018)
**Parallelisable [P] tasks**: 9 (T003, T004, T008, T011, T012, T016, T017, T019)

### New Files Created

| File | User Story | Purpose |
|------|-----------|---------|
| `src/utils/environment.ts` | US1 | EnvironmentSnapshot type + all detection functions |
| `src/config/migrations/runner.ts` | US3 | MigrationStep registry + runMigrations() |
| `src/modes/reconfigure.tsx` | US2 | ReconfigureMode Ink component |
| `tests/unit/utils/environment.test.ts` | US1 | Unit tests for environment detection |
| `tests/unit/config/migration-runner.test.ts` | US3 | Unit tests for runMigrations() |
| `tests/unit/config/schema-v2.test.ts` | US3 | Unit tests for schemaVersion Zod field |
| `tests/integration/reconfigure.test.ts` | US2 | Integration tests for full reconfigure flow |

### Modified Files

| File | Phase | Change |
|------|-------|--------|
| `src/config/schema.ts` | Foundational | Add `schemaVersion` field |
| `src/config/writer.ts` | Foundational + US3 | Add `atomicWriteConfig()` (T003); use it in `writeConfig()` + add `schemaVersion` stamp (T016) |
| `src/ui/splash.tsx` | US1 | Accept `EnvironmentSnapshot` prop; render 4 data rows |
| `src/app.tsx` | US1 + US2 | Environment capture + splash update (T007); ReconfigureMode branch (T010) |
| `src/config/migrations/v1.ts` | US3 | Replace `migrateConfig()` stub with clean baseline |
| `src/config/reader.ts` | US3 | Use `runMigrations()`; handle migration write-back and callbacks |
| `src/modes/config-first.tsx` | US3 | Use `runMigrations()` instead of direct v1 import |
| `tests/contract/config-schema.test.ts` | US3 | Add `schemaVersion` assertions |

---

## Notes

- **`app.tsx` is modified in two phases** (T007 for US1, T010 for US2). T010 must follow T007;
  the ReconfigureMode branch requires the `environment` state variable introduced in T007.
- **`writer.ts` is modified in two phases** (T003 for foundational, T016 for US3). These are
  non-overlapping edits: T003 adds a new export function; T016 updates the existing `writeConfig()`
  body to call it and stamp `schemaVersion`.
- **No new runtime dependencies** are introduced. `execa` (already in `package.json`) covers
  subprocess calls for environment detection. `node:fs/promises` covers atomic write.
- **`CURRENT_SCHEMA_VERSION = 1` in runner.ts** — despite the migration infrastructure being new,
  no actual data transformation step ships with this spec. The first real step registers when the
  next spec changes the schema. This is intentional per spec assumptions.
- **Reconfigure does not write a checkpoint** — per contracts/cli-commands.md and FR-011,
  exiting a reconfigure session early preserves the original config; no `.tilde/state.json`
  resume point is created.
- Commit after each task or logical group. Stop at any phase checkpoint to validate
  independently before continuing.
