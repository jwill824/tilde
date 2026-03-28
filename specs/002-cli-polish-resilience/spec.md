# Feature Specification: CLI Polish & Resilience

**Feature Branch**: `002-cli-polish-resilience`
**Created**: 2026-07-14
**Status**: Draft
**Closes**: Issues [#6](https://github.com/jwill824/tilde/issues/6), [#10](https://github.com/jwill824/tilde/issues/10), [#12](https://github.com/jwill824/tilde/issues/12)
**Extends**: `specs/001-mvp-macos-bootstrap` — completes deferred items T091, T092, and schema migration promise

## Overview

Three tightly related enhancements that together close the deferred promises from spec 001 and
round out the core user experience before any new surface area is added:

- **Dynamic Splash Screen** (issue #12) — the startup screen displays the user's real
  environment instead of static ASCII art, giving immediate orientation feedback.
- **`--reconfigure` Flag** (issue #6) — closes the config lifecycle by letting users
  update any previously-made choice without losing the rest of their config.
- **Config Schema Versioning & Migration** (issue #10) — ensures `tilde.config.json` files
  survive upgrades safely and never silently break.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Environment-Aware Splash Screen (Priority: P1)

A developer opens their terminal and runs `tilde`. Before any prompts appear, the splash screen
greets them with a live snapshot of their machine: the macOS version they're running, their CPU
architecture, the shell they launched from, and the tilde version they have installed. They
immediately know they're in the right place and that tilde sees their environment correctly —
without having to run `sw_vers`, `uname`, or any diagnostic command themselves.

**Why this priority**: This is the first thing every user sees on every run. A dynamic,
accurate splash builds trust and signals that tilde is environment-aware. It also surfaces
version information that users frequently need for support conversations, without extra commands.

**Independent Test**: Run `tilde` on any macOS machine. The splash screen renders with
accurate OS name/version, CPU architecture, shell name/version, and tilde version. All four
values are present. No static placeholder text appears. Can be validated entirely visually
without proceeding into the wizard.

**Acceptance Scenarios**:

1. **Given** a Mac running macOS Sequoia 15.3 on Apple Silicon, **When** the user runs
   `tilde` interactively, **Then** the splash screen displays `macOS Sequoia 15.3`,
   `arm64`, the current shell name and version (e.g., `zsh 5.9`), and the installed tilde
   version (e.g., `v1.0.1`).
2. **Given** a Mac running an OS version that has no registered friendly name mapping,
   **When** the splash screen renders, **Then** the raw OS version string is displayed
   (e.g., `macOS 16.0`) rather than omitting the field or showing an error.
3. **Given** the user runs `tilde --ci` (non-interactive mode), **When** startup occurs,
   **Then** the splash screen is skipped entirely and stdout contains only machine-parseable
   output.
4. **Given** the shell version detection fails for any reason, **When** the splash renders,
   **Then** the shell field shows the shell name alone (e.g., `zsh`) without the version
   suffix, rather than crashing or displaying an error.

---

### User Story 2 — Reconfiguring an Existing Setup (Priority: P2)

A developer set up tilde six months ago. They've since switched from `nvm` to `vfox`, added a
new `client` context, and want to update their preferred editor. Rather than editing
`tilde.config.json` by hand (and risking a malformed file) or re-running the full wizard from
scratch (and re-answering 14 questions), they run `tilde --reconfigure`. The wizard opens with
every field pre-filled with their current stored choices. They navigate directly to the steps
they want to change, make their updates, and confirm. The config is updated — only the changed
fields are different; everything else is preserved exactly.

**Why this priority**: Without `--reconfigure`, the config lifecycle has a hard edge: users
can set up but not update. This closes that gap and makes tilde a tool you revisit, not just
run once. It also prevents the failure mode where users manually edit JSON and introduce
schema errors.

**Independent Test**: Start with a complete, valid `tilde.config.json`. Run
`tilde --reconfigure`. Verify all 14 wizard steps pre-populate with the stored values. Change
one field. Complete the wizard. Verify the config file reflects only the one changed value
and all other fields are identical to the original.

**Acceptance Scenarios**:

1. **Given** a valid `tilde.config.json` exists, **When** the user runs `tilde --reconfigure`,
   **Then** the full 14-step wizard opens with every field pre-populated from the stored config.
2. **Given** the reconfigure wizard is open, **When** the user changes exactly one field and
   completes the wizard, **Then** the saved `tilde.config.json` reflects that change and all
   other fields are byte-identical to the original.
3. **Given** no `tilde.config.json` exists, **When** the user runs `tilde --reconfigure`,
   **Then** tilde displays a clear error message explaining that no existing config was found
   and suggests running `tilde` without flags to start a fresh setup.
4. **Given** a `tilde.config.json` that fails schema validation, **When** `--reconfigure` is
   run, **Then** tilde reports the validation error, loads all valid fields as defaults, and
   allows the user to fix the invalid fields via the wizard rather than aborting entirely.
5. **Given** the user exits the reconfigure wizard before completing all steps, **When** the
   exit is confirmed, **Then** the original `tilde.config.json` is preserved unmodified.

---

### User Story 3 — Config Surviving a Tilde Upgrade (Priority: P3)

A developer installed tilde a year ago and has a `tilde.config.json` at schema version 1. They
upgrade tilde to a new version that introduces schema version 2 (which adds a new optional
`browserConfig` section). When they run tilde after the upgrade, it detects the version
mismatch, silently migrates the config forward (adding `browserConfig: null` as the default
for the new field), writes the updated file back to disk, and informs the user that their
config was upgraded. They proceed into the wizard or config-first mode without any manual
intervention.

**Why this priority**: Schema drift is a silent reliability hazard. Without migration, every
tilde upgrade risks breaking existing configs or forcing manual JSON editing. This delivers
the promise made in spec 001 that config files survive upgrades safely.

**Independent Test**: Create a `tilde.config.json` with `schemaVersion: 1`. Simulate loading
it against a migration layer that expects `schemaVersion: 2`. Verify the migration runs,
the new field is added with its default, the file is written back, and the user is notified of
the upgrade. Verify all original values are preserved.

**Acceptance Scenarios**:

1. **Given** a `tilde.config.json` with `schemaVersion: 1` and a tilde build that requires
   `schemaVersion: 2`, **When** tilde loads the config, **Then** it runs the v1→v2 migration,
   writes the migrated config back to disk atomically, and informs the user their config was
   automatically upgraded (showing both the old and new version numbers).
2. **Given** migration completes successfully, **When** the migrated config is validated,
   **Then** all values the user originally set are present and unchanged; only new fields
   added by the migration step are different.
3. **Given** a migration step fails, **When** the error occurs, **Then** tilde preserves
   the original file unmodified, warns the user with a clear explanation of what failed, and
   offers to launch the full wizard to rebuild the config interactively.
4. **Given** a `tilde.config.json` already at the current schema version, **When** tilde
   loads it, **Then** no migration runs and no notification is shown — startup proceeds
   normally with no perceptible difference.
5. **Given** a config file with a `schemaVersion` higher than the running tilde version
   supports, **When** tilde loads it, **Then** tilde warns the user that the config was
   written by a newer tilde version and proceeds without modifying the file.

---

### Edge Cases

- What if the OS detection command is unavailable or returns an unexpected format (e.g., on a
  future macOS version not yet in the friendly-name mapping)?
- What if the user's shell is set to a non-standard binary that tilde has no version-detection
  logic for?
- What if `tilde --reconfigure` is run while another tilde process holds a write lock on
  `tilde.config.json`?
- What if `tilde.config.json` is read-only (permissions error) when `--reconfigure` tries to
  overwrite it?
- What if migration involves multiple sequential version hops (e.g., v1 → v2 → v3)?
  Migration steps must chain deterministically without skipping intermediate versions.
- What if `tilde.config.json` is truncated or malformed (from a previously interrupted write)?
- What if the user has two copies of `tilde.config.json` (dotfiles repo vs. a local working
  copy) with different schema versions — which one does `--reconfigure` target?

## Requirements *(mandatory)*

### Functional Requirements

**Splash Screen**

- **FR-001**: On every interactive startup (prompt-first, config-first, and reconfigure modes),
  tilde MUST display a splash screen before any wizard step or config summary.
- **FR-002**: The splash screen MUST display all four of the following dynamically detected
  values: OS name and version, CPU architecture, shell name and version, and the running tilde
  version.
- **FR-003**: OS name and version MUST be rendered as a human-friendly string (e.g.,
  `macOS Sequoia 15.3`) when a friendly name mapping exists for the detected version. If no
  mapping exists, tilde MUST fall back to the raw detected value (e.g., `macOS 16.0`) without
  error or omission.
- **FR-004**: Shell name and version MUST be rendered as a friendly string (e.g., `zsh 5.9`).
  If shell version detection fails, the shell name alone MUST be shown rather than an error
  or an empty field.
- **FR-005**: Non-interactive mode (`--ci`, `--yes`) MUST skip the splash screen entirely.
  No splash-related content MUST appear in stdout during non-interactive runs.
- **FR-006**: All environment detection (OS, arch, shell, tilde version) MUST complete within
  500 ms total on any supported machine. The splash MUST NOT introduce a perceptible delay.

**`--reconfigure` Flag**

- **FR-007**: `tilde --reconfigure` MUST load the existing `tilde.config.json` using the same
  config reader used in config-first mode and pass all stored field values as `initialValues`
  to each wizard step.
- **FR-008**: Every wizard step MUST render its input pre-populated with the stored value from
  the loaded config. The user MUST be able to accept, modify, or navigate past each field.
- **FR-009**: On wizard completion, tilde MUST overwrite the existing `tilde.config.json`
  atomically (write to a temporary file, then rename into place) to prevent partial writes.
- **FR-010**: If no `tilde.config.json` is found when `--reconfigure` is invoked, tilde MUST
  exit with a non-zero status code and display a clear, actionable error message directing
  the user to run `tilde` without flags to create an initial config.
- **FR-011**: If the user exits the reconfigure wizard before completing all steps, tilde MUST
  preserve the original `tilde.config.json` unmodified.
- **FR-012**: If the loaded config fails schema validation, tilde MUST report the specific
  field-level errors, load all valid fields as defaults, and allow the user to correct
  invalid fields interactively rather than aborting.

**Config Schema Versioning & Migration**

- **FR-013**: Every `tilde.config.json` written by tilde MUST include a top-level
  `schemaVersion` field set to the current schema version integer.
- **FR-014**: On every config load (config-first, reconfigure, and non-interactive modes),
  tilde MUST read the `schemaVersion` field and compare it to the currently supported version.
- **FR-015**: If the file's `schemaVersion` is lower than the current version, tilde MUST
  run all applicable migration steps in ascending order before validation. Each migration step
  MUST be additive and non-destructive: it may add fields with defaults or rename deprecated
  fields, but MUST NOT remove any user-set values or alter values the user explicitly provided.
- **FR-016**: After successful migration, tilde MUST write the migrated config back to disk
  atomically and notify the user, including the old and new schema version numbers.
- **FR-017**: If any migration step fails, tilde MUST: (a) leave the original config file
  unmodified, (b) display a clear warning identifying which migration failed and why, and
  (c) offer to re-run the full wizard so the user can interactively supply any missing values.
- **FR-018**: If the loaded config has a `schemaVersion` higher than the current tilde version
  supports, tilde MUST warn the user and proceed without modifying the file.
- **FR-019**: Each migration step MUST be a pure, independently testable function that accepts
  a config object at version N and returns a config object at version N+1, with no side effects
  beyond the data transformation itself.
- **FR-020**: A config file missing the `schemaVersion` field entirely MUST be treated as
  `schemaVersion: 1` for backward compatibility with configs written before this feature.

### Key Entities

- **`tilde.config.json`**: Extended with a top-level `schemaVersion: number` field. All
  existing fields from spec 001 are unchanged. The `schemaVersion` is the sole version
  indicator used by the migration system.
- **Migration Step**: A pure, versioned transformation — a function that accepts a config
  object at version N and returns a config object at version N+1. Steps are registered by
  their `fromVersion` and chained automatically by the migration runner for multi-hop upgrades.
- **Environment Snapshot**: A transient data structure populated at startup containing OS name,
  OS version, CPU architecture, shell name, shell version, and tilde version. Used exclusively
  by the splash screen renderer. Never persisted to disk.
- **Splash Screen**: The interactive terminal UI startup component that receives an Environment Snapshot
  and renders four labeled display rows. Gracefully falls back to raw values for any field
  whose friendly-name lookup returns nothing.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All four environment fields (OS, architecture, shell, tilde version) are present
  and accurate on the splash screen on 100% of interactive startup runs, across all supported
  macOS versions and shells.
- **SC-002**: Splash screen environment detection completes in under 500 ms on any supported
  machine, measured from process start to first render of the splash.
- **SC-003**: A user can complete a `--reconfigure` run that changes exactly one field in
  under 2 minutes from splash screen to confirmation.
- **SC-004**: 100% of fields in an existing `tilde.config.json` are preserved unchanged
  through a `--reconfigure` run where the user modifies only one field — verified by
  comparing all unchanged fields before and after the run.
- **SC-005**: A `tilde.config.json` at any supported older schema version is successfully
  migrated to the current version in a single tilde startup, with no user intervention
  required and no original data lost.
- **SC-006**: A failed migration leaves the original `tilde.config.json` byte-identical to
  its pre-migration state, verifiable by checksumming the file before and after the failed run.
- **SC-007**: Non-interactive / CI mode (`--ci`) produces zero splash-related output in
  stdout — verified by asserting that no splash content strings appear in captured output.

## Assumptions

- The target platform for this spec is macOS (Apple Silicon and Intel); the OS version
  friendly-name mapping covers macOS 13 (Ventura), 14 (Sonoma), and 15 (Sequoia) at minimum,
  with raw-value fallback for unmapped versions.
- Shell version detection reads the shell binary's own `--version` output or equivalent; no
  external binary beyond the running shell process is required.
- The initial schema version established by spec 001 is `1`; this spec introduces the
  `schemaVersion` field itself — configs predating this feature have no `schemaVersion` field
  and MUST be treated as version `1` (FR-020). No existing field changes in this spec,
  so no actual data migration step is needed for the v1 baseline; the infrastructure is built
  but the first real migration step will ship with whatever spec next changes the schema.
- `tilde.config.json` is located at the path stored in tilde's internal config pointer or at
  the default dotfiles repo location. `--reconfigure` does not require the user to supply the
  file path explicitly; it uses the same resolution logic as config-first mode.
- The wizard's `initialValues` API already accepts an optional pre-population object per step
  (per spec 001 tasks T091/T092). This spec wires the `--reconfigure` flag to that existing
  API — no changes to the wizard step components themselves are required, only the wiring layer.
- Multi-hop migrations (e.g., v1 → v2 → v3) are chained automatically by the migration
  runner. Individual migration steps handle exactly one version increment; they are not
  responsible for handling non-adjacent version jumps.
- Windows support is out of scope for this spec. OS detection and friendly-name mapping covers
  macOS only. The detection layer is platform-abstracted so Windows support can be added in a
  future spec without restructuring.
