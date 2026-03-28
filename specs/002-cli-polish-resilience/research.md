# Research: CLI Polish & Resilience

**Branch**: `002-cli-polish-resilience` | **Date**: 2026-07-14
**Purpose**: Resolve all NEEDS CLARIFICATION items from Technical Context and confirm
implementation patterns before Phase 1 design.

---

## R-001: macOS Version Detection

**Question**: What is the most reliable way to detect the macOS product name and version at
runtime in a Node.js process?

**Decision**: Use `sw_vers` with individual flags — `sw_vers -productName` and
`sw_vers -productVersion` — rather than parsing the combined output of `sw_vers` with no args.

**Rationale**:
- `sw_vers` ships on every macOS version since 10.3. It is the canonical Apple-provided tool
  for querying OS build information and will not be removed.
- Splitting the calls avoids fragile whitespace/column parsing of the combined output.
- `sw_vers -productName` returns `"macOS"` on all modern versions (10.14+); older versions
  return `"Mac OS X"` — both are acceptable raw values.
- `sw_vers -productVersion` returns a clean semver-style string (e.g., `"15.3"` or
  `"15.3.1"`) with no trailing whitespace when trimmed.
- `node:os`'s `release()` returns a Darwin kernel version, not the macOS version — not usable
  for user-facing display.

**Alternatives considered**:
- `node:os.release()` → returns Darwin kernel version (`24.3.0`), not macOS version. Rejected.
- Reading `/System/Library/CoreServices/SystemVersion.plist` → brittle; file path could move.
  Rejected.
- `osascript -e 'system info'` → much slower; requires AppleScript. Rejected.

**Implementation**:
```ts
// src/utils/environment.ts
import { execa } from 'execa';

async function detectOsVersion(): Promise<string> {
  try {
    const { stdout } = await execa('sw_vers', ['-productVersion'], { timeout: 3000 });
    return stdout.trim();
  } catch {
    return 'unknown';
  }
}
```

---

## R-002: macOS Friendly Name Mapping

**Question**: What range of macOS versions needs a friendly name mapping, and how should
unmapped versions be handled?

**Decision**: Ship a static lookup table keyed by major version number (14 → "Sonoma",
15 → "Sequoia", etc.). If the major version is not in the table, fall back to the raw string
`"macOS {version}"` (e.g., `"macOS 16.0"`). Never omit the field.

**Rationale**:
- Marketing names are stable per major release and do not change post-release. A static table
  is correct and requires no external lookup.
- FR-003 mandates raw-value fallback — the implementation must handle future unmapped versions
  gracefully without code changes.
- Mapping by major version avoids separate entries for minor releases (15.0, 15.1, 15.3 all
  map to "Sequoia").

**Mapping table** (minimum required by spec assumptions):

| Major | Friendly Name |
|-------|--------------|
| 13    | Ventura      |
| 14    | Sonoma       |
| 15    | Sequoia      |

**Alternatives considered**:
- Fetching from a remote API at startup → violates <500 ms constraint and adds a network
  dependency. Rejected.
- Mapping by full version string → requires individual entries for every minor release.
  Rejected.

---

## R-003: Shell Name and Version Detection

**Question**: What is the most reliable way to detect the running shell's name and version
number across zsh, bash, and fish?

**Decision**: Read `$SHELL` for the name; invoke `$SHELL --version` and parse the first line
for the version number. Failures at either step fall back gracefully.

**Rationale**:
- `$SHELL` is set by the OS login infrastructure and reliably reflects the user's configured
  shell even when tilde is launched from a different shell context.
- All three supported shells (`zsh`, `bash`, `fish`) respond to `--version` by printing a
  first line containing their version string. The version number can be extracted with a
  simple regex (`/(\d+\.\d+[\.\d]*)/`).
- FR-004 mandates that shell version detection failure shows shell name only (not an error),
  so the fallback path is a first-class requirement, not an edge case.

**Per-shell detection patterns**:

| Shell | `--version` first-line format | Regex |
|-------|-------------------------------|-------|
| zsh   | `zsh 5.9 (x86_64-apple-darwin23.0)` | `/(\d+\.\d+)/` |
| bash  | `GNU bash, version 3.2.57(1)-release (arm-apple-darwin23)` | `/version (\d+\.\d+\.\d+)/` |
| fish  | `fish, version 3.7.1` | `/version (\d+\.\d+\.\d+)/` |
| other | (any) | first match of `/(\d+\.\d+[\.\d]*)/` |

**Implementation**:
```ts
async function detectShellName(): Promise<string> {
  const shellPath = process.env.SHELL ?? '';
  const parts = shellPath.split('/');
  return parts[parts.length - 1] || 'unknown';
}

async function detectShellVersion(shellName: string): Promise<string | undefined> {
  const shellPath = process.env.SHELL;
  if (!shellPath) return undefined;
  try {
    const { stdout } = await execa(shellPath, ['--version'], { timeout: 3000 });
    const firstLine = stdout.split('\n')[0] ?? '';
    const match = firstLine.match(/(\d+\.\d+[\.\d]*)/);
    return match?.[1];
  } catch {
    return undefined;
  }
}
```

**Alternatives considered**:
- Reading `$ZSH_VERSION` / `$BASH_VERSION` env vars → only set when running inside that
  shell; tilde is launched as a Node.js child, so these vars are typically absent. Rejected.
- Running `zsh --version` unconditionally → wrong shell if the user runs bash/fish. Rejected.

---

## R-004: Atomic Config Write Pattern (Node.js)

**Question**: What is the correct pattern for atomically overwriting a file in Node.js to
prevent partial writes from corrupting `tilde.config.json`?

**Decision**: Write the new content to `<target>.tmp`, then call `fs.rename()` to move it
into place. Wrap in try/finally to ensure cleanup if rename fails.

**Rationale**:
- `fs.rename()` is atomic on POSIX filesystems when source and destination are on the same
  volume (which is always true here — both are in the user's dotfiles repo on the same disk).
- This pattern is already used by the spec 001 data model's `CheckpointState` (documented as
  "write to `${path}.tmp` then `fs.rename()`") and by FR-009 and FR-015, which explicitly
  mandate atomic writes.
- A direct `writeFile()` to the target path is non-atomic: a crash mid-write leaves a
  truncated file. This is the scenario covered by the spec's edge case: "What if
  `tilde.config.json` is truncated or malformed from a previously interrupted write?"

**Implementation pattern**:
```ts
import { writeFile, rename, unlink } from 'node:fs/promises';

export async function atomicWriteConfig(targetPath: string, content: string): Promise<void> {
  const tmpPath = `${targetPath}.tmp`;
  await writeFile(tmpPath, content, 'utf-8');
  try {
    await rename(tmpPath, targetPath);
  } catch (err) {
    // Best-effort cleanup; rethrow the original error
    await unlink(tmpPath).catch(() => {});
    throw err;
  }
}
```

**Alternatives considered**:
- `writeFile()` directly to target → non-atomic, leaves truncated file on crash. Rejected.
- Using a third-party `write-file-atomic` package → adds a dependency; pattern is simple
  enough to inline. Rejected.

---

## R-005: Migration Runner Chain Pattern

**Question**: How should the migration runner chain individual per-version step functions to
support multi-hop upgrades (v1 → v2 → v3)?

**Decision**: Register each migration step as a pure function in a sorted map keyed by
`fromVersion`. The runner iterates from `currentVersion` up to `targetVersion`, applying each
step in sequence. Each step accepts a `Record<string, unknown>` and returns a
`Record<string, unknown>`.

**Rationale**:
- FR-019 mandates that each migration step is a pure, independently testable function.
  A sorted map of `fromVersion → step function` satisfies this cleanly: each step handles
  exactly one version increment and is easy to test in isolation.
- The runner iterates deterministically — no skipped steps, no ambiguity.
- FR-015 mandates ascending-order application: the sorted map guarantees this without manual
  sorting at call sites.
- FR-020 mandates that configs without a `schemaVersion` field are treated as version 1.
  The runner handles this by defaulting to 1 if the field is absent.

**Implementation pattern**:
```ts
// src/config/migrations/runner.ts
type MigrationStep = (config: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Map<number, MigrationStep> = new Map([
  // [1, v1ToV2],  // Register future steps here
]);

export interface MigrationResult {
  config: Record<string, unknown>;
  migratedFrom: number;
  migratedTo: number;
  didMigrate: boolean;
}

export function runMigrations(
  raw: Record<string, unknown>,
  targetVersion: number
): MigrationResult {
  const fromVersion =
    typeof raw['schemaVersion'] === 'number' ? raw['schemaVersion'] : 1;

  if (fromVersion === targetVersion) {
    return { config: raw, migratedFrom: fromVersion, migratedTo: fromVersion, didMigrate: false };
  }

  if (fromVersion > targetVersion) {
    // Future-version: return as-is; caller handles the warning (FR-018)
    return { config: raw, migratedFrom: fromVersion, migratedTo: fromVersion, didMigrate: false };
  }

  let current = { ...raw };
  for (let v = fromVersion; v < targetVersion; v++) {
    const step = MIGRATIONS.get(v);
    if (!step) continue; // No migration needed for this hop
    current = step(current);
    current['schemaVersion'] = v + 1;
  }
  current['schemaVersion'] = targetVersion;

  return { config: current, migratedFrom: fromVersion, migratedTo: targetVersion, didMigrate: true };
}
```

**Alternatives considered**:
- A single monolithic `migrateConfig(raw, from, to)` function — harder to test individual
  steps; violates FR-019. Rejected.
- Storing steps as an array indexed by `fromVersion` — Map is more explicit about the
  `fromVersion` key and handles sparse registrations cleanly. Array preferred, but Map
  communicates intent more clearly. Decision: Map.

---

## R-006: `schemaVersion` vs existing `version` field

**Question**: The existing schema has a `version: "1"` string field used for the JSON Schema
`$schema` versioning pattern. How does `schemaVersion` (integer, for migration) relate to it?

**Decision**: Add a separate `schemaVersion: number` (integer, min 1, default 1) field
alongside the existing `version` string field. They serve distinct purposes and must not be
conflated.

**Rationale**:
- `version: "1"` is the config format version as a string literal; it is used in the
  `$schema` URL and matches the spec 001 contract exactly. Changing it would be a breaking
  change.
- `schemaVersion: 1` (integer) is the machine-readable migration version. Using an integer
  makes numeric comparison (`fromVersion < targetVersion`) natural and unambiguous.
- FR-013 mandates `schemaVersion` as a top-level integer field on every written config.
- FR-020 mandates that configs missing `schemaVersion` entirely are treated as version 1 —
  this is the entire pre-002 config population.
- The migration runner reads `schemaVersion`, not `version`. The reader stub already checks
  `schemaVersion` (added in spec 001's reader.ts).

**Current schema state**: `src/config/schema.ts` defines `version: z.literal('1')`.
The reader already reads `raw['schemaVersion']` but the Zod schema does not yet declare it.
This spec adds `schemaVersion: z.number().int().min(1).default(1)` to `TildeConfigSchema`.

---

## R-007: `--reconfigure` Wiring — Where Does the Mode Branch?

**Question**: The `--reconfigure` flag is already parsed in `src/index.tsx` and passed as a
prop to `App`. What is the simplest correct wiring to complete the feature?

**Decision**: Add a `ReconfigureMode` Ink component (`src/modes/reconfigure.tsx`) that
mirrors the pattern of `config-first.tsx`. In `app.tsx`, branch to `ReconfigureMode` when
`reconfigure=true && mode !== 'non-interactive'`.

**Rationale**:
- The spec assumption states: "The wizard's `initialValues` API already accepts an optional
  pre-population object per step (per spec 001 tasks T091/T092). This spec wires the
  `--reconfigure` flag to that existing API."
- `Wizard` already accepts `initialConfig?: Partial<TildeConfig>` and `initialStep?: number`.
- `ReconfigureMode` needs to: (a) load the config, (b) handle error states (no file, invalid
  schema), (c) pass the loaded config as `initialConfig` to `Wizard`, (d) on wizard completion
  call `atomicWriteConfig` with the new config.
- Keeping this in a dedicated mode component keeps `app.tsx` thin (same pattern as
  `config-first.tsx`).
- `src/index.tsx` already detects `--reconfigure` and passes `reconfigure: true` to `App`.
  No change to `index.tsx` needed beyond the mode branching in `app.tsx`.

**Error states to handle in ReconfigureMode**:

| Condition | Behaviour |
|-----------|-----------|
| No `tilde.config.json` found | Show error + suggestion to run `tilde` without flags (FR-010) |
| Config fails schema validation | Show field-level errors; load valid fields as defaults; open wizard (FR-012) |
| Config file read-only / permissions error | Show clear error with file path and suggested fix |
| User exits wizard early | Preserve original file unmodified (FR-011); checkpoint NOT written (reconfigure is not resumable) |

---

## Summary of All Decisions

| ID | Decision |
|----|----------|
| R-001 | `sw_vers -productVersion` for macOS version string |
| R-002 | Static major-version lookup table; raw fallback for unmapped versions |
| R-003 | `$SHELL --version` with per-shell regex; shell name from `$SHELL` path basename |
| R-004 | Write to `<target>.tmp`, then `fs.rename()` for atomic overwrite |
| R-005 | Sorted Map of `fromVersion → pure step fn`; runner iterates ascending |
| R-006 | Add `schemaVersion: number` (integer) alongside existing `version: "1"` string |
| R-007 | New `ReconfigureMode` component in `src/modes/reconfigure.tsx`; `app.tsx` branches to it |
