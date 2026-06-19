# Phase 03: Dotfiles Discovery Map - Research

**Researched:** 2026-06-19
**Domain:** TypeScript CLI filesystem discovery, metadata path matching, shell rc evidence parsing
**Confidence:** HIGH for codebase integration; MEDIUM for shell parsing heuristics

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use a hybrid map shape: canonical evidence-first findings internally, plus derived tool-grouped summaries for display and downstream summary rendering.
- **D-02:** Evidence records should preserve path, scan scope, matched metadata/tool id when available, match reason or confidence, finding type, and safe evidence details.
- **D-03:** A single file can contain mixed findings. File-level summaries should support a mixed known/unknown state, while nested findings carry exact known, unknown, or ambiguous classification.
- **D-04:** Unknown files and unknown rc-file findings should be reported separately from known tool-owned findings and should not be treated as errors.
- **D-05:** Parse only core shell setup constructs in this phase: aliases/function names, exported variable names, PATH edits, `source`/`.` statements, and known tool init hooks.
- **D-06:** Do not attempt deep shell interpretation, arbitrary script execution modeling, broad function-body parsing, or full conditional/control-flow analysis in Phase 3.
- **D-07:** Environment variables discovered in rc files should record names and value kinds only, such as literal, reference, or command-derived. Raw values must not be persisted by default.
- **D-08:** Secret-looking or sensitive values remain out of planning artifacts and scanner output. This preserves the project security rule that secrets stay as backend references and are not resolved or persisted.
- **D-09:** Use a combined bounded read-only scan: home shell rc files, metadata-declared `configPaths` and `dotfilePaths`, the configured `dotfilesRepo`, and shallow known config locations under configured workspace roots.
- **D-10:** Workspace scanning should be limited to root-level known files plus shallow allowlisted directories such as `.config/`, `.vscode/`, `.github/`, and tool-specific metadata paths.
- **D-11:** Workspace traversal must remain deterministic through explicit allowlists, low maximum depth, and safe failure behavior. Do not introduce broad recursive filesystem crawling.
- **D-12:** Missing paths, unreadable files, and parse failures should produce structured warnings or skipped findings rather than blocking the inventory or wizard flows.
- **D-13:** Phase 3 should expose a concise dotfile discovery summary in the existing inventory step rather than adding a new detailed command.
- **D-14:** Default terminal output should stay small: counts or short grouped lines for known mapped files, unknown files/findings, and warnings. Detailed audit data should remain available in structured report data for later phases.
- **D-15:** The summary should reuse the established `summarizeInventory`/inventory-step pattern where practical so wizard and config-first output do not drift.

### the agent's Discretion
- The exact TypeScript type names and module boundaries are planner/executor discretion, but new code should make the dotfile mapping boundary obvious and should fit naturally under the inventory or scanner architecture.
- The exact allowlist of workspace filenames and shallow directories is discretionary, as long as it is conservative, metadata-driven where possible, and covered by tests.
- The exact summary wording is discretionary, as long as it remains concise and terminal-scannable.

### Deferred Ideas (OUT OF SCOPE)
- Final provenance categories such as tilde-managed, manually installed, dependency, OS-provided, app-store/manual GUI install, and unknown remain Phase 4 work.
- A dedicated detailed dotfile inspection command or verbose output mode is out of scope for Phase 3 unless already required by the planner for testability.
- Broad recursive workspace crawling, full shell interpretation, and ecosystem-wide search remain out of scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOT-01 | tilde can map known dotfile paths to related tools using the shared metadata registry. | Use `getToolsByConfigPath()` and `getToolsByDotfilePath()` from `src/tools/registry.ts`; current tests prove exact and child-path matching. [VERIFIED: tests/unit/tool-metadata.test.ts] |
| DOT-02 | tilde can parse common shell rc files for aliases, environment variables, plugin references, and PATH modifications. | Extend or replace `parseZshrc()` with a safe evidence parser that records names/kinds, not raw env values. [VERIFIED: src/capture/parser.ts] |
| DOT-03 | tilde can look for tool config files in home and workspace context locations without mutating them. | Build on `scanInventory(homeDir)` and `InventoryEnvironmentSnapshot.homeDir`; use read-only `fs`/glob helpers and structured warnings. [VERIFIED: src/inventory/scan.ts] |
| DOT-04 | Dotfile discovery output identifies unknown files separately from known tool-owned files. | The report should separate known matched findings from unknown file/finding buckets, matching D-04 and Phase 2's separate unmatched audit pattern. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md] |
</phase_requirements>

## Summary

Phase 3 should add a `dotfiles` or `dotfileMap` section to the existing `InventoryReport` instead of creating a separate command or parallel scanner surface. App startup already owns inventory scanning and passes `InventoryScanState` into wizard and config-first flows; UI components are report-driven and should remain command-free. [VERIFIED: src/app.tsx] [VERIFIED: src/steps/inventory.tsx] [VERIFIED: src/modes/config-first.tsx]

The implementation should be evidence-first. File summaries should describe scanned path, scope, matched tool ids, known/unknown/mixed state, warnings, and nested findings. Rc parsing should emit safe structured facts for alias names, function names, exported variable names and value kind, PATH edit kind, sourced path, and known init-hook matches. Raw env values should not be stored. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md] [VERIFIED: AGENTS.md]

**Primary recommendation:** Add a pure `src/inventory/dotfiles.ts` mapper plus report/summary integration in `src/inventory/report.ts`, `src/inventory/scan.ts`, and `src/inventory/summary.ts`; keep workspace scans bounded and test with temp directories and mocked registry metadata. [VERIFIED: src/inventory/scan.ts] [VERIFIED: tests/unit/inventory-scanner.test.ts]

## Project Constraints (from AGENTS.md)

- Runtime is Node.js >=20, TypeScript NodeNext, ESM-only, with `.js` import extensions in TypeScript source. [VERIFIED: AGENTS.md]
- UI is Ink/React terminal UI; default output must remain concise and work in terminal workflows. [VERIFIED: AGENTS.md]
- Platform target is macOS-first. [VERIFIED: AGENTS.md]
- Discovery must be non-destructive by default and should read/report before writing or deleting. [VERIFIED: AGENTS.md]
- Do not resolve or persist raw secrets; environment variables and secret references remain backend references. [VERIFIED: AGENTS.md]
- External commands such as `brew`, `gh`, `op`, `vfox`, and `defaultbrowser` must be mocked in automated tests. [VERIFIED: AGENTS.md]
- Source uses two-space indentation, single quotes, semicolons, strict TypeScript, and relative imports without path aliases. [VERIFIED: AGENTS.md]
- GSD workflow says not to make repo edits outside GSD entry points; this research artifact is produced by the GSD research workflow. [VERIFIED: AGENTS.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Metadata path discovery | CLI application source | Test suite | Registry helpers are pure source functions; scanner should consume them without UI ownership. [VERIFIED: src/tools/registry.ts] |
| Home and dotfiles repo scanning | CLI application source | Local filesystem | Existing inventory scanner owns read-only local scanning and warning conversion. [VERIFIED: src/inventory/scan.ts] |
| Workspace config scanning | CLI application source | Local filesystem | Config has `workspaceRoot`, contexts, and `dotfilesRepo`; scanner should read bounded paths only. [VERIFIED: src/config/schema.ts] |
| Rc parsing | CLI application source | Test suite | Existing parser is pure and already used by wizard defaults; Phase 3 should keep parsing testable and side-effect free. [VERIFIED: src/capture/parser.ts] |
| Concise output | Ink UI | Inventory summary helper | Wizard and config-first both render `summarizeInventory()`, preventing wording drift. [VERIFIED: src/inventory/summary.ts] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `fs/promises` | Node >=20 | Read files, check paths, handle read errors. | Existing scanner already uses `access` for read-only evidence and converts failures to warnings. [VERIFIED: package.json] [VERIFIED: src/inventory/scan.ts] |
| `fast-glob` | 3.3.3 | Bounded file discovery for home/workspace paths. | Already installed and used by `scanDotfiles()` with `onlyFiles`, `deep`, and `dot`. [VERIFIED: npm ls] [VERIFIED: src/capture/scanner.ts] |
| `ignore` | 7.0.5 | Filter secret-like dotfiles before reading. | Existing `createCaptureFilter()` uses `ignore` with project secret patterns. [VERIFIED: npm ls] [VERIFIED: src/capture/filter.ts] |
| Zod | 4.3.6 | Validate metadata and, if needed, structured report fixtures. | Metadata registry already uses Zod schemas and inferred types. [VERIFIED: npm ls] [VERIFIED: src/tools/metadata.ts] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.2 | Unit/integration tests for scanners and Ink output. | Use for temp-dir scanner tests and inventory summary regression tests. [VERIFIED: npm ls] |
| Ink / React | Ink 6.8.0 / React 19.2.4 | Terminal UI rendering. | Only for existing inventory/config-first surfaces; scanner code should not import Ink. [VERIFIED: npm ls] [VERIFIED: src/steps/inventory.tsx] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing `fast-glob` | Hand-written recursive `readdir` | Avoid: phase explicitly forbids broad crawling; existing glob helper already supports bounded depth. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md] |
| Safe regex/token parser | Full shell AST/interpreter | Avoid: locked decision D-06 excludes deep shell interpretation. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md] |
| Existing `summarizeInventory()` | New verbose command | Avoid: D-13/D-15 require existing inventory summary surface by default. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md] |

**Installation:**
```bash
# No new package install is recommended for Phase 3.
```

**Version verification:** `npm ls fast-glob ignore zod vitest ink react --depth=0` reported installed versions above. `npm view fast-glob` and `npm view ignore` confirmed current latest versions 3.3.3 and 7.0.5; broader registry lookups were intentionally stopped after the orchestration timeout. [VERIFIED: npm registry] [VERIFIED: npm ls]

## Package Legitimacy Audit

No external packages should be installed for Phase 3. Existing dependencies are already in `package.json` and `package-lock.json`; the planner should not add an install task unless a later implementation gap proves unavoidable. [VERIFIED: package.json]

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| none | npm | — | — | — | — | No install recommended |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none for new installs

## Architecture Patterns

### System Architecture Diagram

```text
App startup
  -> scanInventory(homeDir?)
      -> existing Homebrew/app/shell/core inventory scan
      -> dotfile map scan
          -> home rc-file candidates + metadata paths + dotfilesRepo + workspace allowlist
          -> read files safely / skip missing or unreadable paths
          -> registry path matching via getToolsByConfigPath/getToolsByDotfilePath
          -> rc evidence parser for aliases, functions, exports, PATH edits, source lines, init hooks
          -> known findings + unknown findings + warnings
      -> InventoryReport with dotfileMap
  -> InventoryScanState
      -> InventoryStep summary
      -> ConfigFirstMode summary
      -> Phase 4 provenance consumes structured evidence later
```

### Recommended Project Structure

```text
src/inventory/
├── dotfiles.ts       # pure-ish dotfile path mapper, rc parser, scan orchestration helpers
├── report.ts         # DotfileMap report types added to InventoryReport
├── scan.ts           # calls dotfile scan and attaches warnings
└── summary.ts        # concise dotfile summary lines

tests/unit/
├── inventory-dotfiles.test.ts
└── inventory-scanner.test.ts

tests/integration/
├── wizard-flow.test.tsx
└── config-first.test.ts
```

### Pattern 1: Evidence-First File and Finding Shape

**What:** Use file-level records with nested findings so one rc file can be mixed. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md]

**When to use:** Every scanned file, including unknown files and rc files with both known hooks and unknown aliases. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md]

**Example:**
```typescript
export type DotfileFindingKind =
  | 'metadata-path'
  | 'alias'
  | 'function'
  | 'export'
  | 'path-edit'
  | 'source'
  | 'tool-init-hook'
  | 'unknown';

export interface DotfileFinding {
  kind: DotfileFindingKind;
  classification: 'known' | 'unknown' | 'ambiguous';
  toolIds: string[];
  safeDetails: Record<string, string | string[] | boolean>;
  reason: string;
}
```

### Pattern 2: Bounded Path Candidate Generation

**What:** Generate candidates from metadata paths, fixed rc filenames, configured `dotfilesRepo`, and shallow workspace allowlists. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md]

**When to use:** DOT-01 and DOT-03 scanning. [VERIFIED: .planning/REQUIREMENTS.md]

**Example:**
```typescript
const WORKSPACE_ALLOWLIST = [
  '.config',
  '.vscode',
  '.github',
  'package.json',
  'tsconfig.json',
] as const;
```

### Pattern 3: Safe Rc Value Classification

**What:** For `export NAME=value`, store `NAME` and a value kind such as `literal`, `reference`, `command-derived`, or `secret-like`, not the raw value. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md]

**When to use:** All rc parsing. [VERIFIED: AGENTS.md]

**Example:**
```typescript
function classifyEnvValue(raw: string): 'literal' | 'reference' | 'command-derived' | 'secret-like' {
  if (/^(ghp_|sk-|AKIA|xox[bp]-|op:\/\/)/.test(raw)) return 'secret-like';
  if (/\$\(|`/.test(raw)) return 'command-derived';
  if (/\$[A-Za-z_][A-Za-z0-9_]*|\$\{[^}]+}/.test(raw)) return 'reference';
  return 'literal';
}
```

### Anti-Patterns to Avoid

- **Putting scanner logic in Ink components:** `InventoryStep` currently renders supplied report data only; keep it that way. [VERIFIED: src/steps/inventory.tsx]
- **Persisting env var values:** Existing `parseZshrc()` stores non-secret export values; Phase 3 must not repeat that for scanner output. [VERIFIED: src/capture/parser.ts] [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md]
- **Broad recursive workspace crawling:** D-10/D-11 explicitly require shallow allowlists and deterministic traversal. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md]
- **Treating unknown files as failures:** Unknown files/findings are normal evidence and must be reported separately. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Metadata matching | Per-tool path switch statements | `getToolsByConfigPath()` / `getToolsByDotfilePath()` | Existing pure helpers already cover exact and child paths. [VERIFIED: src/tools/registry.ts] |
| Secret filtering | New scattered regexes only | Existing `defaultSecretPatterns` plus value-kind classification | Current capture filter already centralizes secret-pattern filtering for dotfiles. [VERIFIED: src/capture/filter.ts] |
| UI summary formatting | Separate wizard/config-first text | `summarizeInventory()` | Phase 2 centralized summary output to avoid drift. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-05-SUMMARY.md] |
| Shell execution model | Shell interpreter or AST execution | Bounded line parser | D-06 excludes arbitrary execution and full control-flow analysis. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md] |

**Key insight:** This phase is a discovery evidence layer, not a shell runtime or final provenance classifier. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md]

## Common Pitfalls

### Pitfall 1: Registry Metadata Is Too Sparse
**What goes wrong:** DOT-01 appears implemented but maps very few files because current metadata only includes config/dotfile paths for Neovim, Zed, and Obsidian. [VERIFIED: src/plugins/first-party/neovim/metadata.ts] [VERIFIED: src/plugins/first-party/zed/metadata.ts] [VERIFIED: src/tools/note-taking-metadata.ts]
**How to avoid:** Plan metadata additions for existing first-party tools where known config paths are in scope, then test lookups. [VERIFIED: tests/unit/tool-metadata.test.ts]

### Pitfall 2: Secret Values Leak Through Rc Parsing
**What goes wrong:** The existing parser stores export values unless they match a prefix denylist. [VERIFIED: src/capture/parser.ts]
**How to avoid:** Store variable names and value kinds only; add tests for `GH_TOKEN`, `op://`, command substitution, and `$PATH` references. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md]

### Pitfall 3: Workspace Scan Becomes Unbounded
**What goes wrong:** A recursive glob over `workspaceRoot` can scan large repos, dependency folders, or secret files. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md]
**How to avoid:** Use allowlisted root files/directories, low `deep`, `onlyFiles: true`, and skipped/warning findings. [VERIFIED: src/capture/scanner.ts]

### Pitfall 4: Summary Overwhelms the Terminal
**What goes wrong:** Every finding is dumped into Ink output. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md]
**How to avoid:** Add only count/group lines to `summarizeInventory()`; keep detailed findings in `InventoryReport`. [VERIFIED: src/inventory/summary.ts]

## Code Examples

### Registry Path Matching
```typescript
const configMatches = getToolsByConfigPath(candidate.tildePath);
const dotfileMatches = getToolsByDotfilePath(candidate.tildePath);
const toolIds = [...new Set([...configMatches, ...dotfileMatches].map(tool => tool.id))];
```

### Warning Instead of Throwing
```typescript
try {
  const content = await readFile(path, 'utf-8');
  return parseDotfileContent(path, content);
} catch {
  warnings.push({
    id: `dotfiles:unreadable:${path}`,
    source: 'dotfiles',
    severity: 'warning',
    message: `Dotfile ${path} could not be read; discovery skipped it.`,
  });
  return undefined;
}
```

### Summary Lines
```typescript
if (report.dotfiles) {
  lines.push(`Dotfiles: ${report.dotfiles.knownFilesCount} known, ${report.dotfiles.unknownFilesCount} unknown`);
  if (report.dotfiles.unknownFindingsCount > 0) {
    lines.push(`Dotfile findings: ${report.dotfiles.unknownFindingsCount} unknown`);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `EnvironmentCaptureReport` as primary scanner boundary | `InventoryReport` and `InventoryScanState` | Phase 2 | Phase 3 should extend inventory, not revive environment capture as the main API. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-03-SUMMARY.md] |
| Parser stores non-secret export values | Parser should store env name and value kind only | Phase 3 decision | Prevents secret leakage and aligns with AGENTS security constraints. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md] |
| Dotfiles scanned as raw path list | Dotfiles map should classify known, unknown, and mixed findings | Phase 3 decision | Enables Phase 4 provenance without final labels. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md] |

**Deprecated/outdated:**
- Keeping `src/capture/scanner.ts` as the primary scanner boundary is outdated after Phase 2; use it only as a helper/reference. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Known tool init hooks can start with a small curated set such as `direnv hook`, `vfox activate`, and editor/tool-specific source lines. [ASSUMED] | Architecture Patterns | Planner may need user confirmation or codebase-specific hook list before implementation. |
| A2 | Workspace root scan should include common root files like `package.json` and `tsconfig.json` only if mapped through metadata or clearly useful for context. [ASSUMED] | Architecture Patterns | Planner could over-scan unless it keeps the allowlist conservative. |

## Open Questions (RESOLVED)

1. **Should `dotfileMap` live directly on `InventoryReport` or under `environment`?**
   - What we know: `InventoryReport` already separates tools, Homebrew audit, warnings, and environment snapshot. [VERIFIED: src/inventory/report.ts]
   - RESOLVED: Store the map as a top-level `InventoryReport.dotfiles` field, with implementation names using `dotfiles`/`DotfileMap` rather than nesting it under `environment`.
   - Recommendation: Use a top-level `dotfiles` section because it is not just environment defaults; it is provenance evidence. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md]

2. **Which metadata rows should gain config paths in Plan 03-01?**
   - What we know: Current paths are sparse. [VERIFIED: src/plugins/first-party/neovim/metadata.ts] [VERIFIED: src/plugins/first-party/zed/metadata.ts] [VERIFIED: src/tools/note-taking-metadata.ts]
   - RESOLVED: No additional metadata rows are required to gain config paths in Plan 03-01. The path-mapping slice should consume and test the repo-backed rows already verified locally: `neovim.configPaths = ['~/.config/nvim']`, `zed.configPaths = ['~/.config/zed']`, `obsidian.configPaths = ['~/Library/Application Support/obsidian']`, and `obsidian.dotfilePaths = ['~/.obsidian']`. Do not add speculative paths for VS Code, Cursor, browsers, JetBrains, Notion, Bear, vfox, or Homebrew in Phase 3 unless implementation finds repo-local evidence and adds paired metadata tests in the same change.
   - Recommendation: Only add paths already known from code/docs or covered by tests; do not invent broad rows. [VERIFIED: AGENTS.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Build/test/runtime | yes | >=20 required by `package.json` | none |
| npm | Scripts and installed dependency checks | yes | package-lock present | none |
| `fast-glob` | File scanning | yes | 3.3.3 | Node `fs.readdir` only for fixed candidate lists |
| `ignore` | Secret/dotfile filtering | yes | 7.0.5 | Existing `defaultSecretPatterns` direct matching |
| Vitest | Validation | yes | 4.1.2 | none |

**Missing dependencies with no fallback:** none identified.

**Missing dependencies with fallback:** none for planned implementation.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts`, `vitest.integration.config.ts`, `vitest.contract.config.ts` |
| Quick run command | `npm run test -- tests/unit/inventory-dotfiles.test.ts tests/unit/inventory-scanner.test.ts` |
| Full suite command | `npm run lint && npm run build && npm test && npm run test:integration` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| DOT-01 | Metadata-declared config/dotfile paths map to tool ids. | unit | `npm run test -- tests/unit/tool-metadata.test.ts tests/unit/inventory-dotfiles.test.ts` | partial; Wave 0 for new file |
| DOT-02 | Rc parser emits aliases, function names, env var names/value kinds, PATH edits, source lines, and known hooks without raw secret values. | unit | `npm run test -- tests/unit/inventory-dotfiles.test.ts` | no; Wave 0 |
| DOT-03 | Home, dotfiles repo, and shallow workspace paths are scanned read-only with skipped/warning findings. | unit | `npm run test -- tests/unit/inventory-dotfiles.test.ts tests/unit/inventory-scanner.test.ts` | no; Wave 0 |
| DOT-04 | Unknown files/findings are separated from known tool-owned findings and not errors. | unit/integration | `npm run test -- tests/unit/inventory-dotfiles.test.ts tests/integration/wizard-flow.test.tsx -t inventory` | partial; Wave 0 for unit |

### Sampling Rate

- **Per task commit:** targeted unit or integration command for touched area.
- **Per wave merge:** `npm run lint && npm run build && npm test`.
- **Phase gate:** `npm run lint && npm run build && npm test && npm run test:integration`.

### Wave 0 Gaps

- [ ] `tests/unit/inventory-dotfiles.test.ts` - covers DOT-01, DOT-02, DOT-03, DOT-04.
- [ ] Extend `tests/unit/inventory-scanner.test.ts` - proves `scanInventory()` attaches dotfile map and warning data.
- [ ] Extend `tests/integration/wizard-flow.test.tsx` and `tests/integration/config-first.test.ts` - proves concise dotfile summary appears in both inventory surfaces.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | No auth boundary in this phase. [VERIFIED: .planning/ROADMAP.md] |
| V3 Session Management | no | No session state in this CLI phase. [VERIFIED: .planning/codebase/ARCHITECTURE.md] |
| V4 Access Control | no | Local CLI read-only scan; no user/role model. [VERIFIED: .planning/codebase/ARCHITECTURE.md] |
| V5 Input Validation | yes | Validate metadata with Zod and normalize bounded paths before matching. [VERIFIED: src/tools/metadata.ts] |
| V6 Cryptography | no | Do not implement crypto; do not resolve secrets. [VERIFIED: AGENTS.md] |

### Known Threat Patterns for Local Dotfile Scanning

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret disclosure from `.env` or rc exports | Information Disclosure | Filter secret dotfiles and store env names/value kinds only. [VERIFIED: src/capture/filter.ts] [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md] |
| Symlink or broad traversal causing unexpected reads | Information Disclosure | Use explicit candidate paths, shallow allowlists, low depth, and skipped findings. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md] |
| Parse failure blocking setup | Denial of Service | Convert missing/unreadable/parse failures into warnings. [VERIFIED: src/inventory/scan.ts] |
| Shell command execution during parsing | Elevation of Privilege | Never execute rc content; parse text only. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md] |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md` - locked Phase 3 decisions.
- `.planning/REQUIREMENTS.md` - DOT-01 through DOT-04 requirements.
- `.planning/ROADMAP.md` - Phase 3 goal, success criteria, and plan slices.
- `.planning/STATE.md` - Phase 2 decisions and current project history.
- `.planning/phases/02-machine-inventory-scanner/*-SUMMARY.md` - implemented inventory seams.
- `AGENTS.md` - project constraints.
- `src/tools/metadata.ts`, `src/tools/registry.ts` - metadata schema and path helpers.
- `src/inventory/report.ts`, `src/inventory/scan.ts`, `src/inventory/summary.ts` - inventory report, scanner, summary seams.
- `src/capture/scanner.ts`, `src/capture/parser.ts`, `src/capture/filter.ts` - prior dotfile and rc scan helpers.
- `tests/unit/tool-metadata.test.ts`, `tests/unit/inventory-scanner.test.ts`, `tests/integration/wizard-flow.test.tsx`, `tests/integration/config-first.test.ts` - existing validation patterns.

### Secondary (MEDIUM confidence)
- `npm ls` and selected `npm view` checks - existing package versions and `fast-glob`/`ignore` current versions.

### Tertiary (LOW confidence)
- Small initial known-hook list for shell rc parsing; planner should keep this conservative or require user confirmation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing package versions and code usage verified locally.
- Architecture: HIGH - Phase 2 implementation summaries and source code define the integration seam.
- Pitfalls: HIGH for codebase/security pitfalls; MEDIUM for shell-hook coverage.

**Research date:** 2026-06-19
**Valid until:** 2026-07-19 for codebase patterns; shell hook assumptions should be revisited during planning.
