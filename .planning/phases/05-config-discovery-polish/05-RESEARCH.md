# Phase 05: Config Discovery Polish - Research

**Researched:** 2026-06-20
**Domain:** TypeScript NodeNext CLI config discovery and terminal error handling
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)

## Deferred Ideas

None - discussion stayed within phase scope.
</user_constraints>

## Summary

Phase 5 should be planned as a focused CLI/config-layer cleanup, not as new inventory scanning. The existing discovery boundary is `src/utils/config-discovery.ts`, which already owns `getDiscoveryPaths()`, `discoverConfig()`, and `formatNoConfigError()`, but `src/index.tsx` still contains local fallback behavior in `handleContextSubcommand()` and `handleConfigSubcommand()`. [VERIFIED: codebase grep] The highest-value plan boundary is to introduce a shared resolver that carries config source (`--config`, `TILDE_CONFIG`, auto-discovered, positional path) and uses the same failure formatter everywhere a config is required. [VERIFIED: codebase grep]

Do not add broad filesystem traversal. Phase 3 already established bounded, read-only dotfile scanning with allowlists and no raw secret persistence, and Phase 5's locked decisions repeat that discovery must be deterministic and read-only. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md] [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md] Add only the fixed known locations `~/.config/tilde/tilde.config.json` and `~/tilde.config.json` to the config discovery path list while preserving current cwd, git-root, and canonical home anchors. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]

**Primary recommendation:** Build one shared config-resolution helper in `src/utils/config-discovery.ts` or adjacent `src/utils/config-resolution.ts`, then route install, update, config, context, startup config-first, and reconfigure through that helper with targeted unit and CLI regression tests. [VERIFIED: codebase grep]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Config path discovery | CLI entry / local filesystem utility | Config reader | Path selection happens before loading JSON; `loadConfig()` should continue to load one chosen file or URL. [VERIFIED: src/index.tsx] [VERIFIED: src/config/reader.ts] |
| Explicit override precedence | CLI argument parsing | Config discovery helper | `parseCliArgs()` currently merges `--config` and `TILDE_CONFIG`; Phase 5 needs source-aware precedence before any auto-discovery. [VERIFIED: src/index.tsx] |
| Missing-config guidance | Config discovery helper | Subcommand handlers / ReconfigureMode | Error text should be generated centrally, with command-specific usage supplied by callers. [VERIFIED: src/utils/config-discovery.ts] |
| Known dotfiles config locations | Config discovery helper | Existing dotfile scanner decisions | This phase needs fixed config file candidates only, not Phase 3-style inventory dotfile scanning. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md] |
| Config validation / parse failures | Config reader | Config-first / reconfigure UI | `loadConfig()` already owns parse, migration, and schema validation; explicit invalid config errors should stay focused on the selected file. [VERIFIED: src/config/reader.ts] |
| Regression coverage | Vitest unit and integration suites | Build command | Existing unit tests cover discovery helpers; existing CLI regression suite runs built `dist/bin/tilde.js` with `execa`. [VERIFIED: tests/unit/config-discovery.test.ts] [VERIFIED: tests/integration/cli-regression.test.ts] |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONF-01 | When no config is provided, tilde gives a helpful error that lists searched paths. | Extend `formatNoConfigError()` and route every config-required command through it. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: src/utils/config-discovery.ts] |
| CONF-02 | tilde can discover configs in known dotfiles locations when safe and deterministic. | Add only fixed candidates to `getDiscoveryPaths()`; do not use recursive dotfile inventory scans. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md] |
| CONF-03 | `--config` and `TILDE_CONFIG` continue to override auto-discovery. | Preserve strict precedence and source-specific missing-path errors; current parsing loses source information and should be refined. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: src/index.tsx] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Runtime is Node.js >=20, TypeScript NodeNext, ESM-only, and TypeScript source imports must keep `.js` extensions. [VERIFIED: AGENTS.md]
- UI is Ink/React terminal UI; outputs must fit terminal workflows and non-interactive paths where relevant. [VERIFIED: AGENTS.md]
- Platform is macOS-first, with Homebrew, app bundles, shell rc files, and dotfiles discovery as the product target. [VERIFIED: AGENTS.md]
- Discovery must be non-destructive by default and should read/report before writing or deleting anything. [VERIFIED: AGENTS.md]
- Raw secrets must not be resolved or persisted; environment variables and secret references stay as backend references. [VERIFIED: AGENTS.md]
- External commands including `brew`, `gh`, `op`, `vfox`, and `defaultbrowser` must be mocked in automated tests; `git` discovery should follow the same mocking pattern because `getGitRepoRoot()` uses `execa`. [VERIFIED: AGENTS.md] [VERIFIED: src/utils/config-discovery.ts]
- Keep schema changes, migrations, docs, and tests together when schema changes happen; this phase should avoid schema changes. [VERIFIED: AGENTS.md] [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]
- Use existing plugin interfaces instead of hardcoding new integrations; this phase should not touch plugin integrations. [VERIFIED: AGENTS.md] [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 22.22.2 locally; package engine >=20 | CLI runtime, `node:fs/promises`, `node:path`, `node:os`, `node:util` | Existing runtime and package contract. [VERIFIED: local command] [VERIFIED: package.json] |
| TypeScript | 5.4.5 | Type checking and NodeNext source compilation | Existing build stack. [VERIFIED: package-lock.json] |
| execa | 9.6.1 | Existing `git rev-parse --show-toplevel` execution in discovery | Already used by config discovery and existing tests mock it. [VERIFIED: package-lock.json] [VERIFIED: src/utils/config-discovery.ts] |
| Ink / React | Ink 6.8.0 / React 19.2.4 | Reconfigure and config-first terminal UI | Existing UI framework; only needed for UI-mode error rendering. [VERIFIED: package-lock.json] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.2 | Unit and integration test runner | Use for config-discovery unit tests, Ink component tests, and CLI regression tests. [VERIFIED: package-lock.json] [VERIFIED: vitest.config.ts] |
| ink-testing-library | 4.0.0 | Ink component assertions | Use for `ReconfigureMode` not-found and invalid-file rendering behavior. [VERIFIED: package-lock.json] [VERIFIED: tests/unit/reconfigure.test.ts] |
| Zod / zod-validation-error | Zod 4.3.6 / zod-validation-error 5.0.0 | Existing config validation and readable errors | Do not replace; preserve `loadConfig()` validation ownership. [VERIFIED: package-lock.json] [VERIFIED: src/config/reader.ts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Shared config resolver | Add local fallbacks in each subcommand | Repeats today's drift between install/update and config/context subcommands. [VERIFIED: src/index.tsx] |
| Fixed known path list | Reuse `scanDotfileMap()` for config discovery | Violates Phase 5's bounded config-discovery scope and risks scanning unrelated dotfiles. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md] [VERIFIED: src/inventory/dotfiles.ts] |
| Preserve `loadConfig()` as selected-file loader | Make `loadConfig()` search paths | Blurs source/precedence semantics and makes explicit invalid config errors harder to distinguish. [VERIFIED: src/config/reader.ts] |

**Installation:**
```bash
# No new packages are recommended for Phase 5.
```

**Version verification:** Existing package versions were verified from `package-lock.json`; no registry lookup is required because no new package installation is recommended. [VERIFIED: package-lock.json]

## Package Legitimacy Audit

This phase should not install external packages. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| none | npm | n/a | n/a | n/a | n/a | No install recommended. [VERIFIED: codebase grep] |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: codebase grep]
**Packages flagged as suspicious [SUS]:** none. [VERIFIED: codebase grep]

## Architecture Patterns

### System Architecture Diagram

```text
argv + env
  |
  v
parse CLI args with config source
  |
  +--> explicit --config path? ---- yes ----> verify/load exact path, no auto-discovery fallback
  |
  +--> TILDE_CONFIG path? --------- yes ----> verify/load exact env path, no auto-discovery fallback
  |
  +--> positional config path? ---- command-specific for config subcommands
  |
  v
auto-discovery helper
  |
  +--> cwd/tilde.config.json
  +--> git-root/tilde.config.json
  +--> ~/.tilde/tilde.config.json
  +--> ~/.config/tilde/tilde.config.json
  +--> ~/tilde.config.json
  |
  v
found path? ---- no ----> shared wizard-first not-found guidance with searched paths + examples
  |
 yes
  v
loadConfig(selected path)
  |
  +--> JSON parse/migration/schema error -> selected-file-focused error
  |
  v
command handler / Ink mode
```

### Recommended Project Structure

```text
src/
├── utils/
│   ├── config-discovery.ts       # path candidates, auto-discovery, shared error formatters
│   └── config-resolution.ts      # optional: source-aware resolver if config-discovery grows too large
├── index.tsx                     # thin caller: parse args, pass command context to resolver
└── modes/
    └── reconfigure.tsx           # render shared not-found guidance in Ink when no config can be resolved

tests/
├── unit/
│   ├── config-discovery.test.ts  # path order, override formatter, no broad scanning
│   └── reconfigure.test.ts       # Ink missing-config guidance
└── integration/
    └── cli-regression.test.ts    # built CLI command-level override behavior
```

### Pattern 1: Source-Aware Config Resolution

**What:** Preserve whether a config path came from `--config`, `TILDE_CONFIG`, positional config subcommand path, or auto-discovery, then choose error text based on that source. [VERIFIED: src/index.tsx]

**When to use:** Every command or mode that cannot proceed without config: install, update, config validate/show/edit, context list/current/switch, non-interactive mode, and reconfigure. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]

**Example:**
```typescript
// Source: recommended local pattern from src/index.tsx + src/utils/config-discovery.ts
type ConfigSource = 'flag' | 'env' | 'positional' | 'discovered';

interface ResolvedConfigPath {
  path: string;
  source: ConfigSource;
}
```

### Pattern 2: Keep `loadConfig()` Focused

**What:** Let discovery choose one path; let `loadConfig()` read, migrate, parse, and validate that selected path. [VERIFIED: src/config/reader.ts]

**When to use:** All explicit and discovered config paths, including remote URLs already supported by `loadConfig()`. [VERIFIED: src/config/reader.ts]

**Example:**
```typescript
// Source: src/config/reader.ts
const config = await loadConfig(resolved.path);
```

### Pattern 3: Deterministic Known-Path Discovery

**What:** `getDiscoveryPaths()` should return stable candidates and de-duplicate if cwd and git root produce the same path. Existing tests already cover deduplication for cwd/git root. [VERIFIED: tests/unit/config-discovery.test.ts]

**When to use:** Auto-discovery only; never after an explicit missing `--config` or `TILDE_CONFIG` path. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]

**Example:**
```typescript
// Source: current src/utils/config-discovery.ts pattern
for (const p of await getDiscoveryPaths()) {
  try {
    await access(p);
    return p;
  } catch {
    // try next candidate
  }
}
```

### Anti-Patterns to Avoid

- **Recursive dotfiles crawling for tilde config:** It violates the locked deterministic read-only scope for this phase. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]
- **Falling back after explicit path failure:** It violates CONF-03 and decisions D-08/D-09/D-12. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]
- **Mixing invalid-file guidance with no-file discovery guidance:** D-11 says explicit JSON/schema failures should focus on fixing that file, not discovery alternatives. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]
- **Leaving config/context subcommands on cwd fallback:** Current local fallback can drift from shared discovery and should be replaced. [VERIFIED: src/index.tsx]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path traversal | Recursive dotfiles search or globbing | Fixed `getDiscoveryPaths()` candidates | Phase 5 scope is known config locations only. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md] |
| JSON/schema validation | New parser or partial validator | Existing `loadConfig()` | It already handles local/remote read, migrations, JSON parse errors, and Zod schema validation. [VERIFIED: src/config/reader.ts] |
| CLI command execution in tests | Real `git`, `brew`, `gh`, or editor execution | Mock `execa` / `run()` or use temp dirs with built CLI | Project tests must mock external commands. [VERIFIED: AGENTS.md] [VERIFIED: tests/unit/config-discovery.test.ts] |
| Per-command error strings | Separate string literals in each handler | Shared formatter with command context | Prevents drift across install/update/config/context/reconfigure surfaces. [VERIFIED: src/index.tsx] |

**Key insight:** The hard part is not discovering two more paths; it is preserving source-aware precedence consistently across commands that currently load config through different local branches. [VERIFIED: src/index.tsx]

## Common Pitfalls

### Pitfall 1: Losing Override Source

**What goes wrong:** `parseCliArgs()` currently returns one `configPath` from `(args.config ?? envConfig)`, so downstream code cannot tell whether a missing path came from `--config` or `TILDE_CONFIG`. [VERIFIED: src/index.tsx]

**Why it happens:** Source information is discarded at parse time. [VERIFIED: src/index.tsx]

**How to avoid:** Return `{ configPath, configSource }` or separate `flagConfigPath` / `envConfigPath` values from parsing. [VERIFIED: codebase grep]

**Warning signs:** Error text cannot mention "TILDE_CONFIG is set" for missing env paths. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]

### Pitfall 2: Updating Install/Update Only

**What goes wrong:** `install` and `update` already call `discoverConfig()`, but `config` and `context` subcommands still locally choose cwd or literal `tilde.config.json`. [VERIFIED: src/index.tsx]

**Why it happens:** Subcommand handlers predate the shared discovery behavior. [VERIFIED: src/index.tsx]

**How to avoid:** Route all config-required handlers through one resolver. [VERIFIED: codebase grep]

**Warning signs:** `tilde config show` fails while `tilde install` finds the same config. [VERIFIED: src/index.tsx]

### Pitfall 3: Treating Invalid Auto-Discovered Config as Not Found

**What goes wrong:** Users may get discovery alternatives when the real issue is a broken config file. D-11 explicitly forbids this for explicit configs, and the planner should decide whether auto-discovered invalid files stop resolution or are skipped. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]

**Why it happens:** `discoverConfig()` only checks accessibility and does not validate contents. [VERIFIED: src/utils/config-discovery.ts]

**How to avoid:** Keep discovery accessibility-only, then ensure the loading command reports selected-file parse/schema errors clearly. [VERIFIED: src/config/reader.ts]

**Warning signs:** Error output contains "searched paths" after `loadConfig()` throws `Config validation failed`. [VERIFIED: src/config/reader.ts]

### Pitfall 4: Breaking Config-First Startup Semantics

**What goes wrong:** Plain `tilde` currently auto-discovers a config and enters config-first mode; if none is found, it launches the wizard. [VERIFIED: src/index.tsx]

**Why it happens:** Startup has different UX than config-required subcommands. [VERIFIED: src/index.tsx]

**How to avoid:** Keep startup wizard behavior for no discovered config unless `--reconfigure`, `--ci`, install, update, config, or context explicitly requires a config. [VERIFIED: src/index.tsx] [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]

**Warning signs:** Running plain `tilde` exits with a config-required error instead of launching the wizard. [VERIFIED: src/index.tsx]

## Code Examples

### Current Discovery Boundary

```typescript
// Source: src/utils/config-discovery.ts
export async function discoverConfig(): Promise<string | null> {
  for (const p of await getDiscoveryPaths()) {
    try {
      await access(p);
      return p;
    } catch {
      // not found at this path, try next
    }
  }
  return null;
}
```

### Current Drift to Replace

```typescript
// Source: src/index.tsx
const cwdConfig = resolve(process.cwd(), 'tilde.config.json');
const cfgPath = configPath || (existsSync(cwdConfig) ? cwdConfig : 'tilde.config.json');
```

### Existing Test Pattern

```typescript
// Source: tests/unit/config-discovery.test.ts
vi.mock('execa', () => ({
  execa: vi.fn(),
}));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Only cwd/git-root/canonical home config discovery | Add conservative legacy/user-friendly fixed locations | Phase 5 planning target | Satisfies CONF-02 without broad scan risk. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md] |
| Per-subcommand cwd fallback for config/context | Shared source-aware resolver | Phase 5 planning target | Satisfies D-13 through D-17. [VERIFIED: src/index.tsx] [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md] |
| Generic missing config text | Wizard-first, command-specific guidance with searched paths and examples | Phase 5 planning target | Satisfies CONF-01 and D-05 through D-07. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md] |

**Deprecated/outdated:**
- Tests asserting `~/.config/tilde` and `~/tilde.config.json` are not included are now outdated and should be inverted or replaced. [VERIFIED: tests/unit/config-discovery.test.ts] [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]
- The local `cfgPath = configPath || cwd || 'tilde.config.json'` pattern in config/context subcommands is outdated for Phase 5. [VERIFIED: src/index.tsx]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exact ordering of `~/.config/tilde/tilde.config.json` versus `~/tilde.config.json` is planner discretion after cwd, git root, and canonical home anchors. [ASSUMED] | Standard Stack / Architecture Patterns | A different ordering could surprise users with multiple config copies; mitigate with explicit unit tests and documented order. |
| A2 | CLI regression tests can use built `dist/bin/tilde.js` after `npm run build` in the same pattern as existing `cli-regression.test.ts`. [ASSUMED] | Validation Architecture | If build artifacts are stale during targeted test runs, planner must add a build step before integration commands. |

## Open Questions (RESOLVED)

1. **RESOLVED: Invalid auto-discovered configs stop search at the first accessible path.**
   - What we know: Context leaves this to planner discretion. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]
   - Resolution: Use "first accessible path wins"; if that file is invalid, stop resolution and report the selected-file parse or schema error. Do not skip a readable but invalid cwd/git/home candidate to continue searching other auto-discovery paths. This is simpler, predictable, and matches current `discoverConfig()` semantics. [VERIFIED: src/utils/config-discovery.ts]

2. **RESOLVED: Explicit override errors do not list skipped auto-discovery paths.**
   - What we know: Context allows this if output does not imply fallback happened. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]
   - Resolution: Do not list auto-discovery paths for missing explicit `--config` or `TILDE_CONFIG` overrides in a way that implies fallback happened. Instead, state the override source is set or was provided and must be fixed or unset, and keep the error focused on that selected path. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Build, tests, CLI execution | yes | 22.22.2 | Project supports >=20; CI uses Node 22. [VERIFIED: local command] [VERIFIED: package.json] |
| npm | Test/build scripts | yes | 10.9.7 | none required. [VERIFIED: local command] |
| git CLI | Existing git-root config discovery anchor | yes | 2.54.0 | `getGitRepoRoot()` already returns null when git is unavailable or fails. [VERIFIED: local command] [VERIFIED: src/utils/config-discovery.ts] |

**Missing dependencies with no fallback:** none found for research/planning. [VERIFIED: local command]

**Missing dependencies with fallback:** git has an existing soft-failure fallback to omit git-root discovery. [VERIFIED: src/utils/config-discovery.ts]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2. [VERIFIED: package-lock.json] |
| Config file | `vitest.config.ts` for unit tests; `vitest.integration.config.ts` for integration tests. [VERIFIED: vitest.config.ts] [VERIFIED: vitest.integration.config.ts] |
| Smoke run command | `npm run test -- tests/unit/config-discovery.test.ts` [VERIFIED: package.json] |
| Targeted run command | `npm run test -- tests/unit/config-discovery.test.ts tests/unit/reconfigure.test.ts` [VERIFIED: package.json] |
| Full suite command | `npm run build && npm test && npm run test:integration && npm run test:contract` [VERIFIED: package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| CONF-01 | Missing config errors list searched paths, examples, and wizard-first guidance | unit + integration | `npm run test -- tests/unit/config-discovery.test.ts` and `npm run test:integration -- tests/integration/cli-regression.test.ts` | yes. [VERIFIED: tests/unit/config-discovery.test.ts] [VERIFIED: tests/integration/cli-regression.test.ts] |
| CONF-02 | `~/.config/tilde/tilde.config.json` and `~/tilde.config.json` are discovered through fixed known paths | unit | `npm run test -- tests/unit/config-discovery.test.ts` | yes; existing negative assertions need replacement. [VERIFIED: tests/unit/config-discovery.test.ts] |
| CONF-03 | Missing `--config` and `TILDE_CONFIG` fail without auto-discovery fallback | integration + unit | `npm run test:integration -- tests/integration/cli-regression.test.ts` | yes; needs new cases. [VERIFIED: tests/integration/cli-regression.test.ts] |
| CONF-03 | Invalid explicit config reports selected-file parse/schema errors, not searched paths | integration + unit | `npm run test:integration -- tests/integration/cli-regression.test.ts` and `npm run test -- tests/unit/reconfigure.test.ts` | yes; needs new cases. [VERIFIED: tests/unit/reconfigure.test.ts] |

### Sampling Rate

- **Per task smoke:** `npm run test -- tests/unit/config-discovery.test.ts` for sub-30-second feedback before heavier checks. [VERIFIED: package.json]
- **Per task targeted:** `npm run test -- tests/unit/config-discovery.test.ts tests/unit/reconfigure.test.ts` plus targeted integration when CLI dispatch changes. [VERIFIED: package.json]
- **Per wave merge:** `npm run build && npm run test:integration -- tests/integration/cli-regression.test.ts`. [VERIFIED: package.json]
- **Phase gate:** `npm run build && npm test && npm run test:integration && npm run test:contract`. [VERIFIED: package.json]

### Wave 0 Gaps

- [ ] Extend `tests/integration/cli-regression.test.ts` beyond help/version to cover config-required command behavior. [VERIFIED: tests/integration/cli-regression.test.ts]
- [ ] Replace outdated negative discovery tests for `~/.config/tilde` and `~/tilde.config.json`. [VERIFIED: tests/unit/config-discovery.test.ts]
- [ ] Add tests for source-specific `TILDE_CONFIG` wording. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | No auth flow is modified. [VERIFIED: codebase grep] |
| V3 Session Management | no | No sessions exist in this local CLI phase. [VERIFIED: .planning/codebase/ARCHITECTURE.md] |
| V4 Access Control | no | Local filesystem reads only; no multi-user backend access control is introduced. [VERIFIED: .planning/codebase/ARCHITECTURE.md] |
| V5 Input Validation | yes | Use source-aware path selection, `access()` for existence, and existing `loadConfig()` JSON/Zod validation. [VERIFIED: src/utils/config-discovery.ts] [VERIFIED: src/config/reader.ts] |
| V6 Cryptography | no | No crypto or secret resolution is added. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md] |

### Known Threat Patterns for TypeScript CLI Config Discovery

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Reading unexpected files through broad path traversal | Information Disclosure | Fixed path allowlist; no recursive crawling. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md] |
| Secret leakage from dotfile scanning | Information Disclosure | Do not parse or persist raw secret values; this phase should not scan rc contents. [VERIFIED: AGENTS.md] [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md] |
| Command injection through external commands | Tampering / Elevation | Keep `git` invocation through `execa('git', ['rev-parse', '--show-toplevel'])`; mock external command behavior in tests. [VERIFIED: src/utils/config-discovery.ts] [VERIFIED: AGENTS.md] |
| Misleading fallback after explicit config failure | Spoofing / Repudiation | Preserve source-specific errors and do not auto-discover after explicit missing paths. [VERIFIED: .planning/phases/05-config-discovery-polish/05-CONTEXT.md] |

## Sources

### Primary (HIGH confidence)

- `AGENTS.md` - runtime, safety, security, testability, and workflow constraints. [VERIFIED: AGENTS.md]
- `.planning/phases/05-config-discovery-polish/05-CONTEXT.md` - locked Phase 5 decisions and canonical refs. [VERIFIED: CONTEXT.md]
- `.planning/REQUIREMENTS.md` - CONF-01, CONF-02, CONF-03. [VERIFIED: REQUIREMENTS.md]
- `.planning/ROADMAP.md` - Phase 5 goal, success criteria, one-plan scope, and Phase 4 dependency. [VERIFIED: ROADMAP.md]
- `src/utils/config-discovery.ts` - current discovery paths, git-root detection, and no-config formatter. [VERIFIED: codebase grep]
- `src/index.tsx` - CLI arg parsing, subcommand dispatch, install/update discovery, startup config-first, and reconfigure routing. [VERIFIED: codebase grep]
- `src/config/reader.ts` - selected-file load, remote URL support, parse, migration, and schema validation. [VERIFIED: codebase grep]
- `tests/unit/config-discovery.test.ts` and `tests/integration/cli-regression.test.ts` - current test boundaries. [VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)

- `.planning/codebase/TESTING.md` - test organization and commands. [VERIFIED: .planning/codebase/TESTING.md]
- `.planning/codebase/CONCERNS.md` - startup/subcommand fragility and remote config caution. [VERIFIED: .planning/codebase/CONCERNS.md]
- `.planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md` - bounded scan and no secret persistence decisions. [VERIFIED: 03-CONTEXT.md]
- `.planning/phases/04-provenance-summary/04-01-SUMMARY.md` and `04-02-SUMMARY.md` - Phase 4 completed without new package dependencies and established shared summary boundaries. [VERIFIED: 04 summaries]

### Tertiary (LOW confidence)

- GSD research-store cache entries for local-code findings; classify-confidence returned LOW for provider `codebase`, so this file uses direct source tags instead of relying on cache confidence. [VERIFIED: gsd-tools]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - versions verified from `package-lock.json` and local commands; no new packages recommended. [VERIFIED: package-lock.json] [VERIFIED: local command]
- Architecture: HIGH - boundaries verified from source files and Phase 5 context. [VERIFIED: codebase grep] [VERIFIED: CONTEXT.md]
- Pitfalls: HIGH - current drift and outdated tests verified in source and tests. [VERIFIED: src/index.tsx] [VERIFIED: tests/unit/config-discovery.test.ts]

**Research date:** 2026-06-20
**Valid until:** 2026-07-20 for local codebase guidance; recheck if CLI dispatch or config discovery changes first. [ASSUMED]
