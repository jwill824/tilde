# Phase 2: Machine Inventory Scanner - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase creates a read-only machine inventory scanner that runs before user decisions, detects known installed tools through the shared metadata registry, classifies Homebrew formulae as direct installs or dependencies when possible, and surfaces a concise inventory summary in wizard and config-first flows. It should replace the older environment-capture boundary with inventory terminology where practical, while preserving non-destructive scanning and mocked external-command tests.

</domain>

<decisions>
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope
- `.planning/PROJECT.md` — Defines the milestone sequence, core value, constraints, and the read-first inventory decision.
- `.planning/REQUIREMENTS.md` — Defines Phase 2 requirements `INV-01` through `INV-04`.
- `.planning/ROADMAP.md` — Defines Phase 2 goal, success criteria, and planned slices.
- `.planning/STATE.md` — Records current focus and the concern not to deepen registry inconsistency.
- `.planning/phases/01-tool-metadata-registry/01-CONTEXT.md` — Locks the shared metadata registry decisions Phase 2 must build on.

### Codebase Maps
- `.planning/codebase/STACK.md` — Confirms Node.js, TypeScript, Ink, Vitest, and external command mocking constraints.
- `.planning/codebase/ARCHITECTURE.md` — Describes startup flow, wizard mode layering, plugin registry, and command runner boundaries.
- `.planning/codebase/INTEGRATIONS.md` — Describes Homebrew and other CLI integrations that inventory must mock and fail softly.

### Existing Code
- `src/capture/scanner.ts` — Existing environment capture scanner to refactor/replace with inventory terminology.
- `src/utils/package-manager.ts` — Homebrew helper boundary to extend with installed-on-request listing.
- `src/tools/metadata.ts` — Shared metadata schema and category definitions.
- `src/tools/registry.ts` — Registry lookup helpers inventory should use for known-tool facts.
- `src/app.tsx` — Startup/splash flow where inventory should run before wizard steps.
- `src/steps/env-capture.tsx` — Existing early capture step to rename/refactor into inventory summary UI.
- `src/modes/wizard.tsx` — Wizard state flow currently consuming capture output.
- `src/modes/config-first.tsx` — Config-first flow that should render a concise inventory summary before apply confirmation.
- `tests/unit/capture-scanner.test.ts` — Current scanner test pattern and soft-failure coverage to adapt.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/capture/scanner.ts`: Already scans dotfiles, Homebrew packages, rc files, languages, and version managers. It provides useful scan logic but should not remain the primary Phase 2 boundary.
- `src/utils/package-manager.ts`: Already centralizes Homebrew formula/cask listing and install checks. It is the long-term location for additional Homebrew command helpers.
- `src/tools/registry.ts`: Provides metadata lookup by id, category, platform, Homebrew formula/cask id, config path, dotfile path, variant, and source.
- `src/app.tsx`: Already performs startup environment capture before rendering flows, making it the natural place to initiate inventory.
- `src/steps/env-capture.tsx`: Existing early wizard step can be renamed/refactored into the inventory summary surface.

### Established Patterns
- Source uses TypeScript ESM with `.js` import extensions.
- External commands must be mocked in tests; scanner failures should return structured warnings rather than crashing user flows.
- Wizard UI uses Ink components and should stay concise enough for terminal workflows.
- Phase 1 intentionally kept metadata separate from `PluginRegistry`; inventory should consume metadata without forcing every tool into a plugin contract.

### Integration Points
- Inventory should use shared metadata for known-tool facts and keep unmatched Homebrew detections separate.
- Homebrew classification should come through package-manager helpers and be interpreted by `src/inventory/`.
- Wizard startup should make the inventory report available to the early inventory step and later summaries.
- Config-first mode should show the same concise inventory summary before apply confirmation.

</code_context>

<specifics>
## Specific Ideas

- A useful report shape likely has sections for known tool facts, unmatched Homebrew formulae/casks, and warnings.
- Known-tool facts should explain detection evidence without pretending to solve all Phase 4 provenance categories.
- Default UI should summarize rather than dump the full audit: known installed tools, direct/dependency counts, and warnings.

</specifics>

<deferred>
## Deferred Ideas

- Full provenance labeling, including tilde-managed, manual, OS-provided, app-store/manual GUI install, and unknown categories, remains Phase 4.
- Full unmatched ecosystem search/wrapper behavior remains out of scope for v1 inventory and belongs to the deferred wrapper/search work.
- Deep per-step UI rewrites beyond summary-level integration are not required for Phase 2 unless they naturally follow from the inventory refactor.

</deferred>

---

*Phase: 2-Machine Inventory Scanner*
*Context gathered: 2026-06-13*
