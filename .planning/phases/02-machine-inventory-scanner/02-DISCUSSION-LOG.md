# Phase 2: Machine Inventory Scanner - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-13
**Phase:** 2-Machine Inventory Scanner
**Areas discussed:** Inventory fact shape, Scanner ownership and startup flow, Homebrew classification behavior, Wizard integration level

---

## Inventory Fact Shape

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| What should the scanner return for each known tool? | Minimal installed facts; Evidence-backed facts; Provenance-ready records; You decide | You decide -> evidence-backed facts, with full provenance deferred |
| How should scan failures be represented? | Per-tool unknown; Scanner-level warnings; Both facts and warnings; You decide | You decide -> both facts and warnings |
| Should Phase 2 include installed tools that are not in the shared metadata registry? | No, known tools only; Include unmatched Homebrew packages separately; Include all unmatched tools in the same facts array; You decide | Include unmatched Homebrew packages separately |
| How strict should the first pass be about categories? | Registry categories only; Phase success categories only; Best available categories; You decide | You decide -> best available categories |

**Notes:** Inventory should produce evidence-backed known-tool facts, allow inconclusive per-tool states, collect report-level warnings, and keep unmatched Homebrew detections in a separate audit section.

---

## Scanner Ownership and Startup Flow

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| Where should the new inventory scanner live? | Extend `src/capture/scanner.ts`; Add `src/inventory/`; Put it under `src/tools/`; You decide | Add `src/inventory/` |
| When should the inventory scan run? | App splash/startup before wizard steps; Inside the first wizard step only; Lazy per step; You decide | You decide -> app splash/startup before wizard steps |
| Should the existing `EnvironmentCaptureReport` be changed directly? | Keep separate reports; Extend `EnvironmentCaptureReport`; Replace environment capture with inventory; You decide | Replace environment capture with inventory |
| How far should replacing environment capture with inventory go in Phase 2? | Compatibility wrapper; Full rename/refactor; Internal replacement only; You decide | Full rename/refactor |

**Notes:** The user chose a broad refactor: inventory becomes the primary scanner boundary, with wizard usage moved to inventory terminology throughout Phase 2.

---

## Homebrew Classification Behavior

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| How should Phase 2 classify Homebrew formulae? | Direct vs dependency only for known registry formulae; Classify all installed formulae; Classify known formulae first, unmatched only as names; You decide | Classify all installed formulae |
| How should casks be handled? | Installed only; Direct by default; Separate cask status; You decide | Direct by default |
| What should happen if `brew list --installed-on-request` fails but `brew list` succeeds? | Keep installed facts, mark request classification unknown; Treat all installed formulae as unknown provenance; Drop Homebrew facts entirely; You decide | You decide -> keep installed facts and mark classification unknown |
| Should Homebrew calls use `run()`, package-manager helpers, or an inventory-local adapter? | Use existing `run()` in inventory; Extend `src/utils/package-manager.ts`; Inventory-local command adapter; You decide | Extend `src/utils/package-manager.ts` |

**Notes:** The long-term decision is to centralize Homebrew command knowledge in `src/utils/package-manager.ts`, while `src/inventory/` owns interpretation into inventory facts and audit sections.

---

## Wizard Integration Level

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| How visible should inventory be in the wizard during Phase 2? | Data only; Existing step pre-highlight; Summary-level integration; You decide | Summary-level integration |
| Where should the summary appear? | During startup/splash completion; In the existing environment capture step; In final review/apply summary; You decide | In the existing environment capture step |
| How much detail should the summary show by default? | Counts only; Grouped short list; Full audit-style details; You decide | Grouped short list |
| What should happen in non-interactive/config-first paths? | Inventory available but not rendered; Render concise inventory summary before apply confirmation; Only expose JSON/data internally; You decide | Render concise inventory summary before apply confirmation |

**Notes:** Phase 2 should show a concise grouped summary in the early inventory step and in config-first apply confirmation, without defaulting to full audit output.

---

## the agent's Discretion

- Several "You decide" answers were resolved into concrete defaults during discussion: evidence-backed facts, both per-tool unknown states and report warnings, best available categories, startup scanning, unknown Homebrew classification fallback, and package-manager helper centralization.
- Exact TypeScript names, summary wording, and the scanner-owned category enum remain implementation discretion within the locked decisions.

## Deferred Ideas

- Full provenance category labeling remains Phase 4.
- Full unmatched ecosystem search/wrapper behavior remains deferred.
- Deep per-step UI rewrites beyond summary-level integration are not required unless naturally produced by the inventory refactor.
