# Data Model: CLI Polish & Resilience

**Branch**: `002-cli-polish-resilience` | **Date**: 2026-07-14
**Extends**: `specs/001-mvp-macos-bootstrap/data-model.md`

This document covers only the entities that are new or modified in this spec. All entities
from spec 001 (`TildeConfig`, `DeveloperContext`, `EnvironmentCaptureReport`,
`CheckpointState`, `Plugin`) remain unchanged unless explicitly noted below.

---

## New Entity 1: EnvironmentSnapshot

A transient, read-only snapshot of the running machine's environment. Populated once at
interactive startup by `captureEnvironment()`. Passed to the Splash component. Never persisted
to disk.

```ts
// src/utils/environment.ts

interface EnvironmentSnapshot {
  /** Human-friendly OS name + version string, e.g. "macOS Sequoia 15.3".
   *  Falls back to raw detected value (e.g. "macOS 15.3") if no friendly name mapping
   *  exists. Never null or empty — always at least "macOS {version}". */
  os: string;

  /** CPU architecture, e.g. "arm64" or "x64". Sourced from node:os.arch(). */
  arch: string;

  /** Running shell name, e.g. "zsh". Derived from basename of $SHELL env var.
   *  Falls back to "unknown" if $SHELL is unset. */
  shellName: string;

  /** Running shell version string, e.g. "5.9". Undefined if detection failed.
   *  When undefined, Splash renders shellName alone (FR-004). */
  shellVersion?: string;

  /** Tilde version string, e.g. "v1.0.1". Sourced from VERSION constant in index.tsx. */
  tildeVersion: string;
}
```

**Factory function**:
```ts
async function captureEnvironment(tildeVersion: string): Promise<EnvironmentSnapshot>
```

**Lifecycle**: Created once at the start of every interactive startup (modes: wizard,
config-first, reconfigure). Passed as a prop to `<Splash>`. Discarded when the Splash
unmounts. Never written to disk.

**Fallback contract** (per FR-003, FR-004):
- If `sw_vers -productVersion` fails → `os` = `"macOS"` (name-only fallback)
- If `sw_vers` succeeds but major version has no name mapping → `os` = `"macOS {version}"`
- If `$SHELL` is unset → `shellName` = `"unknown"`, `shellVersion` = `undefined`
- If `$SHELL --version` fails → `shellVersion` = `undefined` (shell name still rendered)
- If `node:os.arch()` fails (should never happen) → `arch` = `"unknown"`

**Timing constraint**: `captureEnvironment()` MUST complete within 500 ms total wall time
(FR-006). All subprocess calls use a 3 000 ms per-call timeout; in practice all four
detection steps can run in parallel and the total is well within budget.

---

## New Entity 2: MigrationResult

The return value of `runMigrations()`. Carries both the transformed config data and metadata
about what migration did (or did not) occur.

```ts
// src/config/migrations/runner.ts

interface MigrationResult {
  /** The config object after all applicable migration steps have run. */
  config: Record<string, unknown>;

  /** The schemaVersion found in the original file (defaults to 1 if field absent). */
  migratedFrom: number;

  /** The schemaVersion after all migration steps have run. Equals target version
   *  on success. Equals migratedFrom if migration was skipped (already current)
   *  or if the file has a future version (FR-018). */
  migratedTo: number;

  /** True if one or more migration steps were applied. Used by the caller to decide
   *  whether to write back the migrated config and notify the user. */
  didMigrate: boolean;

  /** True if the file's schemaVersion is greater than the supported target version
   *  (FR-018). Caller shows a warning and skips migration. */
  isFutureVersion: boolean;
}
```

**Lifecycle**: Produced by `runMigrations()` in `src/config/migrations/runner.ts`. Consumed
by `loadConfig()` in `src/config/reader.ts`. Discarded after config validation. Never
persisted.

---

## New Entity 3: MigrationStep (Function Type)

Each migration step is a pure function registered in the MIGRATIONS map. Steps handle exactly
one version increment. They are pure — no I/O, no side effects.

```ts
// src/config/migrations/runner.ts

/**
 * A pure function that accepts a config object at schemaVersion N and returns
 * a config object at schemaVersion N+1. Must not mutate the input object.
 * The runner sets config.schemaVersion = N+1 after calling the step.
 */
type MigrationStep = (config: Record<string, unknown>) => Record<string, unknown>;

/**
 * Registry of all migration steps, keyed by fromVersion.
 * Key 1 means "step that transforms v1 → v2".
 */
const MIGRATIONS: Map<number, MigrationStep> = new Map([
  // [1, v1ToV2],  // Add future steps here
]);

/** The schema version that the running tilde binary supports. */
export const CURRENT_SCHEMA_VERSION = 1;
```

**Identity rule**: Each `fromVersion` key appears at most once in the MIGRATIONS map.
**Lifecycle**: Registered at module load time. Never mutated at runtime.

---

## Modified Entity: TildeConfig (additive change)

The existing `TildeConfig` schema gains one new field. All existing fields are unchanged.

**Addition to `src/config/schema.ts`**:
```ts
const TildeConfigSchema = z.object({
  // ... all existing fields unchanged ...

  // NEW in spec 002
  schemaVersion: z.number().int().min(1).default(1),
});
```

**Serialization**: `schemaVersion` is written by `writeConfig()` / `atomicWriteConfig()` as
a top-level integer field in `tilde.config.json`. It is the first migration-related field
users will see in their config file.

**Backward compatibility**: `z.number().int().min(1).default(1)` — if the field is absent
in a config file (all pre-002 configs), Zod's `.default(1)` supplies the value without
validation failure, satisfying FR-020.

**Written shape** (example):
```json
{
  "$schema": "https://tilde.sh/config-schema/v1.json",
  "version": "1",
  "schemaVersion": 1,
  "os": "macos",
  ...
}
```

---

## Modified Splash Component Contract

The `Splash` component's props interface gains `environment`:

```ts
// src/ui/splash.tsx

interface SplashProps {
  environment: EnvironmentSnapshot;   // NEW: replaces bare `version: string`
  onDone: () => void;
}
```

**Display rows** (FR-002):

| Row | Label | Source field | Example |
|-----|-------|--------------|---------|
| 1 | OS | `environment.os` | `macOS Sequoia 15.3` |
| 2 | Arch | `environment.arch` | `arm64` |
| 3 | Shell | `environment.shellName` + optional `environment.shellVersion` | `zsh 5.9` |
| 4 | tilde | `environment.tildeVersion` | `v1.0.1` |

**Fallback rendering** (per FR-003 / FR-004):
- Row 3 renders `{shellName} {shellVersion}` when `shellVersion` is defined;
  renders `{shellName}` alone when `shellVersion` is `undefined`.
- All other rows are always populated (never undefined).

---

## State Transitions (additions)

### Interactive Startup Lifecycle (updated)

```
idle
  → [user runs tilde interactively]
  → environment-capture (parallel: sw_vers, $SHELL --version, node:os.arch())
  → splash-rendering (EnvironmentSnapshot displayed)
  → [mode branch]
    → wizard / config-first / reconfigure
```

### Reconfigure Lifecycle (new)

```
idle
  → [user runs tilde --reconfigure]
  → environment-capture → splash-rendering
  → config-loading (loadConfig from resolved path)
    → [no file] → error-display → exit(1)
    → [parse fails] → error-display → exit(1)
    → [schema invalid, partial] → partial-field-error-display → wizard (valid fields as defaults)
    → [valid] → migration-check
      → [schemaVersion < current] → run-migrations → write-migrated-config → notify-user
      → [schemaVersion = current] → proceed
      → [schemaVersion > current] → warn-user → proceed without modification
  → wizard (initialConfig = loaded config)
    → [user exits early] → preserve original → exit(0)
    → [user completes] → atomic-write (tilde.config.json.tmp → tilde.config.json)
  → done
```

### Migration Lifecycle (new)

```
loadConfig called
  → parse JSON
  → runMigrations(raw, CURRENT_SCHEMA_VERSION)
    → [fromVersion = targetVersion] → MigrationResult{didMigrate: false}
    → [fromVersion > targetVersion] → MigrationResult{isFutureVersion: true} → warn
    → [fromVersion < targetVersion] → apply steps in order → MigrationResult{didMigrate: true}
      → atomicWriteConfig (migrated config written back)
      → notify user (old version → new version)
  → Zod validation on migrated config
  → [valid] → return TildeConfig
  → [invalid] → throw Config validation failed
```

---

## Data Volume / Scale Assumptions (additions)

- `EnvironmentSnapshot`: ~5 fields, < 200 bytes in memory. Allocation is negligible.
- `MigrationResult`: ~5 fields. One instance per config load. No accumulation.
- MIGRATIONS map: expected size ≤ 20 entries across the product lifetime (one entry per
  schema version increment). No size concern.
- Atomic write: creates one `.tmp` file transiently; always cleaned up by `rename()` or
  explicit `unlink()`. No accumulation.
