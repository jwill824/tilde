---
phase: 05-config-discovery-polish
plan: 01
subsystem: cli-config
tags: [config-discovery, cli, vitest, node-next]

requires:
  - phase: 04-provenance-summary
    provides: "Prior wizard/config summary behavior preserved while polishing config discovery"
provides:
  - "Bounded fixed-path tilde config discovery"
  - "Source-aware config resolution for flag, env, positional, and discovered paths"
  - "Shared wizard-first no-config guidance across config-required CLI surfaces"
  - "CLI regression coverage for install, update, config, context, CI, and reconfigure"
affects: [cli, config, reconfigure, integration-tests]

tech-stack:
  added: []
  patterns:
    - "Source-aware resolver returns selected config path plus source before loadConfig() reads or validates"
    - "No-config messages are formatted centrally with command-specific --config examples"

key-files:
  created:
    - src/utils/config-resolution.ts
  modified:
    - src/utils/config-discovery.ts
    - src/index.tsx
    - src/modes/reconfigure.tsx
    - tests/unit/config-discovery.test.ts
    - tests/unit/reconfigure.test.ts
    - tests/integration/cli-regression.test.ts

key-decisions:
  - "Auto-discovery remains accessibility-only: first accessible fixed path wins, and loadConfig() owns parse/schema failures."
  - "Explicit --config, TILDE_CONFIG, and positional config paths never fall back to auto-discovery after load failure."
  - "Config edit now resolves and validates the selected config before opening the editor so missing explicit paths fail consistently."

patterns-established:
  - "ConfigCommandContext supplies command-specific examples to shared no-config output."
  - "CLI handlers call resolveConfigPath() before loadConfig() so source-specific errors are preserved."

requirements-completed: [CONF-01, CONF-02, CONF-03]

duration: 30min
completed: 2026-06-20
---

# Phase 05 Plan 01: Config Discovery Polish Summary

**Source-aware tilde config discovery with fixed known paths and shared CLI no-config guidance**

## Performance

- **Duration:** 30 min
- **Started:** 2026-06-20T13:17:37Z
- **Completed:** 2026-06-20T13:47:18Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Added fixed discovery locations for `~/.config/tilde/tilde.config.json` and `~/tilde.config.json` while preserving cwd, git-root, and canonical `~/.tilde` priority.
- Added `src/utils/config-resolution.ts` with source-aware precedence for `--config`, `TILDE_CONFIG`, positional paths, and auto-discovery.
- Routed config, context, install, update, CI startup, and reconfigure startup through shared resolution and source-specific load error formatting.
- Added unit and built-CLI regression coverage for no-config guidance, explicit override failure, invalid selected configs, and command-specific examples.

## Task Commits

1. **Task 1: Add Wave 0 tests for config discovery and override behavior** - `ad2d8f3` (`test`)
2. **Task 2: Implement bounded discovery paths and source-aware config resolution** - `71a1a44` (`feat`)
3. **Task 3: Wire shared resolution through CLI and reconfigure surfaces** - `76b0b65` (`feat`)

## Files Created/Modified

- `src/utils/config-resolution.ts` - New resolver and selected-file load error formatter.
- `src/utils/config-discovery.ts` - Fixed allowlisted path order plus shared no-config formatter.
- `src/index.tsx` - CLI source preservation and shared resolver wiring for config-required surfaces.
- `src/modes/reconfigure.tsx` - Shared missing-config guidance for empty reconfigure paths.
- `tests/unit/config-discovery.test.ts` - Discovery, resolver, and formatter unit coverage.
- `tests/unit/reconfigure.test.ts` - Reconfigure missing-config and selected-file behavior coverage.
- `tests/integration/cli-regression.test.ts` - Built CLI coverage for install, update, config, context, CI, reconfigure, override precedence, and invalid explicit config.

## Verification Commands

RED before implementation:

- `npm run test -- tests/unit/config-discovery.test.ts` - failed as expected: missing `src/utils/config-resolution.js`.
- `npm run test -- tests/unit/config-discovery.test.ts tests/unit/reconfigure.test.ts` - failed as expected: missing resolver module and old reconfigure message.
- `npm run build && npm run test:integration -- tests/integration/cli-regression.test.ts` - failed as expected across command surfaces before CLI wiring.

GREEN after implementation:

- `npm run test -- tests/unit/config-discovery.test.ts` - passed, 33 tests.
- `npm run test -- tests/unit/config-discovery.test.ts tests/unit/reconfigure.test.ts` - passed, 38 tests.
- `npm run build && npm run test:integration -- tests/integration/cli-regression.test.ts` - passed, 19 tests and 1 existing todo.
- `npm run build && npm test && npm run test:integration && npm run test:contract` - passed after rerun with filesystem escalation for existing contract tests that write `~/.tilde/tilde.config.json.tmp`.

## Decisions Made

- Kept config discovery content-blind and accessibility-only; invalid selected files are reported by `loadConfig()` through source-aware wrappers.
- Kept plain `tilde` wizard fallback when no config is discovered, while config-required commands fail with shared no-config guidance.
- Preflighted selected config loading for config-required CLI surfaces so missing explicit paths do not reach Ink flows or external editors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test Bug] Fixed cwd de-duplication assertion under home directory**
- **Found during:** Task 2
- **Issue:** The new unit test filtered out all paths under `homedir()`, but this repository itself lives under the user home, so the cwd config path was incorrectly excluded.
- **Fix:** Asserted cwd de-duplication against the full path list instead of filtering home-prefixed paths.
- **Files modified:** `tests/unit/config-discovery.test.ts`
- **Verification:** `npm run test -- tests/unit/config-discovery.test.ts`
- **Committed in:** `71a1a44`

**2. [Rule 3 - Blocking] Wired reconfigure no-config guidance during Task 2**
- **Found during:** Task 2
- **Issue:** Task 2 verification included `tests/unit/reconfigure.test.ts`, which could not pass until empty-path reconfigure used the shared no-config formatter.
- **Fix:** Updated `ReconfigureMode` empty-path handling to call `formatNoConfigError()` with the reconfigure command context.
- **Files modified:** `src/modes/reconfigure.tsx`
- **Verification:** `npm run test -- tests/unit/config-discovery.test.ts tests/unit/reconfigure.test.ts`
- **Committed in:** `71a1a44`

**3. [Rule 1 - Test Bug] Fixed CLI regression fixture validity**
- **Found during:** Task 3
- **Issue:** The integration fixture used an empty context path, so discovered config commands failed schema validation instead of exercising discovery behavior.
- **Fix:** Set the default fixture context path to `~/Developer/personal` and relaxed `config show` to account for schema migration output.
- **Files modified:** `tests/integration/cli-regression.test.ts`
- **Verification:** `npm run build && npm run test:integration -- tests/integration/cli-regression.test.ts`
- **Committed in:** `76b0b65`

**Total deviations:** 3 auto-fixed (2 test bugs, 1 blocking verification issue).
**Impact on plan:** No scope expansion; fixes were required to make planned verification meaningful and green.

## Issues Encountered

- The first full phase gate failed inside the sandbox because existing contract tests write to `~/.tilde/tilde.config.json.tmp`. Rerunning the same command with filesystem escalation passed.

## Known Stubs

None. Stub-pattern scan found only test helper default objects and null-safe assertions, not product placeholders or UI data stubs.

## Threat Flags

None. The new resolver works within the planned argv/env-to-filesystem trust boundary and introduces no new network endpoints, auth paths, schema changes, or broad file scans.

## User Setup Required

None.

## Next Phase Readiness

Phase 5 requirements `CONF-01`, `CONF-02`, and `CONF-03` are covered by source-aware unit tests and built CLI regression tests. No blockers remain.

## Self-Check: PASSED

- Created file exists: `src/utils/config-resolution.ts`
- Summary file exists: `.planning/phases/05-config-discovery-polish/05-01-SUMMARY.md`
- Task commits exist: `ad2d8f3`, `71a1a44`, `76b0b65`
- Verification commands completed as listed above.

---
*Phase: 05-config-discovery-polish*
*Completed: 2026-06-20*
