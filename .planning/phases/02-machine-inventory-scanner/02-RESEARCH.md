# Phase 02: machine-inventory-scanner - Research

**Researched:** 2026-06-13
**Domain:** TypeScript machine inventory scanner, Homebrew request-state classification, Ink startup integration, Vitest coverage
**Confidence:** HIGH for codebase architecture; MEDIUM for Homebrew command semantics

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
## Implementation Decisions

### Inventory Fact Shape
- **D-01:** Inventory facts should be evidence-backed, not just boolean installed flags. Each known-tool fact should include enough evidence to explain why the tool was detected, such as matched package id, app path, command result source, or inconclusive detection reason.
- **D-02:** Phase 2 should not fully model final provenance categories. Rich user-facing labels such as tilde-managed, manual, OS-provided, and unknown remain primarily Phase 4 work.
- **D-03:** Tool records may carry an `unknown` or inconclusive state when detection for that tool fails. The overall inventory report should also include report-level warnings for missing or failed external commands.
- **D-04:** Registry-known tools should be returned as structured inventory facts. Installed Homebrew packages that do not match registry metadata should be kept in a separate `unmatchedHomebrew` audit section.
- **D-05:** Inventory should prefer registry categories where available, but Phase 2 may define a small scanner-owned category set for `shell` and `core-tool` if metadata categories do not yet cover `INV-01`.

### Scanner Ownership and Startup Flow
- **D-06:** Add a dedicated `src/inventory/` area. Inventory owns the report shape, registry-aligned scanning flow, and tests, while reusing capture or package-manager helpers where useful.
- **D-07:** Run inventory during app splash/startup before wizard steps so the report is available broadly to wizard flows.
- **D-08:** Treat inventory as the new umbrella scanner rather than keeping `EnvironmentCaptureReport` as the long-term boundary.
- **D-09:** Phase 2 should do a full rename/refactor to move wizard usage to inventory terminology throughout, not only an internal delegation layer.

### Homebrew Classification Behavior
- **D-10:** Classify all installed Homebrew formulae as direct or dependency when request data is available, not only formulae known to the registry.
- **D-11:** Known formulae should feed structured inventory facts. Unmatched formulae should still receive direct/dependency classification in the `unmatchedHomebrew` audit section.
- **D-12:** Installed casks should be treated as direct by default unless Phase 2 has evidence to the contrary.
- **D-13:** If `brew list --installed-on-request` fails but installed package listing succeeds, keep installed Homebrew facts and mark request classification as unknown. Add a report-level warning explaining that direct/dependency status is unavailable.
- **D-14:** Extend `src/utils/package-manager.ts` with Homebrew command helpers for installed formulae, installed casks, and installed-on-request formulae. `src/inventory/` should interpret those helper results into `InventoryReport`.

### Wizard and Config-First Integration
- **D-15:** Phase 2's visible proof should be summary-level integration. Existing step-level preselection can remain mostly unchanged unless a small pre-highlight naturally falls out of the inventory refactor.
- **D-16:** The concise inventory summary should live in the existing early capture step after it is renamed/refactored to inventory.
- **D-17:** The default terminal display should be a grouped short list: known installed tools, Homebrew direct/dependency counts, and warnings. Full unmatched/audit detail should remain in data for later or optional output, not the default wizard view.
- **D-18:** Config-first paths should render a concise inventory summary before apply confirmation so non-interactive/config-driven users can see what is already installed before tilde changes anything.

### the agent's Discretion
- The exact TypeScript type names are flexible, but they should make the new inventory boundary obvious and avoid preserving environment-capture terminology as the primary API.
- The exact summary wording and grouping are planner/executor discretion, as long as the default remains concise and terminal-scannable.
- The exact shape of scanner-owned `shell` and `core-tool` categories is discretionary, but it should stay small and not become a broad replacement for metadata categories.

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

- Full provenance labeling, including tilde-managed, manual, OS-provided, app-store/manual GUI install, and unknown categories, remains Phase 4.
- Full unmatched ecosystem search/wrapper behavior remains out of scope for v1 inventory and belongs to the deferred wrapper/search work.
- Deep per-step UI rewrites beyond summary-level integration are not required for Phase 2 unless they naturally follow from the inventory refactor.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INV-01 | tilde can detect already-installed package managers, version managers, shells, editors, and core tools before wizard interaction. | Build a startup `InventoryReport` in `src/inventory/` using metadata registry facts, Homebrew lists, app-path checks, shell/process data, and current version-manager detection helpers. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: codebase grep] |
| INV-02 | tilde can distinguish direct Homebrew installs from dependency installs using `brew list --installed-on-request`. | Add `listInstalledOnRequestFormulae()` to `src/utils/package-manager.ts` and classify installed formulae by membership in that returned set; keep classification `unknown` when only the request-state command fails. [VERIFIED: .planning/REQUIREMENTS.md] [CITED: https://docs.brew.sh/Manpage] |
| INV-03 | Wizard or summary output can pre-highlight tools that are already installed. | Render a concise inventory summary in the renamed early inventory step and before `ConfigSummary` confirmation in config-first mode; optional per-step preselection can remain limited. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md] [VERIFIED: codebase grep] |
| INV-04 | Inventory scans fail softly when an external command is missing, slow, or unavailable. | Inventory should collect warning records and per-tool inconclusive states instead of throwing through `App`, `Wizard`, or `ConfigFirstMode`; tests must mock command/file boundaries. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: AGENTS.md] [VERIFIED: codebase grep] |
</phase_requirements>

## Summary

Phase 2 should replace the legacy environment-capture boundary with a new `src/inventory/` report boundary while preserving useful scan pieces from `src/capture/scanner.ts`, `src/capture/filter.ts`, and `src/utils/env-detection.ts`. The current scanner returns dotfiles, flat `brewPackages`, rc files, languages, and version managers, but it has no evidence model, warning model, known/unmatched split, or Homebrew direct/dependency classification. [VERIFIED: src/capture/scanner.ts] [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]

The planner should split work along the roadmap slices: plan 02-01 creates the typed inventory report and registry-aligned known-tool facts; plan 02-02 adds Homebrew request-state classification plus wizard/config-first summary integration. This keeps Phase 4 provenance labels out of scope while still producing evidence that Phase 4 can use later. [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]

Homebrew's official manpage documents `brew list` formula/cask/full-name options and documents installed-on-request tab state as the state that controls whether installed formulae/casks should be protected from `brew autoremove`; Phase 2 should treat formula directness as "installed formula appears in `brew list --installed-on-request`" and dependencies as installed formulae absent from that set when the request-state command succeeds. [CITED: https://docs.brew.sh/Manpage]

**Primary recommendation:** Define `InventoryReport` in `src/inventory/`, run it once during interactive app startup, pass it into wizard/config-first flows, and make all command failures data in the report rather than render-time crashes. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md] [VERIFIED: src/app.tsx]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Inventory report shape | CLI application source | Tests | `src/inventory/` should own structured facts, unmatched Homebrew audit data, and warnings. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md] |
| Metadata matching | CLI application source | Registry module | `src/tools/registry.ts` already exposes pure category, platform, Homebrew, path, variant, source, and search helpers for metadata lookup. [VERIFIED: src/tools/registry.ts] |
| External command execution | Utility layer | Inventory scanner | `src/utils/package-manager.ts` already wraps Homebrew list/install checks; Phase 2 should extend it and let inventory interpret results. [VERIFIED: src/utils/package-manager.ts] |
| Startup scan orchestration | Ink app shell | Inventory scanner | `src/app.tsx` already runs startup environment capture for interactive modes and catches failures; inventory should follow that broad flow before wizard/config-first rendering. [VERIFIED: src/app.tsx] |
| Wizard summary | Ink UI step | Inventory report | The existing step at index 1 is the early capture surface and should become the concise inventory summary. [VERIFIED: src/modes/wizard.tsx] [VERIFIED: src/steps/env-capture.tsx] |
| Config-first summary | Ink config-first mode | Inventory report | `ConfigFirstMode` renders `ConfigSummary` before apply confirmation; inventory summary should render before or adjacent to that confirmation. [VERIFIED: src/modes/config-first.tsx] |
| Full provenance labels | Deferred Phase 4 | Inventory evidence | Phase 2 should capture evidence and coarse Homebrew request status without final provenance categories. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md] |

## Project Constraints (from AGENTS.md)

- Runtime is Node.js >=20, TypeScript NodeNext, and ESM; new local TypeScript imports must use `.js` extensions. [VERIFIED: AGENTS.md]
- UI is Ink/React terminal UI; inventory output must fit terminal workflows and support non-interactive/config-first paths where relevant. [VERIFIED: AGENTS.md]
- Platform target is macOS-first; Homebrew, app bundles, shell rc files, and dotfiles discovery should target macOS before cross-platform expansion. [VERIFIED: AGENTS.md]
- Discovery must be non-destructive by default; scanner work should read/report before writing or deleting anything. [VERIFIED: AGENTS.md]
- Raw secrets must not be resolved or persisted; env vars and secret references remain backend references. [VERIFIED: AGENTS.md]
- External commands such as `brew`, `gh`, `op`, `vfox`, and `defaultbrowser` must be mocked in automated tests. [VERIFIED: AGENTS.md]
- Source style is two-space indentation, single quotes, semicolons, strict TypeScript, and relative imports without path aliases. [VERIFIED: AGENTS.md]
- Keep schema changes, migrations, docs, and tests together when schema behavior changes. [VERIFIED: AGENTS.md]
- Use existing plugin interfaces and utility boundaries instead of hardcoding new integrations inside wizard steps. [VERIFIED: AGENTS.md]
- GSD workflow instructions say not to make direct repo edits outside a GSD workflow; this file is itself the requested GSD research artifact. [VERIFIED: AGENTS.md]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.4.5 locked | Typed inventory report, discriminated unions, and scanner helper contracts | Project source is TypeScript ESM with strict mode and NodeNext imports. [VERIFIED: package-lock.json] [VERIFIED: AGENTS.md] |
| Node.js | >=20 required; v22.22.2 local | Runtime, filesystem reads, process/env/shell detection | Project engines require Node >=20 and local runtime is Node 22. [VERIFIED: package.json] [VERIFIED: environment probe] |
| Ink / React | Ink 6.8.0, React 19.2.4 locked | Terminal UI for inventory summary and config-first confirmation | Existing wizard and config-first flows are Ink components. [VERIFIED: package-lock.json] [VERIFIED: src/app.tsx] |
| execa | 9.6.1 locked | Existing external command execution in package-manager and environment utilities | `src/utils/package-manager.ts` and `src/utils/environment.ts` already use execa; inventory should not add a new process runner. [VERIFIED: package-lock.json] [VERIFIED: codebase grep] |
| Vitest | 4.1.2 locked | Scanner, package-manager, and Ink component tests | Unit, integration, and contract configs already use Vitest. [VERIFIED: package-lock.json] [VERIFIED: vitest.config.ts] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fast-glob | 3.3.3 locked | Existing dotfile globbing in legacy scanner | Reuse only if inventory keeps dotfile count/rc support in the early summary; Phase 3 owns deeper dotfile mapping. [VERIFIED: package-lock.json] [VERIFIED: src/capture/scanner.ts] |
| ink-testing-library | 4.0.0 locked | Render Ink steps and drive stdin in tests | Use for renamed inventory step and config-first summary assertions. [VERIFIED: package-lock.json] [VERIFIED: tests/integration/wizard-flow.test.tsx] |
| Zod | 4.3.6 locked | Existing config and metadata validation | No new inventory schema package is needed; use TypeScript types unless runtime validation is added for serialized inventory. [VERIFIED: package-lock.json] [VERIFIED: src/tools/metadata.ts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New process runner | Existing `run()` or `runBrew()` helpers | Existing helpers are already test-mocked; adding a new command wrapper would widen mocking burden. [VERIFIED: src/utils/exec.ts] [VERIFIED: src/utils/package-manager.ts] |
| PluginRegistry-driven inventory | Metadata registry plus scanner helpers | Phase 1 explicitly deferred PluginRegistry consolidation, and newer categories are unevenly registered. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md] [VERIFIED: src/plugins/api.ts] |
| Per-step detection only | Startup `InventoryReport` passed down | Per-step detection exists today but duplicates command/filesystem reads and cannot produce one report-level warning summary. [VERIFIED: src/steps/tools.tsx] [VERIFIED: src/steps/browser.tsx] [VERIFIED: src/steps/ai-tools.tsx] |
| Final provenance categories now | Evidence plus Homebrew request classification | User decisions reserve rich provenance labels for Phase 4. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md] |

**Installation:**

```bash
# No new package installation is recommended for Phase 2.
```

**Version verification:** Existing stack versions were verified from `package.json`, `package-lock.json`, and local `node`/`npm`/`brew` probes. No npm registry version lookup is required because Phase 2 should not install new packages. [VERIFIED: package.json] [VERIFIED: package-lock.json] [VERIFIED: environment probe]

## Package Legitimacy Audit

Phase 2 should not install external packages. The package-legitimacy gate is therefore not required for planner install tasks. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md] [VERIFIED: package.json]

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| none | npm | n/a | n/a | n/a | n/a | No new package install recommended. [VERIFIED: package.json] |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: package.json]
**Packages flagged as suspicious [SUS]:** none. [VERIFIED: package.json]

## Architecture Patterns

### System Architecture Diagram

```text
App startup (interactive modes)
  |
  v
src/inventory/scan.ts
  |-- read metadata from src/tools/registry.ts
  |-- read app paths with fs access
  |-- read shell/process facts
  |-- call package-manager helpers:
  |     brew list --formula --full-name
  |     brew list --cask --full-name
  |     brew list --installed-on-request
  |-- reuse existing language/version-manager detection where useful
  |
  v
InventoryReport
  |-- tools[]: registry-known evidence-backed facts
  |-- unmatchedHomebrew.formulae[]: installed but not metadata-matched
  |-- unmatchedHomebrew.casks[]: installed but not metadata-matched
  |-- homebrew.summary: direct/dependency/unknown counts
  |-- warnings[]: missing/failed/slow command warnings
  |
  +-------------------------------+
  |                               |
  v                               v
Wizard inventory summary       Config-first confirm screen
renamed early step             summary before apply
  |
  v
Later Phase 4 provenance can derive labels from evidence without rescanning
```

### Recommended Project Structure

```text
src/
├── inventory/
│   ├── report.ts          # InventoryReport, InventoryToolFact, warning/evidence types
│   ├── scan.ts            # orchestrates registry, Homebrew, app-path, shell/core scans
│   ├── homebrew.ts        # interprets installed/requested formulae into classifications
│   └── summary.ts         # pure summary lines/counts for Ink rendering
├── steps/
│   └── inventory.tsx      # renamed/refactored env-capture summary step
├── utils/
│   └── package-manager.ts # add listInstalledOnRequestFormulae()
└── modes/
    ├── wizard.tsx         # consumes InventoryReport, not EnvironmentCaptureReport
    └── config-first.tsx   # renders concise inventory summary before apply confirmation
```

Keep `src/capture/parser.ts` and `src/capture/filter.ts` if the early summary still needs rc-file/gitconfig parsing; rename only when the planner includes tests for the usage points. [VERIFIED: tests/integration/env-capture.test.ts] [ASSUMED]

### Pattern 1: Evidence-Backed Tool Facts

**What:** A known-tool inventory fact should represent a metadata row plus detection state, evidence, and optional warning ids. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]
**When to use:** Use for registry-known package managers, version managers, browsers/editors/note-taking tools, shell/core-tool scanner-owned facts, and any metadata row with a Homebrew id or app path. [VERIFIED: src/tools/metadata.ts] [VERIFIED: src/tools/registry.ts]
**Example:**

```typescript
// Source: Phase 2 D-01/D-03 and existing ToolMetadata fields.
export type InventoryInstallState = 'installed' | 'missing' | 'unknown';

export type InventoryEvidence =
  | { type: 'homebrew-formula'; id: string; requestStatus: 'direct' | 'dependency' | 'unknown' }
  | { type: 'homebrew-cask'; id: string; requestStatus: 'direct' | 'unknown' }
  | { type: 'app-path'; path: string; exists: boolean }
  | { type: 'command'; command: string; outcome: 'succeeded' | 'failed' | 'timeout' }
  | { type: 'shell'; name: string; source: 'process-env' | 'rc-file' };

export interface InventoryToolFact {
  toolId: string;
  label: string;
  category: string;
  installed: InventoryInstallState;
  evidence: InventoryEvidence[];
  warningIds: string[];
}
```

### Pattern 2: Homebrew Classification as Report Data

**What:** Classify all installed formulae as direct/dependency/unknown after collecting both installed formulae and request-state formulae. [CITED: https://docs.brew.sh/Manpage]
**When to use:** Use only after `listInstalledFormulae()` succeeds; if installed formulae succeed but request-state fails, keep formulae with `requestStatus: 'unknown'` and emit one report warning. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]
**Example:**

```typescript
// Source: Homebrew manpage plus Phase 2 D-10/D-13.
export function classifyFormulae(
  installedFormulae: string[],
  requestedFormulae: string[] | null
) {
  const requested = requestedFormulae === null ? null : new Set(requestedFormulae);

  return installedFormulae.map(name => ({
    name,
    requestStatus: requested === null
      ? 'unknown'
      : requested.has(name) ? 'direct' : 'dependency',
  }));
}
```

### Pattern 3: Startup-Owned Scan With UI Fallback

**What:** Run inventory once in `App` for interactive modes, seed a fallback report, and pass the report into `Wizard` and `ConfigFirstMode`. [VERIFIED: src/app.tsx] [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]
**When to use:** Use for wizard and config-first paths; non-interactive mode may skip display unless planner explicitly adds read-only logging. [VERIFIED: src/app.tsx]
**Example:**

```typescript
// Source: existing App captureEnvironment pattern.
const [inventory, setInventory] = useState<InventoryReport>(() => createEmptyInventoryReport());

useEffect(() => {
  if (mode === 'non-interactive') return;
  scanInventory()
    .then(setInventory)
    .catch(error => setInventory(createInventoryReportWithWarning(error)));
}, []);
```

### Anti-Patterns to Avoid

- **Hardcoding tool catalogs inside inventory:** Inventory should consume `src/tools/registry.ts`; scanner-owned categories should stay limited to shell/core-tool gaps. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]
- **Calling `brew` from Ink components:** UI should render `InventoryReport`; command helpers should stay in utilities/scanner modules. [VERIFIED: src/steps/env-capture.tsx] [VERIFIED: src/utils/package-manager.ts]
- **Flattening Homebrew facts into strings only:** `brewPackages: string[]` cannot preserve direct/dependency/unknown status or unmatched audit state. [VERIFIED: src/capture/scanner.ts]
- **Treating unknown as not installed:** D-03 allows inconclusive per-tool state when detection fails; UI should distinguish unknown from missing. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]
- **Solving Phase 4 provenance now:** Avoid labels such as tilde-managed/manual/OS-provided except as deferred terms in comments/tests. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Homebrew command execution | Inline `execa('brew', ...)` in scanner/UI | Extend `src/utils/package-manager.ts` | Existing package-manager helper is already the Homebrew boundary and can be mocked. [VERIFIED: src/utils/package-manager.ts] [VERIFIED: AGENTS.md] |
| Metadata matching | New hand-maintained known-tool map | `getToolsByHomebrewFormula`, `getToolsByHomebrewCask`, `getToolsByCategory`, `allToolMetadata` | Phase 1 already created registry lookups for this purpose. [VERIFIED: src/tools/registry.ts] [VERIFIED: .planning/phases/01-tool-metadata-registry/01-01-SUMMARY.md] |
| UI summary formatting mixed with scan logic | Render strings produced inside scanner | Pure `summary.ts` helper plus Ink component | Keeps report data reusable for config-first and later provenance. [ASSUMED] |
| Command timeout/soft-failure policy | Throwing scanner errors through React effects | Warning records and unknown states | INV-04 and D-03 require soft failure. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md] |
| Provenance engine | Full managed/manual/OS-provided categorizer | Evidence and request-status fields | Phase 4 owns final provenance labels. [VERIFIED: .planning/ROADMAP.md] |

**Key insight:** Phase 2 is an evidence collector, not a provenance explainer. The best plan creates enough structured evidence for later phases while showing only a short, trustworthy terminal summary now. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Wizard checkpoints are persisted in `~/.tilde/state.json` or `TILDE_STATE_DIR/state.json`, but `EnvironmentCaptureReport` itself is not stored as a named schema in the checkpoint except through partial config fields. [VERIFIED: src/state/checkpoint.ts] [VERIFIED: codebase grep] | No data migration; avoid persisting inventory report in checkpoint unless a new schema decision is made. [ASSUMED] |
| Live service config | None. tilde is a local CLI with no backend service or live scanner configuration database. [VERIFIED: .planning/codebase/ARCHITECTURE.md] [VERIFIED: .planning/codebase/INTEGRATIONS.md] | No service patch. |
| OS-registered state | None found for env-capture/inventory; no launchd, systemd, pm2, or service registration files exist in the repo. [VERIFIED: filesystem grep] | No OS re-registration. |
| Secrets/env vars | No env var named for env-capture/inventory was found; existing relevant vars are `TILDE_CONFIG`, `TILDE_CI`, `TILDE_STATE_DIR`, `TILDE_NO_COLOR`, `HOME`, `SHELL`, and `EDITOR`. [VERIFIED: codebase grep] | No env-key migration; keep raw-secret exclusion behavior from parser/filter paths. [VERIFIED: src/capture/parser.ts] |
| Build artifacts | `dist/capture/*`, `dist/steps/env-capture*`, and `dist/src/steps/env-capture.js` exist and will be stale after source rename/refactor. [VERIFIED: filesystem grep] | Run `npm run build` after implementation and ensure generated `dist` reflects renamed source if dist is committed. [VERIFIED: package.json] |

**Nothing found in category:** live service config and OS-registered state are explicitly none by repo scan. [VERIFIED: filesystem grep]

## Common Pitfalls

### Pitfall 1: Registry Coverage Is Currently Too Narrow
**What goes wrong:** Inventory only detects browsers and note-taking apps because `allToolMetadata` currently aggregates only browser and note-taking metadata. [VERIFIED: src/tools/registry.ts]
**Why it happens:** Phase 1 seeded a minimal registry slice and intentionally did not register every plugin category. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-01-SUMMARY.md]
**How to avoid:** Plan 02-01 should add metadata rows needed for INV-01 categories or define the allowed scanner-owned `shell`/`core-tool` facts explicitly. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]
**Warning signs:** Tests assert only Chrome/Safari/Obsidian facts and still claim INV-01 coverage. [ASSUMED]

### Pitfall 2: `brew list --installed-on-request` Failure Hides Installed Formulae
**What goes wrong:** A request-state command failure causes inventory to drop installed formulae or mark them missing. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]
**Why it happens:** Installed listing and request-state classification are separate commands with different failure modes. [CITED: https://docs.brew.sh/Manpage]
**How to avoid:** Treat installed formulae as authoritative for presence when that command succeeds, and downgrade only the direct/dependency field to `unknown` when request-state fails. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]
**Warning signs:** A single catch block returns an empty Homebrew inventory for any Homebrew subcommand error. [VERIFIED: src/capture/scanner.ts]

### Pitfall 3: Cask Directness Is Over-Modeled
**What goes wrong:** Planner tries to infer cask dependencies or request-state nuance not needed for this phase. [ASSUMED]
**Why it happens:** Homebrew has request-state controls for installed formulae/casks, but D-12 locks casks as direct by default unless Phase 2 has contrary evidence. [CITED: https://docs.brew.sh/Manpage] [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]
**How to avoid:** Mark installed casks direct by default and focus request-state classification on formulae. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]
**Warning signs:** Plan 02-02 adds a cask dependency resolver or Brewfile graph parser. [ASSUMED]

### Pitfall 4: Startup Scan Blocks or Crashes the UI
**What goes wrong:** Missing `brew`, slow CLIs, or filesystem errors prevent the wizard from rendering. [VERIFIED: .planning/REQUIREMENTS.md]
**Why it happens:** React effects that await scanner commands can throw unless every boundary is caught. [VERIFIED: src/app.tsx] [VERIFIED: src/steps/env-capture.tsx]
**How to avoid:** Use bounded helper timeouts where current helper style supports it, catch command failures per subsystem, and store report warnings. [VERIFIED: src/utils/env-detection.ts] [ASSUMED]
**Warning signs:** `scanInventory()` rejects instead of returning a report with warnings. [ASSUMED]

### Pitfall 5: Step-Level Preselection Creeps Beyond Phase Scope
**What goes wrong:** Planner rewrites every wizard step to consume inventory facts before the summary integration is stable. [ASSUMED]
**Why it happens:** INV-03 says pre-highlight, but D-15 narrows visible proof to summary-level integration for Phase 2. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]
**How to avoid:** Plan summary first; allow small pre-highlights only where refactor naturally touches existing behavior. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]
**Warning signs:** Plan 02-01 includes broad rewrites to PackageManagerStep, VersionManagerStep, BrowserStep, AIToolsStep, and AppConfigStep. [ASSUMED]

## Code Examples

Verified and recommended patterns:

### Package-Manager Helper for Request-State Formulae

```typescript
// Source: existing src/utils/package-manager.ts style and Homebrew manpage.
export async function listInstalledOnRequestFormulae(): Promise<string[]> {
  const output = await runBrew(['list', '--installed-on-request', '--formula', '--full-name']);
  return output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}
```

### Build Known Facts From Metadata and Homebrew Evidence

```typescript
// Source: existing src/tools/registry.ts helpers and Phase 2 D-04.
import { allToolMetadata, getToolsByHomebrewId } from '../tools/registry.js';

export function matchHomebrewFormula(name: string) {
  const matches = getToolsByHomebrewId(name);
  return matches.length > 0
    ? { kind: 'known' as const, tools: matches }
    : { kind: 'unmatched' as const, name };
}

export function scanMetadataRows() {
  return allToolMetadata.map(tool => ({
    toolId: tool.id,
    label: tool.label,
    category: tool.category,
    evidence: [],
    installed: 'unknown' as const,
  }));
}
```

### Render Concise Summary From Report Counts

```typescript
// Source: Phase 2 D-17 and existing Ink summary style.
export function summarizeInventory(report: InventoryReport): string[] {
  const installedKnown = report.tools.filter(tool => tool.installed === 'installed');
  const direct = report.unmatchedHomebrew.formulae.filter(item => item.requestStatus === 'direct').length;
  const dependencies = report.unmatchedHomebrew.formulae.filter(item => item.requestStatus === 'dependency').length;

  return [
    `Known installed tools: ${installedKnown.length}`,
    `Homebrew formulae: ${direct} direct, ${dependencies} dependencies`,
    ...report.warnings.map(warning => `Warning: ${warning.message}`),
  ];
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `EnvironmentCaptureReport` with `brewPackages: string[]` | Evidence-backed `InventoryReport` with known tools, unmatched Homebrew, and warnings | Phase 2 target | Enables INV-01 through INV-04 without Phase 4 labels. [VERIFIED: src/capture/scanner.ts] [VERIFIED: .planning/REQUIREMENTS.md] |
| `brew list -1` only | `brew list --formula --full-name`, `brew list --cask --full-name`, and `brew list --installed-on-request` | Phase 2 target | Separates formula/cask presence and direct/dependency state. [VERIFIED: src/capture/scanner.ts] [VERIFIED: src/utils/package-manager.ts] [CITED: https://docs.brew.sh/Manpage] |
| Scan inside early wizard step | Startup scan in `App` with report passed into wizard/config-first | Phase 2 target | Makes installed-tool facts available before user decisions. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md] [VERIFIED: src/app.tsx] |
| Per-step app/CLI checks | Shared report plus summary-level integration | Phase 2 target | Reduces repeated detection and creates a single warning surface. [VERIFIED: src/steps/tools.tsx] [VERIFIED: src/steps/browser.tsx] [VERIFIED: src/steps/ai-tools.tsx] |

**Deprecated/outdated:**
- `EnvCaptureStep` as the primary API should be replaced by inventory terminology in Phase 2. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]
- `scanBrewPackages()` returning `brew list -1` should not be the Homebrew inventory model after Phase 2. [VERIFIED: src/capture/scanner.ts]
- Full provenance labels remain deferred until Phase 4. [VERIFIED: .planning/ROADMAP.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `src/capture/parser.ts` and `src/capture/filter.ts` may remain under capture if only the scanner/report boundary is renamed. | Architecture Patterns | Medium - if user expects every capture path renamed, planner needs more rename tasks and test updates. |
| A2 | Inventory summary formatting should live in a pure helper such as `src/inventory/summary.ts`. | Architecture Patterns, Don't Hand-Roll | Low - equivalent helper placement is acceptable if report/UI separation is preserved. |
| A3 | Startup inventory can skip non-interactive mode display unless a later task explicitly adds deterministic CI output. | Architecture Patterns | Low - D-18 names config-first, not CI mode; non-interactive could remain unchanged. |
| A4 | Bounded timeout behavior can reuse or mirror current `tryRun()` style from env detection. | Common Pitfalls | Medium - `runBrew()` currently has no timeout parameter, so planner must decide whether to extend it or handle timeout only through existing `run()` paths. |
| A5 | `brew list --installed-on-request --formula --full-name` is the intended command composition for requested formulae. | Code Examples | Medium - official docs list the options, but the exact combined invocation should be verified in tests/mocks before implementation locks it. |

## Open Questions

1. **Should `capture/filter.ts` and `capture/parser.ts` be renamed in Phase 2?**
   - What we know: D-09 requires full rename/refactor away from environment-capture terminology where practical, and `src/steps/env-capture.tsx` plus scanner types are direct rename targets. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]
   - What's unclear: Parser/filter modules may become Phase 3 dotfile work rather than Phase 2 inventory core. [ASSUMED]
   - Recommendation: Rename the step and scanner/report API in Phase 2; keep parser/filter unless touched by the report refactor, but update comments/tests that say env-capture if they describe the renamed flow. [ASSUMED]

2. **How broad should INV-01 metadata seeding be?**
   - What we know: Current registry has only browser and note-taking rows; INV-01 requires package managers, version managers, shells, editors, and core tools. [VERIFIED: src/tools/registry.ts] [VERIFIED: .planning/REQUIREMENTS.md]
   - What's unclear: Whether Phase 2 should add full metadata catalogs for all those categories or represent shell/core-tool facts as scanner-owned rows. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]
   - Recommendation: Add minimal metadata rows for existing plugin-backed package-manager/version-manager/editor/core tools where install ids already exist, and use scanner-owned `shell`/`core-tool` facts only for categories not yet valid in `ToolCategorySchema`. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Build, tests, CLI runtime | yes | v22.22.2 | Must be >=20. [VERIFIED: environment probe] [VERIFIED: package.json] |
| npm | Test/build scripts | yes | 10.9.7 | none. [VERIFIED: environment probe] |
| Homebrew | Inventory command research and local smoke checks | yes | 6.0.1 | Tests must mock; runtime inventory emits warnings if missing. [VERIFIED: environment probe] [VERIFIED: AGENTS.md] |
| gsd-tools shim | Research workflow init/cache | yes via `.codex/gsd-core/bin/gsd-tools.cjs` | n/a | Direct `gsd-tools` was not on PATH. [VERIFIED: environment probe] |
| Context7 MCP | Documentation lookup | no | n/a | `ctx7` CLI existed but fetch failed; Homebrew was verified with official docs via web. [VERIFIED: environment probe] |
| Project graph | Semantic graph context | no | n/a | `.planning/graphs/graph.json` absent; codebase grep used. [VERIFIED: filesystem grep] |

**Missing dependencies with no fallback:** none for implementation planning. [VERIFIED: environment probe]

**Missing dependencies with fallback:** Context7 MCP and project graph were unavailable; official Homebrew docs, local files, and grep covered required findings. [VERIFIED: environment probe] [CITED: https://docs.brew.sh/Manpage]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 with Ink testing helpers. [VERIFIED: package-lock.json] |
| Config file | `vitest.config.ts` for unit tests; `vitest.integration.config.ts` for integration tests; `vitest.contract.config.ts` for contracts. [VERIFIED: vitest.config.ts] [VERIFIED: vitest.integration.config.ts] [VERIFIED: vitest.contract.config.ts] |
| Quick run command | `npm run test -- tests/unit/inventory-scanner.test.ts tests/unit/package-manager.test.ts -x` [ASSUMED] |
| Full suite command | `npm test` plus `npm run test:integration` and `npm run build`. [VERIFIED: package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| INV-01 | Known installed-tool facts are returned for package managers, version managers, shells, editors, and core tools before wizard interaction. | unit | `npm run test -- tests/unit/inventory-scanner.test.ts -x` | no - Wave 0. [ASSUMED] |
| INV-02 | Installed Homebrew formulae are classified as direct/dependency/unknown using installed-on-request data. | unit | `npm run test -- tests/unit/inventory-homebrew.test.ts tests/unit/package-manager.test.ts -x` | no - Wave 0. [ASSUMED] |
| INV-03 | Wizard/config-first output renders concise installed-tool/Homebrew/warning summary. | integration/component | `npm run test:integration -- tests/integration/wizard-flow.test.tsx tests/integration/config-first.test.ts -t "inventory"` | partial - existing files need new cases. [VERIFIED: tests/integration/wizard-flow.test.tsx] [VERIFIED: tests/integration/config-first.test.ts] |
| INV-04 | Missing/failing/slow external commands return warnings and unknown states without crashing. | unit/integration | `npm run test -- tests/unit/inventory-scanner.test.ts -x` | no - Wave 0. [ASSUMED] |

### Sampling Rate

- **Per task commit:** targeted unit tests for touched inventory/package-manager files. [ASSUMED]
- **Per wave merge:** `npm run test -- tests/unit/inventory-scanner.test.ts tests/unit/inventory-homebrew.test.ts tests/unit/package-manager.test.ts` and relevant Ink integration tests. [ASSUMED]
- **Phase gate:** `npm run lint`, `npm run build`, `npm test`, and `npm run test:integration`. [VERIFIED: package.json]

### Wave 0 Gaps

- [ ] `tests/unit/inventory-scanner.test.ts` - covers report shape, metadata matching, warning accumulation, missing command behavior, and INV-01/INV-04. [ASSUMED]
- [ ] `tests/unit/inventory-homebrew.test.ts` - covers direct/dependency/unknown classification and unmatched Homebrew audit data for INV-02. [ASSUMED]
- [ ] `tests/unit/package-manager.test.ts` - covers new Homebrew helper command args and output parsing with mocked `execa`. [ASSUMED]
- [ ] Rename/adapt `tests/unit/capture-scanner.test.ts` and `tests/integration/env-capture.test.ts` if their covered behavior moves under `src/inventory/`. [VERIFIED: tests/unit/capture-scanner.test.ts] [VERIFIED: tests/integration/env-capture.test.ts]
- [ ] Add config-first summary assertion before apply confirmation. [VERIFIED: tests/integration/config-first.test.ts]

## Security Domain

Security enforcement is enabled in `.planning/config.json`, so Phase 2 planning must include a security control map. [VERIFIED: .planning/config.json]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | Scanner does not authenticate users or services. [VERIFIED: .planning/ROADMAP.md] |
| V3 Session Management | no | CLI has no web sessions or cookies. [VERIFIED: .planning/codebase/ARCHITECTURE.md] |
| V4 Access Control | no | Local CLI scanner has no multi-user authorization boundary. [VERIFIED: .planning/codebase/ARCHITECTURE.md] |
| V5 Input Validation | yes | Treat command output as untrusted strings; parse by newline/trim/filter and validate metadata through existing schemas. [VERIFIED: src/utils/package-manager.ts] [VERIFIED: src/tools/metadata.ts] |
| V6 Cryptography | no | Scanner should not add cryptography or secret resolution. [VERIFIED: AGENTS.md] |

### Known Threat Patterns for TypeScript CLI Inventory

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Command injection through package names | Tampering | Use argument arrays through `runBrew()`/`execa`; do not concatenate package names into shell strings. [VERIFIED: src/utils/package-manager.ts] |
| Secret leakage from rc/env files | Information Disclosure | Keep existing parser/filter behavior that excludes secret-like env values and `.env` files; do not resolve backend references. [VERIFIED: src/capture/parser.ts] [VERIFIED: tests/integration/env-capture.test.ts] |
| Misleading provenance labels | Spoofing | Do not claim final managed/manual/OS-provided labels in Phase 2; show evidence and unknown states. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md] |
| Denial of service from slow external commands | Denial of Service | Add bounded command behavior or per-command catches and return warnings instead of blocking/crashing. [VERIFIED: .planning/REQUIREMENTS.md] [ASSUMED] |

## Sources

### Primary (HIGH confidence)

- `AGENTS.md` - project constraints, stack, conventions, security/testability rules. [VERIFIED: AGENTS.md]
- `.planning/phases/02-machine-inventory-scanner/02-CONTEXT.md` - locked Phase 2 decisions and deferred scope. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md]
- `.planning/REQUIREMENTS.md` - INV-01 through INV-04. [VERIFIED: .planning/REQUIREMENTS.md]
- `.planning/ROADMAP.md` - Phase 2 goal, success criteria, plan slices, and Phase 4 deferral. [VERIFIED: .planning/ROADMAP.md]
- `.planning/phases/01-tool-metadata-registry/*-SUMMARY.md` - Phase 1 registry decisions and implementation facts. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-01-SUMMARY.md] [VERIFIED: .planning/phases/01-tool-metadata-registry/01-02-SUMMARY.md] [VERIFIED: .planning/phases/01-tool-metadata-registry/01-03-SUMMARY.md]
- `src/capture/scanner.ts`, `src/utils/package-manager.ts`, `src/tools/metadata.ts`, `src/tools/registry.ts`, `src/app.tsx`, `src/steps/env-capture.tsx`, `src/modes/wizard.tsx`, `src/modes/config-first.tsx` - current implementation seams. [VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)

- Homebrew official manpage - `brew list` options and installed-on-request tab state. [CITED: https://docs.brew.sh/Manpage]
- `.planning/codebase/INTEGRATIONS.md` and `.planning/codebase/TESTING.md` - mapped integration/test boundaries from prior codebase analysis. [VERIFIED: .planning/codebase/INTEGRATIONS.md] [VERIFIED: .planning/codebase/TESTING.md]

### Tertiary (LOW confidence)

- Assumptions in the Assumptions Log about exact helper file names, summary helper placement, and timeout implementation details. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - versions and scripts verified locally from package files and environment probes. [VERIFIED: package.json] [VERIFIED: package-lock.json] [VERIFIED: environment probe]
- Architecture: HIGH - constrained by locked Phase 2 decisions and existing code seams. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md] [VERIFIED: codebase grep]
- Homebrew semantics: MEDIUM - official docs verify option concepts and tab state; exact combined command should be locked by mocked tests and, if desired, a manual local smoke check. [CITED: https://docs.brew.sh/Manpage] [ASSUMED]
- Pitfalls: HIGH for codebase drift and current scanner limitations; MEDIUM for exact timeout/helper implementation recommendations. [VERIFIED: codebase grep] [ASSUMED]

**Research date:** 2026-06-13
**Valid until:** 2026-07-13 for codebase architecture; 2026-06-20 for Homebrew CLI option assumptions. [ASSUMED]
