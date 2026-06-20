# Phase 5: Config Discovery Polish - Context

**Gathered:** 2026-06-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 polishes config discovery and config-required error behavior across tilde's config-loading CLI surfaces. It adds safe, deterministic non-default config locations, improves not-found and explicit-override guidance, and keeps `--config` and `TILDE_CONFIG` as strict highest-priority overrides. It does not add broad filesystem crawling, new config schema fields, or a new inventory/provenance output surface.

</domain>

<decisions>
## Implementation Decisions

### Discovery Locations

- **D-01:** Use a conservative known-path discovery set.
- **D-02:** Add short fixed legacy/user-friendly locations such as `~/.config/tilde/tilde.config.json` and `~/tilde.config.json`.
- **D-03:** Preserve current high-priority discovery anchors: current working directory, git root when applicable, and canonical `~/.tilde/tilde.config.json`.
- **D-04:** Do not add broad recursive dotfiles scanning in this phase. Discovery must remain bounded, deterministic, and read-only.

### Not-Found Guidance

- **D-05:** When no config is found, the primary recommendation should be running the wizard with `tilde`.
- **D-06:** Error output should include examples for useful config locations, not just the exact searched paths.
- **D-07:** Use command-specific guidance where the invoking command matters, such as `tilde install --config <path>` versus `tilde update <resource> --config <path>`.

### Override Behavior

- **D-08:** A missing explicit `--config` path must fail without falling back to auto-discovery.
- **D-09:** A missing `TILDE_CONFIG` path must also fail without falling back to auto-discovery.
- **D-10:** Missing `TILDE_CONFIG` errors should mention that the environment variable is set and tell the user to fix or unset it.
- **D-11:** If an explicit config exists but has invalid JSON or schema errors, the error should focus on fixing that file rather than presenting discovery alternatives.
- **D-12:** Explicit `--config` and `TILDE_CONFIG` continue to override all auto-discovery behavior.

### Subcommand Consistency

- **D-13:** Update all config-loading subcommands and modes touched by this behavior, not only `install` and `update`.
- **D-14:** `tilde config validate`, `tilde config show`, and `tilde config edit` should auto-discover configs when no path is passed.
- **D-15:** `tilde context list`, `tilde context current`, and `tilde context switch` should use the same discovery and override error behavior.
- **D-16:** `--reconfigure` should use the same not-found guidance when no config can be discovered.
- **D-17:** Add targeted CLI regression tests for updated install, update, startup, config, context, and reconfigure discovery and override behavior.

### the agent's Discretion

- The planner may decide exact ordering for newly added legacy locations, as long as explicit `--config` and `TILDE_CONFIG` remain above all auto-discovery and the existing core discovery anchors stay intact.
- The planner may decide whether auto-discovery should keep "first accessible path wins" or skip invalid auto-discovered files, based on implementation risk and clarity.
- The planner may decide whether searched-path errors use labels such as current directory, git root, canonical home, and legacy config.
- The planner may decide whether explicit override failures show skipped auto-discovery paths, as long as the output does not imply fallback happened.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning

- `.planning/PROJECT.md` - Project goal, macOS-first/read-first constraints, and milestone context.
- `.planning/REQUIREMENTS.md` - Phase 5 requirements `CONF-01`, `CONF-02`, and `CONF-03`.
- `.planning/ROADMAP.md` - Phase 5 goal, success criteria, and one-plan scope.
- `.planning/STATE.md` - Current milestone state and accumulated decisions.
- `.planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md` - Bounded safe scan decisions and no broad recursive crawling.
- `.planning/phases/04-provenance-summary/04-CONTEXT.md` - Prior output-surface scope; Phase 5 should stay focused on config discovery.

### Codebase Maps

- `.planning/codebase/ARCHITECTURE.md` - CLI entry, config layer, and config-first flow boundaries.
- `.planning/codebase/TESTING.md` - Unit, integration, and CLI regression test patterns.
- `.planning/codebase/CONCERNS.md` - Startup/subcommand fragility and config-discovery regression warning.

### Existing Code

- `src/utils/config-discovery.ts` - Current discovery paths, `discoverConfig()`, and not-found error formatting.
- `src/index.tsx` - CLI argument parsing, subcommand dispatch, install/update config discovery, startup mode selection, and reconfigure handling.
- `src/config/reader.ts` - `loadConfig()` behavior for local paths, remote URLs, migration, parse errors, and schema validation.
- `src/modes/reconfigure.tsx` - Current reconfigure-specific missing-config and load-error handling.
- `tests/unit/config-discovery.test.ts` - Existing discovery-path and no-config error tests.
- `tests/integration/cli-regression.test.ts` - Likely home for command-level behavior coverage.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/utils/config-discovery.ts`: Already centralizes standard search paths, discovery, and config-required error formatting.
- `src/index.tsx`: Already routes install/update through `discoverConfig()` and `formatNoConfigError()`.
- `src/config/reader.ts`: Already preserves explicit load failures for parse, migration, validation, and missing local files.
- `tests/unit/config-discovery.test.ts`: Already mocks git-root detection and verifies path order and error contents.

### Established Patterns

- Explicit config paths are parsed before auto-discovery and should remain the highest-priority source.
- Config discovery currently uses bounded path checks and returns the first accessible path.
- CLI subcommands write deterministic stdout/stderr and exit with explicit codes.
- Config discovery tests should mock filesystem, git root detection, and CLI process behavior rather than depending on the real user machine.

### Integration Points

- `parseCliArgs()` is where `--config` and `TILDE_CONFIG` become a single config path today; the planner may need to preserve source information to produce env-specific wording.
- `handleContextSubcommand()` and `handleConfigSubcommand()` currently use cwd fallback behavior rather than shared discovery helpers.
- `main()` handles install/update discovery separately from general startup discovery.
- `ReconfigureMode` currently has specialized config-missing text and should align with shared not-found guidance.

</code_context>

<specifics>
## Specific Ideas

- Useful legacy locations called out by the user: `~/.config/tilde/tilde.config.json` and `~/tilde.config.json`.
- The not-found message should be wizard-first while still showing explicit path examples for users who already have a config elsewhere.
- Env-var override wording should say that `TILDE_CONFIG` is set and should be fixed or unset.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 5-Config Discovery Polish*
*Context gathered: 2026-06-20*
