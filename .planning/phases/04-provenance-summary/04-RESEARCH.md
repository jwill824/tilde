# Phase 04: Provenance Summary - Research

**Researched:** 2026-06-20
**Domain:** TypeScript CLI inventory provenance derivation and Ink summary rendering
**Confidence:** HIGH for codebase architecture and phase scope; MEDIUM for external framework documentation

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
## Implementation Decisions

### Provenance Semantics

- `tilde-managed` means selected by the current config or wizard run.
- If a selected tool is already installed, the primary label is `tilde-managed`; detail preserves installed/direct/dependency/manual evidence.
- Homebrew `dependency` remains explicit evidence and detail.
- Manual, App Store, and manual GUI labels are metadata-driven.
- OS-provided applies only to known scanner-owned core tools and shells.
- `unknown` means insufficient or inconclusive scanner or metadata evidence.

### Shared Derivation

- Add a shared provenance helper, separate from UI components, deriving labels and action explanations from config intent, metadata, and inventory.
- Provenance data must be derived from scanner output and metadata rather than duplicated per step.
- Keep detailed provenance evidence structured for tests and future audit views, not as a new verbose UI in this phase.

### Output Behavior

- Keep normal output concise: one provenance summary line with grouped counts, up to 3 examples per group, and `+N more`.
- Use shared summary output in both wizard inventory and config-first confirmation.
- Explanations are action-oriented: install, skip because present, leave present/unmanaged, or proceed cautiously when unknown.
- Selected dependency-installed tools read as selected and already present as a dependency; no install needed unless future logic promotes direct install.
- Unknown selected tools do not block apply; preserve warnings and follow configured action.

### the agent's Discretion
No explicit `## the agent's Discretion` section was provided in Phase 04 CONTEXT.md. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

- A verbose audit view for detailed provenance evidence is deferred. This phase should preserve structured data for future audit views without adding one.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROV-01 | tilde can label tools as tilde-managed, already installed, Homebrew dependency, manually installed, app-store/manual GUI install, OS-provided, or unknown. [VERIFIED: .planning/REQUIREMENTS.md] | Use a shared derivation helper over `InventoryReport.tools`, config intent, and `ToolMetadata.install` evidence; display category names should align with requirement language, while detail can preserve Homebrew direct/dependency/manual evidence. [VERIFIED: src/inventory/report.ts] [VERIFIED: src/tools/metadata.ts] [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] |
| PROV-02 | Wizard and/or config summary output shows provenance without overwhelming the user. [VERIFIED: .planning/REQUIREMENTS.md] | Keep one grouped `Provenance:` line through `summarizeInventory()` with 3 examples per group and `+N more`; existing wizard and config-first paths already render `summarizeInventory()`. [VERIFIED: src/inventory/summary.ts] [VERIFIED: src/steps/inventory.tsx] [VERIFIED: src/modes/config-first.tsx] |
| PROV-03 | Provenance can explain why tilde selected or skipped a tool. [VERIFIED: .planning/REQUIREMENTS.md] | Derive action text from selected config intent plus installed state and evidence; config-first confirmation has a complete `TildeConfig`, while the early wizard inventory step does not yet have all wizard selections. [VERIFIED: src/config/schema.ts] [VERIFIED: src/modes/config-first.tsx] [VERIFIED: src/modes/wizard.tsx] |
| PROV-04 | Provenance data is derived from scanner output and metadata rather than hardcoded per-step text. [VERIFIED: .planning/REQUIREMENTS.md] | Put derivation under `src/inventory/`, consume `getToolMetadata()` and inventory evidence, and keep Ink components as renderers only. [VERIFIED: src/inventory/report.ts] [VERIFIED: src/tools/registry.ts] [VERIFIED: src/steps/inventory.tsx] |
</phase_requirements>

## Summary

Phase 04 should be planned as a pure derivation and presentation phase: no new scanners, no installer behavior changes, no destructive machine inspection, and no verbose audit UI. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] The existing code already has the right substrate: `InventoryReport` carries installed/missing/unknown state, evidence arrays, Homebrew request status, app-path evidence, warnings, and dotfile maps; `ToolMetadata` carries install identifiers, app paths, manual notes, and categories. [VERIFIED: src/inventory/report.ts] [VERIFIED: src/inventory/scan.ts] [VERIFIED: src/tools/metadata.ts]

There are interrupted workspace edits that already add `src/inventory/provenance.ts`, import `formatProvenanceSummaryLine()` from `src/inventory/summary.ts`, and pass config into `summarizeInventory()` from config-first confirmation. [VERIFIED: src/inventory/provenance.ts] [VERIFIED: src/inventory/summary.ts] [VERIFIED: src/modes/config-first.tsx] Planning should account for that work but should not assume it is complete: the current helper uses implementation-shaped labels such as `homebrew-direct`, while PROV-01 and the Phase 04 context require user-facing provenance categories such as already installed, Homebrew dependency, manual/App Store/manual GUI, OS-provided, and unknown. [VERIFIED: src/inventory/provenance.ts] [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]

**Primary recommendation:** finish a shared `src/inventory/provenance.ts` derivation helper, align display categories to PROV-01 semantics, route concise output through `summarizeInventory(report, config?)`, and add focused unit plus integration tests before touching UI behavior. [VERIFIED: src/inventory/summary.ts] [VERIFIED: tests/integration/config-first.test.ts] [VERIFIED: tests/integration/wizard-flow.test.tsx]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Provenance derivation | CLI application source / inventory domain | Metadata registry | Derivation belongs in `src/inventory/` because it consumes `InventoryReport`; metadata lookup supplies install/category hints. [VERIFIED: src/inventory/report.ts] [VERIFIED: src/tools/registry.ts] |
| Config intent detection | CLI application source / config domain | Wizard state | `TildeConfig` fields define selected package managers, version managers, tools, browsers, editors, and AI tools. [VERIFIED: src/config/schema.ts] |
| Concise terminal rendering | Ink UI | Inventory summary helper | Wizard inventory and config-first render summary lines from `summarizeInventory()`, so wording belongs in the helper rather than components. [VERIFIED: src/inventory/summary.ts] [VERIFIED: src/steps/inventory.tsx] [VERIFIED: src/modes/config-first.tsx] |
| Action explanations | CLI application source / inventory domain | Installer pipeline | This phase should explain install/skip/leave/proceed cautiously but not alter `installAll()` or `writeAll()`. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] [VERIFIED: src/installer/index.ts] |
| Detailed audit evidence | Structured report data | Future audit UI | Phase 04 should preserve structured evidence for future audit views without adding a verbose UI. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] |

## Project Constraints (from AGENTS.md)

- Runtime is Node.js >=20 with TypeScript NodeNext and `.js` import extensions; new modules must preserve ESM import style. [VERIFIED: AGENTS.md] [VERIFIED: tsconfig.json] [CITED: Context7 /microsoft/typescript]
- UI is Ink/React terminal UI; provenance output must fit terminal workflows and support non-interactive paths where relevant. [VERIFIED: AGENTS.md] [CITED: Context7 /vadimdemedes/ink]
- Platform is macOS-first; Homebrew, app bundles, shell rc files, and dotfiles discovery target macOS before cross-platform expansion. [VERIFIED: AGENTS.md] [VERIFIED: src/index.tsx]
- Discovery must be non-destructive by default; Phase 04 should derive and render from existing report data rather than writing or deleting. [VERIFIED: AGENTS.md] [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]
- Do not resolve or persist raw secrets; environment variables and secret references remain backend references. [VERIFIED: AGENTS.md] [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md]
- External commands such as `brew`, `gh`, `op`, `vfox`, and `defaultbrowser` must be mocked in automated tests. [VERIFIED: AGENTS.md] [VERIFIED: tests/unit/inventory-scanner.test.ts]
- Before file-changing implementation work, use a GSD workflow entry point; this research artifact is the current GSD phase output. [VERIFIED: AGENTS.md]

## Standard Stack

### Core

| Library | Project Version | Registry Check | Purpose | Why Standard |
|---------|-----------------|----------------|---------|--------------|
| TypeScript | `5.4` [VERIFIED: package.json] | latest `6.0.3`, modified 2026-06-18 [VERIFIED: npm registry] | Compile strict NodeNext source. [VERIFIED: tsconfig.json] | Existing repo compiler and NodeNext import rules; do not upgrade during this phase. [VERIFIED: package.json] [CITED: Context7 /microsoft/typescript] |
| Ink | `^6.8.0` [VERIFIED: package.json] | latest `7.1.0`, modified 2026-06-17 [VERIFIED: npm registry] | Render terminal UI with `Box` and `Text`. [VERIFIED: src/steps/inventory.tsx] | Existing wizard/config-first UI framework; docs support `Box` layout plus `Text` content. [CITED: Context7 /vadimdemedes/ink] |
| React | `^19.2.4` [VERIFIED: package.json] | not separately needed for this phase [VERIFIED: package.json] | Component model for Ink surfaces. [VERIFIED: src/steps/inventory.tsx] | Already paired with Ink throughout the repo. [VERIFIED: AGENTS.md] |
| Vitest | `^4.1.2` [VERIFIED: package.json] | latest `4.1.9`, modified 2026-06-15 [VERIFIED: npm registry] | Unit and integration tests. [VERIFIED: vitest.config.ts] | Existing test runner supports `vi.mock` module mocking used in scanner/UI tests. [VERIFIED: tests/unit/inventory-scanner.test.ts] [CITED: Context7 /vitest-dev/vitest/v4.1.6] |

### Supporting

| Library | Project Version | Purpose | When to Use |
|---------|-----------------|---------|-------------|
| ink-testing-library | `^4.0.0` [VERIFIED: package.json] | Render Ink components in integration tests. [VERIFIED: tests/integration/config-first.test.ts] | Use for wizard/config-first summary assertions. [VERIFIED: tests/integration/wizard-flow.test.tsx] |
| Zod | `^4.3.6` [VERIFIED: package.json] | Validate `TildeConfig`. [VERIFIED: src/config/schema.ts] | Rely on existing config validation; do not add separate provenance input validation framework. [VERIFIED: src/config/schema.ts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing `summarizeInventory()` | Separate provenance component text | Avoid: two UI paths already consume the shared summary helper, and Phase 04 requires shared output. [VERIFIED: src/inventory/summary.ts] [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] |
| Existing Vitest tests | New test framework | Avoid: Vitest is already configured and used for scanner and Ink integration tests. [VERIFIED: vitest.config.ts] [VERIFIED: tests/integration/wizard-flow.test.tsx] |
| Existing metadata registry | Inline per-step provenance maps | Avoid: PROV-04 explicitly requires scanner/metadata-derived provenance. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: src/tools/registry.ts] |

**Installation:**

```bash
# No new packages for Phase 04. [VERIFIED: package.json] [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]
```

## Package Legitimacy Audit

No external packages should be installed in this phase. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] The package legitimacy gate is not applicable because the standard stack is already present in `package.json` and `package-lock.json`. [VERIFIED: package.json] [VERIFIED: package-lock.json]

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| N/A | npm | N/A | N/A | N/A | N/A | No install planned. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: no new packages planned]
**Packages flagged as suspicious [SUS]:** none. [VERIFIED: no new packages planned]

## Architecture Patterns

### System Architecture Diagram

```text
Inventory startup scan
  -> InventoryReport.tools[] evidence
  -> InventoryReport.unmatchedHomebrew / warnings / dotfiles

TildeConfig intent
  -> selected ids from packageManagers, versionManagers, tools, browser, editors, aiTools

Tool metadata registry
  -> install.homebrew, install.appPath, install.manualNote, category, label

InventoryReport + TildeConfig? + ToolMetadata
  -> deriveInventoryProvenance()
  -> ToolProvenance[] with label, selected, provenance, detail, action, evidence, warnings
  -> summarizeProvenanceGroups(maxExamples=3)
  -> formatProvenanceSummaryLine()
  -> summarizeInventory(report, config?)
  -> Ink Text lines in InventoryStep, ConfigFirstMode, and final wizard confirmation where config exists
```

This data flow follows the established boundary where app startup owns scanning and UI components render supplied report data. [VERIFIED: .planning/STATE.md] [VERIFIED: src/modes/wizard.tsx] [VERIFIED: src/steps/inventory.tsx]

### Recommended Project Structure

```text
src/
  inventory/
    provenance.ts      # shared derivation, grouping, action/detail text [VERIFIED: current partial file exists]
    summary.ts         # concise shared summary line integration [VERIFIED: src/inventory/summary.ts]
    report.ts          # evidence/report contracts consumed by provenance [VERIFIED: src/inventory/report.ts]
tests/
  unit/
    inventory-provenance.test.ts  # derivation precedence and grouping [VERIFIED: tests/unit layout]
  integration/
    wizard-flow.test.tsx          # wizard summary shared output [VERIFIED: tests/integration/wizard-flow.test.tsx]
    config-first.test.ts          # config-first summary shared output [VERIFIED: tests/integration/config-first.test.ts]
```

### Pattern 1: Evidence-First Provenance Helper

**What:** Convert `InventoryToolFact` plus config-selected ids and metadata into `ToolProvenance` records that preserve evidence and expose concise display/category/action fields. [VERIFIED: src/inventory/report.ts] [VERIFIED: src/inventory/provenance.ts]

**When to use:** Use for every provenance label, including synthetic selected ids missing from scanner output. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]

**Example:**

```typescript
// Source: src/inventory/provenance.ts and Phase 04 CONTEXT.md
const selected = selectedToolIds.has(tool.toolId);
const label = selected
  ? 'tilde-managed'
  : classifyFromEvidenceAndMetadata(tool, getToolMetadata(tool.toolId));
```

### Pattern 2: Display Category vs Evidence Detail

**What:** The primary display category should use user-facing PROV-01 labels, while detail text preserves lower-level facts such as direct Homebrew formula, dependency formula, cask, app path, manual note, and warnings. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] [VERIFIED: src/inventory/report.ts]

**When to use:** Use when a selected tool is already installed or installed as a dependency; primary label remains `tilde-managed`, but detail/action explains why install can be skipped. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]

**Example:**

```typescript
// Source: Phase 04 CONTEXT.md
if (selected) {
  return {
    provenance: 'tilde-managed',
    detail: evidenceSummary(tool.evidence),
    action: tool.installed === 'installed'
      ? 'Skip install; selected tool is already present.'
      : 'Install according to the current config.',
  };
}
```

### Pattern 3: Shared Summary Formatting

**What:** Keep default terminal output to one grouped `Provenance:` line with counts, up to 3 examples per group, and `+N more`. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]

**When to use:** Use from `summarizeInventory(report, config?)`; UI components should map returned strings into `<Text>` only. [VERIFIED: src/inventory/summary.ts] [CITED: Context7 /vadimdemedes/ink]

### Anti-Patterns to Avoid

- **Hardcoding per-step provenance text:** violates PROV-04 and risks wizard/config-first drift. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: src/inventory/summary.ts]
- **Treating `homebrew-direct` as the user-facing category:** it is useful detail/evidence, but PROV-01 asks for "already installed" and "Homebrew dependency" categories. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: src/inventory/provenance.ts]
- **Marking every `core-tool`/`shell` as OS-provided:** context says OS-provided applies only to known scanner-owned core tools and shells, so classification should check scanner-owned ids such as `core-tool:*` and `shell:*`, not just a broad fallback category. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] [VERIFIED: src/inventory/scan.ts]
- **Showing raw warning paths or rc details in the provenance line:** Phase 3 verification requires concise summary output without detailed paths/raw values. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-VERIFICATION.md]
- **Blocking apply on unknown selected tools:** Phase 04 context explicitly says unknown selected tools do not block apply. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Machine scanning | A new provenance scanner | Existing `InventoryReport` from `scanInventory()` | Phase 04 derives from existing metadata, config intent, and scanner evidence. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] [VERIFIED: src/inventory/scan.ts] |
| Metadata matching | Per-step id maps | `getToolMetadata()` and existing registry helpers | Metadata registry is the canonical shared source. [VERIFIED: src/tools/registry.ts] [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md] |
| UI wording paths | Separate wizard/config-first text | `summarizeInventory()` plus provenance formatter | Shared summary output is already the architecture and locked by Phase 04. [VERIFIED: src/inventory/summary.ts] [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] |
| External command behavior | Real `brew`/`gh`/`op` calls in tests | Mocked helper modules and injected fixture reports | Project rules require external commands to be mocked. [VERIFIED: AGENTS.md] [VERIFIED: tests/unit/inventory-scanner.test.ts] |
| Secret or rc value explanation | Raw env values or source-line dumps | Count/group output plus structured safe evidence | Project and Phase 3 rules prohibit persisting raw secrets/values in default output. [VERIFIED: AGENTS.md] [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md] |

**Key insight:** The provenance helper should be a classifier over already-safe facts, not another discovery mechanism. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] [VERIFIED: src/inventory/report.ts]

## Common Pitfalls

### Pitfall 1: Selected Precedence Lost

**What goes wrong:** A selected tool already installed by Homebrew is labeled "already installed" or "Homebrew direct" instead of `tilde-managed`. [VERIFIED: src/inventory/provenance.ts]

**Why it happens:** The implementation classifies evidence before config intent. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]

**How to avoid:** Make selected config intent the first classifier branch and move install evidence into detail/action text. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]

**Warning signs:** Unit tests fail for selected direct, selected dependency, and selected app-path installed fixtures. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]

### Pitfall 2: Early Wizard Inventory Cannot Explain Final Wizard Selection

**What goes wrong:** The early `InventoryStep` tries to explain why a wizard-selected tool was selected before later wizard steps have collected tools, browsers, editors, or AI tools. [VERIFIED: src/modes/wizard.tsx]

**Why it happens:** `InventoryStep` runs at step 1; tools are collected at later steps and `ApplyStep` receives the completed `TildeConfig`. [VERIFIED: src/modes/wizard.tsx] [VERIFIED: src/steps/apply.tsx]

**How to avoid:** Keep early inventory provenance unselected/evidence-oriented, and render config-aware selected provenance in config-first confirmation and final wizard confirmation where `TildeConfig` exists. [VERIFIED: src/modes/config-first.tsx] [VERIFIED: src/steps/apply.tsx]

**Warning signs:** Tests expect `tilde-managed` in the early inventory step without passing a config. [VERIFIED: src/steps/inventory.tsx]

### Pitfall 3: Arbitrary `config.tools` IDs Are Treated Like Registry Tool IDs

**What goes wrong:** Manually entered tools from `ToolsStep` can be arbitrary Homebrew formula/cask names, not guaranteed metadata ids. [VERIFIED: src/steps/tools.tsx]

**Why it happens:** `config.tools` is an array of strings and can include note-taking casks plus free-form user entries. [VERIFIED: src/config/schema.ts] [VERIFIED: src/steps/tools.tsx]

**How to avoid:** For selected ids missing both scanner fact and metadata, create a synthetic unknown selected provenance record with cautious action text, not an OS-provided assumption. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]

**Warning signs:** Unknown selected tool gets `category: 'core-tool'` and later becomes OS-provided when selected precedence changes. [VERIFIED: src/inventory/provenance.ts]

### Pitfall 4: Manual/App Store Labels Ignore Metadata

**What goes wrong:** Bear or similar manual GUI apps are labeled unknown or unmanaged even though metadata has a manual note and app path. [VERIFIED: src/tools/note-taking-metadata.ts]

**Why it happens:** The classifier only checks Homebrew evidence or installed state. [VERIFIED: src/inventory/provenance.ts]

**How to avoid:** Use `install.manualNote` and `install.appPath` metadata as manual/App Store/manual GUI evidence, and use app-path existence as installed evidence detail. [VERIFIED: src/tools/metadata.ts] [VERIFIED: src/tools/note-taking-metadata.ts]

### Pitfall 5: Warning Output Becomes a Verbose Audit

**What goes wrong:** Provenance output leaks detailed unknown paths, rc source lines, or raw environment values. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-VERIFICATION.md]

**Why it happens:** Summary rendering prints structured evidence directly instead of grouped counts/examples. [VERIFIED: src/inventory/summary.ts]

**How to avoid:** Keep detailed evidence in `ToolProvenance.evidence` and default output in one summary line plus existing warning lines. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]

## Code Examples

### Selected Tool IDs from Config

```typescript
// Source: src/config/schema.ts and current src/inventory/provenance.ts
function getSelectedToolIds(config?: TildeConfig): Set<string> {
  const selected = new Set<string>();
  if (!config) return selected;

  for (const packageManager of config.packageManagers ?? []) selected.add(packageManager);
  for (const versionManager of config.versionManagers ?? []) selected.add(versionManager.name);
  for (const tool of config.tools ?? []) selected.add(tool);
  for (const browser of config.browser?.selected ?? []) selected.add(browser);
  if (config.browser?.default) selected.add(config.browser.default);
  if (config.editors?.primary) selected.add(config.editors.primary);
  for (const editor of config.editors?.additional ?? []) selected.add(editor);
  for (const aiTool of config.aiTools ?? []) selected.add(aiTool.name);

  return selected;
}
```

This mirrors the existing config schema fields and should remain in a shared helper, not UI components. [VERIFIED: src/config/schema.ts] [VERIFIED: src/inventory/provenance.ts]

### Grouped Summary Line

```typescript
// Source: Phase 04 CONTEXT.md and current src/inventory/provenance.ts
function formatGroup(group: ProvenanceGroupSummary): string {
  const examples = group.examples.join(', ');
  const more = group.remaining > 0 ? `, +${group.remaining} more` : '';
  return `${DISPLAY_LABELS[group.provenance]} ${group.count}${examples ? ` (${examples}${more})` : ''}`;
}
```

This satisfies the locked "up to 3 examples per group and `+N more`" output behavior. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] [VERIFIED: src/inventory/provenance.ts]

### Vitest Mock Pattern

```typescript
// Source: Context7 /vitest-dev/vitest/v4.1.6 and tests/unit/inventory-scanner.test.ts
vi.mock('../../src/tools/registry.js', () => ({
  getToolMetadata: (id: string) => fixtures[id],
}));
```

Use `vi.mock` for metadata/scanner fixtures where needed; Vitest docs confirm module mocks and partial mocks are standard patterns. [CITED: Context7 /vitest-dev/vitest/v4.1.6] [VERIFIED: tests/unit/inventory-scanner.test.ts]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 2 inventory used installed/missing/unknown plus evidence and avoided final provenance labels. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md] | Phase 4 should derive final provenance labels from those facts. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] | Phase 04 in roadmap. [VERIFIED: .planning/ROADMAP.md] | Do not alter scanner shape unless tests reveal a missing evidence field. [VERIFIED: src/inventory/report.ts] |
| Phase 3 dotfiles output reported safe counts/findings without final provenance. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md] | Phase 4 can preserve dotfile evidence for future audit views but should not add verbose default UI. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] | Phase 04. [VERIFIED: .planning/ROADMAP.md] | Default output stays concise. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] |
| Config-first had inventory summary without selected provenance. [VERIFIED: src/modes/config-first.tsx] | Partial edits now call `summarizeInventory(inventoryReport, phase.config)`. [VERIFIED: src/modes/config-first.tsx] | Interrupted implementation attempt before this research. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] | Planner should validate and finish, not reimplement blindly. [VERIFIED: src/inventory/provenance.ts] |

**Deprecated/outdated:**

- Per-phase prohibition on provenance labels from Phases 2 and 3 is no longer applicable as a blocker in Phase 4; it remains a useful reminder not to put labels into scanners. [VERIFIED: .planning/phases/02-machine-inventory-scanner/02-CONTEXT.md] [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md] [VERIFIED: .planning/ROADMAP.md]

## Assumptions Log

All claims in this research were verified against local project files, Phase context, npm registry checks, or Context7 documentation. No `[ASSUMED]` claims are intentionally used. [VERIFIED: research execution]

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| N/A | N/A | N/A | N/A |

## Open Questions

1. **Where should config-aware wizard provenance render?**
   - What we know: early `InventoryStep` runs before wizard selections, while `ApplyStep` receives completed `TildeConfig`. [VERIFIED: src/modes/wizard.tsx] [VERIFIED: src/steps/apply.tsx]
   - What's unclear: Phase 04 context says shared summary output in wizard inventory and config-first confirmation, but PROV-03 needs selected/skipped explanations that early inventory cannot know. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] [VERIFIED: .planning/REQUIREMENTS.md]
   - Recommendation: Plan evidence-only provenance in early wizard inventory and config-aware selected provenance in final wizard confirmation plus config-first confirmation. [VERIFIED: src/modes/wizard.tsx] [VERIFIED: src/modes/config-first.tsx]

2. **Should the internal `ProvenanceLabel` union include `homebrew-direct`?**
   - What we know: current partial code includes `homebrew-direct`, but PROV-01 names "already installed" and separately names Homebrew dependency. [VERIFIED: src/inventory/provenance.ts] [VERIFIED: .planning/REQUIREMENTS.md]
   - What's unclear: The internal type can keep evidence-specific labels, but the user-facing output must match phase semantics. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]
   - Recommendation: Prefer user-facing provenance labels for `provenance` and store direct/dependency/manual evidence in `detail` or a structured evidence summary. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Build and tests | yes [VERIFIED: `node --version`] | v22.22.2 [VERIFIED: `node --version`] | Required by project. [VERIFIED: package.json] |
| npm | Test scripts and registry verification | yes [VERIFIED: `npm --version`] | 10.9.7 [VERIFIED: `npm --version`] | Required by project. [VERIFIED: package.json] |
| Vitest | Unit and integration tests | yes [VERIFIED: `./node_modules/.bin/vitest --version`] | 4.1.2 [VERIFIED: `./node_modules/.bin/vitest --version`] | Use npm scripts. [VERIFIED: package.json] |
| Context7 CLI fallback | Research only | yes [VERIFIED: `command -v ctx7`] | resolved docs with network approval [CITED: Context7] | Not required for implementation. [VERIFIED: research execution] |

**Missing dependencies with no fallback:** none for Phase 04 implementation. [VERIFIED: environment probes]

**Missing dependencies with fallback:** none for Phase 04 implementation. [VERIFIED: environment probes]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2. [VERIFIED: `./node_modules/.bin/vitest --version`] |
| Config file | `vitest.config.ts` for unit tests; integration config exists via npm script. [VERIFIED: vitest.config.ts] [VERIFIED: package.json] |
| Quick run command | `npm run test -- tests/unit/inventory-provenance.test.ts` [VERIFIED: package.json] |
| Full suite command | `npm test && npm run test:integration && npm run build && npm run lint` [VERIFIED: package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| PROV-01 | Label precedence and categories for selected, direct installed, dependency, manual GUI/App Store, OS-provided, unmanaged, and unknown. [VERIFIED: .planning/REQUIREMENTS.md] | unit | `npm run test -- tests/unit/inventory-provenance.test.ts` | no, Wave 0 gap. [VERIFIED: tests listing] |
| PROV-02 | One concise grouped provenance line with examples and `+N more` in shared summary output. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] | unit + integration | `npm run test -- tests/unit/inventory-provenance.test.ts tests/unit/inventory-scanner.test.ts` and `npm run test:integration -- tests/integration/wizard-flow.test.tsx tests/integration/config-first.test.ts -t inventory` | partial existing integration files. [VERIFIED: tests/integration/wizard-flow.test.tsx] [VERIFIED: tests/integration/config-first.test.ts] |
| PROV-03 | Action explanations for install, skip present, leave unmanaged, and proceed cautiously unknown. [VERIFIED: .planning/REQUIREMENTS.md] | unit | `npm run test -- tests/unit/inventory-provenance.test.ts` | no, Wave 0 gap. [VERIFIED: tests listing] |
| PROV-04 | Derivation uses scanner evidence and metadata, not UI hardcoding. [VERIFIED: .planning/REQUIREMENTS.md] | unit + code review | `npm run test -- tests/unit/inventory-provenance.test.ts` | no, Wave 0 gap. [VERIFIED: tests listing] |

### Sampling Rate

- **Per task commit:** `npm run test -- tests/unit/inventory-provenance.test.ts` plus the touched integration test when UI rendering changes. [VERIFIED: package.json]
- **Per wave merge:** `npm test && npm run test:integration && npm run build && npm run lint`. [VERIFIED: package.json]
- **Phase gate:** Full suite green before verification. [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-VERIFICATION.md]

### Wave 0 Gaps

- [ ] `tests/unit/inventory-provenance.test.ts` - covers PROV-01, PROV-03, PROV-04 derivation precedence. [VERIFIED: tests listing]
- [ ] Extend `tests/integration/config-first.test.ts` - assert provenance summary uses config-aware selected labels and hides verbose evidence. [VERIFIED: tests/integration/config-first.test.ts]
- [ ] Extend `tests/integration/wizard-flow.test.tsx` or `tests/unit/apply-step` equivalent - assert wizard output gets the same provenance line at a config-aware point. [VERIFIED: tests/integration/wizard-flow.test.tsx] [VERIFIED: src/steps/apply.tsx]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | Phase 04 does not authenticate users or services. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] |
| V3 Session Management | no | No session state is introduced. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] |
| V4 Access Control | no | Local CLI display phase; no backend resource authorization is introduced. [VERIFIED: .planning/PROJECT.md] |
| V5 Input Validation | yes | Consume `TildeConfigSchema` output and typed `InventoryReport`; do not parse arbitrary shell text in provenance. [VERIFIED: src/config/schema.ts] [VERIFIED: src/inventory/report.ts] |
| V6 Cryptography | no | No crypto or secret resolution is introduced. [VERIFIED: AGENTS.md] [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Raw secret or rc value disclosure in terminal summary | Information Disclosure | Keep default provenance output to categories, counts, labels, and safe action text; never dump raw rc values or env values. [VERIFIED: AGENTS.md] [VERIFIED: .planning/phases/03-dotfiles-discovery-map/03-VERIFICATION.md] |
| Misleading provenance due to selected/evidence precedence bug | Tampering | Unit-test precedence and keep selected intent as primary label with evidence in detail. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] |
| Running real external commands in tests | Elevation of Privilege / Tampering | Mock command helpers and inject fixture reports. [VERIFIED: AGENTS.md] [VERIFIED: tests/unit/inventory-scanner.test.ts] |
| Treating unknown selected tools as blocking errors | Denial of Service | Unknown selected tools should preserve warnings and follow configured action. [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/04-provenance-summary/04-CONTEXT.md` - locked semantics, phase boundary, output behavior, test plan, interrupted workspace note.
- `.planning/REQUIREMENTS.md` - PROV-01 through PROV-04.
- `.planning/ROADMAP.md` - Phase 04 goal and plan slots.
- `.planning/STATE.md` - accumulated inventory/provenance decisions.
- `AGENTS.md` - project constraints and workflow rules.
- `src/inventory/report.ts` - inventory report, facts, evidence, warnings.
- `src/inventory/scan.ts` - scanner ownership and evidence production.
- `src/inventory/summary.ts` - shared summary output.
- `src/inventory/provenance.ts` - interrupted partial provenance helper.
- `src/steps/inventory.tsx`, `src/modes/config-first.tsx`, `src/modes/wizard.tsx`, `src/steps/apply.tsx` - rendering and config availability points.
- `src/tools/metadata.ts`, `src/tools/registry.ts`, `src/tools/note-taking-metadata.ts` - metadata fields and lookup helpers.
- `tests/unit/inventory-scanner.test.ts`, `tests/integration/wizard-flow.test.tsx`, `tests/integration/config-first.test.ts` - existing test patterns and summary coverage.

### Secondary (MEDIUM confidence)

- Context7 `/vadimdemedes/ink` - Ink `Box` and `Text` layout/component docs. [CITED: Context7 /vadimdemedes/ink]
- Context7 `/vitest-dev/vitest/v4.1.6` - `vi.mock` and module mock docs. [CITED: Context7 /vitest-dev/vitest/v4.1.6]
- Context7 `/microsoft/typescript/v5.9.3` - NodeNext/Node16 explicit relative import extension behavior. [CITED: Context7 /microsoft/typescript/v5.9.3]
- npm registry checks for `ink`, `vitest`, and `typescript` latest versions and modified times. [VERIFIED: npm registry]

### Tertiary (LOW confidence)

- None used intentionally. [VERIFIED: research execution]

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH for local versions and commands, MEDIUM for latest registry versions. [VERIFIED: package.json] [VERIFIED: npm registry]
- Architecture: HIGH because it is derived from current code and phase context. [VERIFIED: src/inventory/report.ts] [VERIFIED: src/modes/wizard.tsx]
- Pitfalls: HIGH for code-observed issues and phase-locked semantics. [VERIFIED: src/inventory/provenance.ts] [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]

**Research date:** 2026-06-20
**Valid until:** 2026-07-20 for codebase/phase guidance; re-check npm registry versions if planning package upgrades, which this phase should not do. [VERIFIED: package.json] [VERIFIED: .planning/phases/04-provenance-summary/04-CONTEXT.md]
