---
phase: 02-machine-inventory-scanner
verified: 2026-06-13T22:48:37Z
status: gaps_found
next_action: plan_gaps
score: 3/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Wizard startup has access to completed installed-tool facts before setup choices."
    status: failed
    reason: "App passes createEmptyInventoryReport() to Wizard and ConfigFirstMode while scanInventory() is still pending, and InventoryStep renders 'Inventory scan complete' with Continue immediately."
    artifacts:
      - path: "src/app.tsx"
        issue: "Inventory state has no loading/ready status; initial empty report is indistinguishable from a completed scan."
      - path: "src/steps/inventory.tsx"
        issue: "Always renders completion text and enables Continue for whatever report prop it receives."
      - path: "src/modes/wizard.tsx"
        issue: "Advancing from inventory stores empty/default-derived values before the async startup scan may resolve."
    missing:
      - "Track inventory loading separately from report data."
      - "Block or clearly hold the inventory step until the scan resolves or fails into an explicit fallback warning report."
  - truth: "Installed inventory facts do not become unsafe or invalid apply defaults."
    status: failed
    reason: "Wizard feeds every installed known metadata id into ToolsStep.defaultTools; ToolsStep serializes those ids into config.tools, and installAll installs config.tools through the active package manager."
    artifacts:
      - path: "src/modes/wizard.tsx"
        issue: "getInstalledKnownToolFacts(inventoryReport).map(tool => tool.toolId) is used as generic package defaults."
      - path: "src/steps/tools.tsx"
        issue: "defaultTools becomes manual tool input and is returned in config.tools."
      - path: "src/installer/index.ts"
        issue: "config.tools entries are passed directly to pkgManager.installPackages()."
    missing:
      - "Remove broad inventory-driven defaultTools, or filter/translate facts to the actual install surface before writing config.tools."
      - "Keep package managers, editors, browsers, and version managers out of the generic tools install list unless explicitly mapped for that step."
  - truth: "Package-manager inventory detects Homebrew as installed when Homebrew scanning succeeds."
    status: partial
    reason: "The real Homebrew metadata row has only manualNote, so createMetadataFact() has no evidence source that can mark the Homebrew tool fact installed even when brew list helpers succeed."
    artifacts:
      - path: "src/plugins/first-party/homebrew/metadata.ts"
        issue: "No command, app-path, formula, or cask evidence exists for the homebrew metadata row."
      - path: "src/inventory/scan.ts"
        issue: "Successful Homebrew helper calls populate counts but do not produce installed evidence for metadata id homebrew."
    missing:
      - "Add command evidence or a scanner special case that marks Homebrew installed when Homebrew helper calls prove brew is available."
---

# Phase 2: Machine Inventory Scanner Verification Report

**Phase Goal:** Machine Inventory Scanner: known installed-tool facts before setup/apply decisions so users can trust what tilde will manage before it changes anything.
**Verified:** 2026-06-13T22:48:37Z
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Wizard startup has access to installed-tool facts for package managers, version managers, shells, editors, and known core tools before decisions. | FAILED | Scanner artifacts exist, but [src/app.tsx](/Users/jeff.williams/Developer/personal/tilde/src/app.tsx:68) initializes an empty report and passes it to Wizard at [src/app.tsx](/Users/jeff.williams/Developer/personal/tilde/src/app.tsx:227) while `scanInventory()` is pending at [src/app.tsx](/Users/jeff.williams/Developer/personal/tilde/src/app.tsx:88). [src/steps/inventory.tsx](/Users/jeff.williams/Developer/personal/tilde/src/steps/inventory.tsx:22) still says scan complete and enables Continue. Homebrew also remains unknown because its metadata has no evidence source. |
| 2 | Homebrew formulae can be marked as direct installs or dependencies. | VERIFIED | `listInstalledOnRequestFormulae()` uses `brew list --installed-on-request --formula --full-name` at [src/utils/package-manager.ts](/Users/jeff.williams/Developer/personal/tilde/src/utils/package-manager.ts:46), and `classifyHomebrewInventory()` maps formulae to `direct`, `dependency`, or `unknown` at [src/inventory/homebrew.ts](/Users/jeff.williams/Developer/personal/tilde/src/inventory/homebrew.ts:25). |
| 3 | Missing or failing external commands do not crash the wizard. | VERIFIED | Scanner helpers catch Homebrew, request-state, environment, and app-path failures into warnings/null/empty fallback data in [src/inventory/scan.ts](/Users/jeff.williams/Developer/personal/tilde/src/inventory/scan.ts:127), and App catches startup scanner rejection into `inventory-startup-failed` at [src/app.tsx](/Users/jeff.williams/Developer/personal/tilde/src/app.tsx:92). Slow scans remain a blocker under truth 1 because the UI can proceed before completion. |
| 4 | Tests cover scanner success and failure paths with mocked command execution. | VERIFIED | Focused unit run passed: `npm run test -- tests/unit/inventory-scanner.test.ts tests/unit/inventory-homebrew.test.ts tests/unit/package-manager.test.ts tests/unit/tool-metadata.test.ts` with 26 passing tests. Tests mock package-manager/env/fs boundaries in [tests/unit/inventory-scanner.test.ts](/Users/jeff.williams/Developer/personal/tilde/tests/unit/inventory-scanner.test.ts:23). |
| 5 | Installed inventory facts help users trust what tilde will manage before changes. | FAILED | Installed metadata ids are used as generic tool defaults at [src/modes/wizard.tsx](/Users/jeff.williams/Developer/personal/tilde/src/modes/wizard.tsx:480). `ToolsStep` returns those defaults as `config.tools` at [src/steps/tools.tsx](/Users/jeff.williams/Developer/personal/tilde/src/steps/tools.tsx:106), and `installAll()` installs `config.tools` at [src/installer/index.ts](/Users/jeff.williams/Developer/personal/tilde/src/installer/index.ts:40). This can convert an installed metadata id such as `vscode` into a package install request instead of the cask id `visual-studio-code`. |

**Score:** 3/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/inventory/report.ts` | Inventory report types and empty report helper | VERIFIED | Exists and substantive; exports report, fact, evidence, warning, environment, Homebrew summary, and `createEmptyInventoryReport()`. |
| `src/inventory/scan.ts` | Startup scanner for metadata, Homebrew, app paths, shell/core facts, warnings | VERIFIED WITH GAP | Scanner is substantive and wired, but UI consumers treat initial empty state as completed scan. |
| `src/inventory/homebrew.ts` | Pure Homebrew request-status classifier | VERIFIED | `direct`, `dependency`, and `unknown` classifier is present and tested. |
| `src/inventory/summary.ts` | Concise summary helpers | VERIFIED | Renders installed known tools, Homebrew counts, and warnings. |
| `src/steps/inventory.tsx` | Wizard inventory step | VERIFIED WITH GAP | Renders summary, but lacks loading/ready state and always says scan complete. |
| `src/modes/wizard.tsx` | Wizard inventory propagation and defaults | FAILED | Inventory report is wired, but installed facts are also mapped into generic tool install defaults. |
| `src/modes/config-first.tsx` | Config-first inventory summary before apply | VERIFIED WITH GAP | Renders inventory before config summary when a report exists; receives the same premature empty App report while scan is pending. |
| `src/tools/registry.ts` and first-party metadata files | Plugin-backed inventory metadata rows | VERIFIED WITH GAP | Metadata rows are aggregated and validated; Homebrew package-manager row lacks detection evidence. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `src/inventory/scan.ts` | `src/tools/registry.ts` | `allToolMetadata` | VERIFIED | Automated key-link check found registry usage. |
| `src/inventory/scan.ts` | `src/utils/package-manager.ts` | Formula/cask/request-state helpers | VERIFIED | Scanner imports and calls `listInstalledFormulae`, `listInstalledCasks`, and `listInstalledOnRequestFormulae`. |
| `src/inventory/scan.ts` | `ToolMetadata.install.appPath` | read-only access check | VERIFIED | Manual check: [src/inventory/scan.ts](/Users/jeff.williams/Developer/personal/tilde/src/inventory/scan.ts:243) reads `install?.appPath`, and [src/inventory/scan.ts](/Users/jeff.williams/Developer/personal/tilde/src/inventory/scan.ts:277) uses `access(appPath)`. The automated helper rejected the plan regex as invalid. |
| `src/app.tsx` | `src/modes/wizard.tsx` | `inventory` prop | WIRED BUT HOLLOW | Prop is wired, but the first value is the empty report before the async scan completes. |
| `src/app.tsx` | `src/modes/config-first.tsx` | `inventory` prop | WIRED BUT HOLLOW | Same premature empty report issue. |
| `src/modes/wizard.tsx` | `src/steps/tools.tsx` | `defaultTools` | FAILED | This link is unsafe: installed metadata ids flow into `config.tools` install requests. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `src/app.tsx` | `inventory` | `createEmptyInventoryReport()` then async `scanInventory()` | Eventually yes, initially empty | HOLLOW - consumers can proceed before real data arrives. |
| `src/steps/inventory.tsx` | `inventory` prop | `Wizard`/`App` | Depends on parent | HOLLOW - displays completion for empty in-flight report. |
| `src/modes/config-first.tsx` | `inventory` prop | `App` startup state | Depends on parent | HOLLOW - summary can render empty report while scan is pending. |
| `src/modes/wizard.tsx` | `defaultTools` | `getInstalledKnownToolFacts(inventoryReport).map(toolId)` | Real but wrong shape | FAILED - metadata ids are not generic Homebrew package names. |
| `src/inventory/scan.ts` | `report.tools`, `homebrew`, `warnings` | Registry + mocked/external helpers + app-path access | Yes | VERIFIED for scanner data production. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| TypeScript build accepts phase code | `npm run build` | Passed | PASS |
| Scanner/classifier/package-manager/metadata unit coverage | `npm run test -- tests/unit/inventory-scanner.test.ts tests/unit/inventory-homebrew.test.ts tests/unit/package-manager.test.ts tests/unit/tool-metadata.test.ts` | 4 files, 26 tests passed | PASS |
| Inventory integration coverage | `npm run test:integration -- tests/integration/config-first.test.ts tests/integration/env-capture.test.ts tests/integration/wizard-flow.test.tsx -t inventory` | 3 files passed, 5 tests passed, 20 skipped | PASS |

### Probe Execution

No `scripts/**/tests/probe-*.sh` files were found. Step 7c skipped.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| INV-01 | 02-01, 02-02 | Detect already-installed package managers, version managers, shells, editors, and core tools before wizard interaction. | BLOCKED | Scanner can produce shell/core/editor/version-manager facts, but wizard interaction can happen before scan completion. Homebrew package-manager fact also remains unknown because metadata has no evidence source. |
| INV-02 | 02-04 | Distinguish direct Homebrew installs from dependency installs using `brew list --installed-on-request`. | SATISFIED | Helper and classifier are implemented and tested. |
| INV-03 | 02-03, 02-05 | Wizard or summary output can pre-highlight tools that are already installed. | BLOCKED | Summary rendering exists, but it can show an empty completed scan before real inventory exists, and installed facts are reused as generic install defaults. |
| INV-04 | 02-01, 02-03, 02-04, 02-05 | Inventory scans fail softly when an external command is missing, slow, or unavailable. | PARTIAL | Missing/unavailable command failures become warnings and do not crash. Slow in-flight scans are not represented as loading, so users can proceed with empty facts. |

All four requested requirement IDs are accounted for. No additional Phase 2 requirement IDs are orphaned in `.planning/REQUIREMENTS.md`.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `src/app.tsx` | 68 | Empty report initial state used as completed data | BLOCKER | Hides loading state and lets setup decisions proceed with no scan results. |
| `src/modes/wizard.tsx` | 482 | Metadata ids mapped to generic package defaults | BLOCKER | Can cause invalid or unintended package install requests during apply. |
| `tests/integration/env-capture.test.ts` | 122 | Impossible `InventoryReport` fixture shape | WARNING | Fixture omits required request-status fields and uses old unmatched shapes, reducing test value. |
| `tests/integration/config-first.test.ts` | 42 | Impossible unmatched Homebrew fixture shape | WARNING | Uses `name` where production data uses `id`; tests can pass while drifting from report contract. |
| `tests/integration/wizard-flow.test.tsx` | 67 | Impossible unmatched Homebrew fixture shape | WARNING | Same fixture drift weakens integration coverage. |

No unresolved `TODO`, `FIXME`, or `XXX` markers were found in the modified phase source files.

### Human Verification Required

None for this gate. The blockers are observable in source and data flow.

### Gaps Summary

Phase 2 is not achieved yet. The scanner and Homebrew request-status classifier exist and pass focused tests, but the user-visible trust contract is broken in two places: the wizard can proceed from a fake completed empty inventory state before scanning finishes, and installed inventory facts can be converted into package-manager install requests with metadata ids. A smaller package-manager detection gap also remains for Homebrew itself.

The MVP-mode roadmap metadata is also inconsistent: `roadmap.get-phase 02` reports `mode: mvp`, but the roadmap goal is not in the required user-story format. The documented `user-story.validate` query was not available in this local `gsd-tools` build, so this verification used the roadmap success criteria plus PLAN frontmatter must-haves.

---

_Verified: 2026-06-13T22:48:37Z_
_Verifier: the agent (gsd-verifier)_
