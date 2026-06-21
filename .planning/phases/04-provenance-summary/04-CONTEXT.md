# Phase 04: Provenance Summary - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning
**Source:** User-provided Phase 04 Provenance Summary Context

<domain>
## Phase Boundary

Phase 04 derives and renders provenance from existing metadata, config intent, and `InventoryReport` evidence. It does not change installer behavior, add destructive scans, or build a verbose audit UI.

</domain>

<decisions>
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

</decisions>

<canonical_refs>
## Canonical References

Downstream agents MUST read these before planning or implementing.

### Planning

- `.planning/PROJECT.md` - Project goal and constraints.
- `.planning/REQUIREMENTS.md` - PROV-01 through PROV-04.
- `.planning/ROADMAP.md` - Phase 04 goal, success criteria, and plan slots.
- `.planning/STATE.md` - Prior decisions and current milestone state.
- `.planning/phases/01-tool-metadata-registry/01-CONTEXT.md` - Metadata registry decisions.
- `.planning/phases/02-machine-inventory-scanner/02-CONTEXT.md` - Inventory evidence and scanner decisions.
- `.planning/phases/03-dotfiles-discovery-map/03-CONTEXT.md` - Summary and dotfile mapping decisions.

### Implementation

- `src/inventory/report.ts` - `InventoryReport`, tool facts, evidence, and warnings.
- `src/inventory/summary.ts` - Shared inventory summary output used by UI flows.
- `src/steps/inventory.tsx` - Wizard inventory rendering path.
- `src/modes/config-first.tsx` - Config-first confirmation rendering path.

</canonical_refs>

<specifics>
## Test Plan

- Unit-test derivation precedence for managed, already-installed, dependency, manual GUI, OS-provided, unmanaged, and unknown.
- Integration-test wizard and config-first summaries share the same provenance lines.
- Test unknown and warning paths with mocked Homebrew scanner failures.
- Keep external commands mocked.

## Current Workspace Note

This context was created after an interrupted implementation attempt. The following source edits may already exist in the working tree and should be reviewed before execution continues:

- `src/inventory/provenance.ts`
- `src/inventory/summary.ts`
- `src/modes/config-first.tsx`

</specifics>

<deferred>
## Deferred Ideas

- A verbose audit view for detailed provenance evidence is deferred. This phase should preserve structured data for future audit views without adding one.

</deferred>

---

*Phase: 04-provenance-summary*
*Context gathered: 2026-06-19*
