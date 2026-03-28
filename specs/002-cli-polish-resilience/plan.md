# Implementation Plan: CLI Polish & Resilience

**Branch**: `002-cli-polish-resilience` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)
**Input**: Three tightly related enhancements closing deferred items T091, T092, and the schema
migration promise from spec 001: Dynamic Splash Screen, `--reconfigure` flag, and Config
Schema Versioning & Migration.

## Summary

Extend the existing Ink CLI (`src/ui/splash.tsx`, `src/app.tsx`, `src/modes/`, `src/config/`)
with three targeted additions: (1) runtime environment detection piped into the Splash
component so every interactive startup shows live OS/arch/shell/version data; (2) a
`--reconfigure` mode that loads the existing `tilde.config.json` and feeds all stored values
as `initialValues` into the wizard, overwriting the file atomically on completion; and (3) a
proper `schemaVersion` field in the config schema backed by a migration runner that chains
pure per-version step functions, writes the migrated file back atomically, and notifies the
user. All three sub-features share the atomic write pattern and graceful-fallback philosophy
already established in spec 001.

## Technical Context

**Language/Version**: Node.js 20 LTS, TypeScript 5.4+
**Primary Dependencies**: Ink 6.8, React 18, Zod 4.3 (config schema + validation), execa 9.6
  (shell version detection), ink-testing-library 4.0
**Storage**: Local filesystem — `tilde.config.json` (atomic overwrite via temp-rename);
  `~/.tilde/state.json` (unchanged)
**Testing**: Vitest 2 (unit + integration), ink-testing-library (Ink component tests)
**Target Platform**: macOS Apple Silicon (arm64) and Intel (x64); zsh primary, bash/fish
  detection logic included with graceful fallback per FR-004
**Project Type**: CLI tool
**Performance Goals**: Environment detection completes in <500 ms total (FR-006, SC-002);
  splash renders with no perceptible delay on any supported machine
**Constraints**: All detection failures must fall back gracefully (never crash); migration steps
  are pure functions with no filesystem side-effects; config writes are atomic (temp-rename);
  no new external runtime dependencies introduced
**Scale/Scope**: Single-user local CLI; three surgically scoped additions to existing source
  files + new `src/utils/environment.ts` and `src/config/migrations/runner.ts`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Configuration-First | ✅ PASS | `--reconfigure` loads existing config via the same `loadConfig` reader as config-first mode; all stored values offered as defaults; user retains full control |
| II. Bootstrap-Ready | ✅ PASS | No changes to bootstrap entry path; splash adds information, not friction |
| III. Context-Aware Environments | ✅ PASS | Out of scope for this spec; not touched |
| IV. Interactive & Ink-First UX | ✅ PASS | Constitution v2.2.0 explicitly mandates the dynamic splash (FR-001 to FR-006); Splash remains an Ink component; no silent mutations. **Browser Selection wizard step (constitution step 11)** is out of scope for spec 002 and is explicitly deferred to a future spec (spec 003 or equivalent); this spec does not regress any existing wizard step. |
| V. Idempotent Operations | ✅ PASS | Atomic write (temp-rename) ensures partial-write safety; migration is non-destructive (additive only); re-running `--reconfigure` with no changes produces identical output |
| VI. Secrets-Free Repository | ✅ PASS | Config writer already guards against raw secrets; reconfigure path reuses same writer; no new credential surface area |
| VII. macOS First, Cross-Platform by Design | ✅ PASS | OS version detection and friendly-name mapping isolated in `src/utils/environment.ts` behind platform-abstracted interface; Windows detection path stubbed for future addition |
| VIII. Extensibility & Plugin Architecture | ✅ PASS | No plugin API changes; migration runner is an internal concern only |

No gate violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/002-cli-polish-resilience/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── config-schema.md      # Updated: schemaVersion field added
│   └── cli-commands.md       # Updated: --reconfigure behaviour corrected
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code — New Files

```text
src/
├── utils/
│   └── environment.ts           # NEW: EnvironmentSnapshot type + detection functions
│                                #   detectOsName(), detectOsVersion(), detectArch(),
│                                #   detectShellName(), detectShellVersion(),
│                                #   captureEnvironment() → Promise<EnvironmentSnapshot>
├── config/
│   └── migrations/
│       └── runner.ts            # NEW: MigrationRunner — chains v1→v2→… steps,
│                                #   handles multi-hop, returns MigrationResult
└── modes/
    └── reconfigure.tsx          # NEW: ReconfigureMode Ink component — loads config,
                                 #   feeds initialConfig to Wizard, handles error states
```

### Source Code — Modified Files

```text
src/
├── ui/
│   └── splash.tsx               # MODIFY: accept EnvironmentSnapshot prop; render
│                                #   4 labeled rows (OS, Arch, Shell, tilde version)
├── app.tsx                      # MODIFY: detect environment at startup (captureEnvironment);
│                                #   pass EnvironmentSnapshot to Splash;
│                                #   branch to ReconfigureMode when reconfigure=true
├── config/
│   ├── schema.ts                # MODIFY: add schemaVersion: z.number().int().min(1).default(1)
│   ├── reader.ts                # MODIFY: call migration runner; accept optional onMigrated
│                                #   callback; handle future-version warning (FR-018)
│   ├── writer.ts                # MODIFY: always write schemaVersion=CURRENT_SCHEMA_VERSION;
│                                #   add atomicWriteConfig() helper (temp-rename pattern)
│   └── migrations/
│       └── v1.ts                # MODIFY: clean up stub; export typed MigrationStep shape
│                                #   for v1→v1 baseline (no data transform needed)

tests/
├── unit/
│   ├── utils/
│   │   └── environment.test.ts  # NEW: detectOsName, detectOsVersion, shell parsing,
│   │                            #   fallback paths, <500ms timing
│   └── config/
│       ├── migration-runner.test.ts  # NEW: single-hop, multi-hop, failure isolation,
│       │                             #   future-version warning
│       └── schema-v2.test.ts         # NEW: schemaVersion field round-trip, default=1,
│                                     #   missing-field backward compat
├── integration/
│   └── reconfigure.test.ts      # NEW: full reconfigure flow on tmp config file
└── contract/
    └── config-schema.test.ts    # MODIFY: add schemaVersion assertions
```

**Structure Decision**: Single-project CLI. All additions are surgically scoped to existing
module boundaries. No new top-level directories. `src/utils/environment.ts` is the only fully
new utility module; `src/config/migrations/runner.ts` extends the already-present migrations
directory stub. `src/modes/reconfigure.tsx` follows the exact pattern of the existing
`wizard.tsx` and `config-first.tsx` siblings.

## Complexity Tracking

> No constitution violations to justify.
