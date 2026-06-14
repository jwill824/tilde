---
phase: 02-machine-inventory-scanner
verified: 2026-06-14T01:21:46Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/5
  gaps_closed:
    - "Wizard startup has access to completed installed-tool facts before setup choices."
    - "Installed inventory facts do not become unsafe or invalid apply defaults."
    - "Package-manager inventory detects Homebrew as installed when Homebrew scanning succeeds."
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Run the normal wizard path and confirm the Inventory step appears before shell/package/tool setup choices."
    expected: "The user sees inventory status or summary first; Continue is available only after the scan is ready or explicitly failed, and later setup choices are not reachable while inventory is loading."
    why_human: "Ink user-flow sequencing and terminal interaction feel need a real terminal pass even though integration tests cover rendered states."
  - test: "Run a config-first apply path with an existing config and inspect the confirmation screen."
    expected: "Inventory summary appears before Configuration Summary and Apply/Edit/Start over choices; loading inventory withholds apply choices."
    why_human: "This is a terminal UAT flow and the final on-screen order should be confirmed outside the test renderer."
---

# Phase 2: Machine Inventory Scanner Verification Report

**Phase Goal:** tilde can detect already-installed tools before interaction and distinguish direct Homebrew installs from dependency installs.
**Verified:** 2026-06-14T01:21:46Z
**Status:** human_needed
**Re-verification:** Yes - after gap closure plans 02-06 and 02-07

## MVP Mode Note

ROADMAP marks Phase 2 as `mode: mvp`, but the phase goal is not in canonical user-story form (`As a ..., I want ..., so that ...`). The documented `gsd-tools query user-story.validate` command is not available in this local tool build, so this report verifies the roadmap success criteria and plan must-haves directly and includes goal-derived user-flow coverage below.

## User Flow Coverage

| Step | Expected | Evidence | Status |
|---|---|---|---|
| Startup scan begins | Interactive modes start inventory as loading before wizard/config-first choices | [src/app.tsx](/Users/jeff.williams/Developer/personal/tilde/src/app.tsx:68) initializes `InventoryScanState` as `loading`; [src/app.tsx](/Users/jeff.williams/Developer/personal/tilde/src/app.tsx:91) runs `scanInventory()` and transitions to `ready` or `failed`. | VERIFIED |
| Wizard inventory gate | Setup choices are unavailable while inventory is loading | [src/modes/wizard.tsx](/Users/jeff.williams/Developer/personal/tilde/src/modes/wizard.tsx:316) redirects active setup back to inventory while loading; [src/steps/inventory.tsx](/Users/jeff.williams/Developer/personal/tilde/src/steps/inventory.tsx:22) renders loading text without `SelectInput`. | VERIFIED |
| Config-first inventory gate | Apply choices are unavailable while inventory is loading | [src/modes/config-first.tsx](/Users/jeff.williams/Developer/personal/tilde/src/modes/config-first.tsx:163) returns loading inventory status before constructing apply/edit/cancel choices. | VERIFIED |
| User-visible summary | Users see known installed tools, Homebrew counts, and warnings before decisions | [src/inventory/summary.ts](/Users/jeff.williams/Developer/personal/tilde/src/inventory/summary.ts:7) formats concise lines; [src/steps/inventory.tsx](/Users/jeff.williams/Developer/personal/tilde/src/steps/inventory.tsx:43) and [src/modes/config-first.tsx](/Users/jeff.williams/Developer/personal/tilde/src/modes/config-first.tsx:185) render them before later choices. | VERIFIED |
| Outcome | Users can trust what tilde detected before setup/apply changes | Automated code and integration evidence verifies the flow; final terminal UAT remains required for the live Ink experience. | HUMAN CHECK |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Wizard startup has access to installed-tool facts for package managers, version managers, shells, editors, and known core tools. | VERIFIED | `scanInventory()` builds metadata-backed facts from `allToolMetadata`, Homebrew helper results, app-path checks, shell facts, and core-tool facts in [src/inventory/scan.ts](/Users/jeff.williams/Developer/personal/tilde/src/inventory/scan.ts:33). App passes the resulting `inventoryState` into `Wizard` before setup steps in [src/app.tsx](/Users/jeff.williams/Developer/personal/tilde/src/app.tsx:235). |
| 2 | Homebrew formulae can be marked as direct installs or dependencies. | VERIFIED | `listInstalledOnRequestFormulae()` calls `brew list --installed-on-request --formula --full-name` in [src/utils/package-manager.ts](/Users/jeff.williams/Developer/personal/tilde/src/utils/package-manager.ts:46), and `classifyHomebrewInventory()` maps formulae to `direct`, `dependency`, or `unknown` in [src/inventory/homebrew.ts](/Users/jeff.williams/Developer/personal/tilde/src/inventory/homebrew.ts:25). |
| 3 | Missing or failing external commands do not crash the wizard. | VERIFIED | Homebrew, request-state, language, version-manager, rc-file, and app-path failures are converted to warnings, nulls, or unknown evidence in [src/inventory/scan.ts](/Users/jeff.williams/Developer/personal/tilde/src/inventory/scan.ts:131). App catches startup scanner rejection into a failed warning report at [src/app.tsx](/Users/jeff.williams/Developer/personal/tilde/src/app.tsx:97). |
| 4 | Tests cover scanner success and failure paths with mocked command execution. | VERIFIED | Focused unit tests passed: `npm run test -- tests/unit/inventory-scanner.test.ts tests/unit/inventory-homebrew.test.ts tests/unit/tool-metadata.test.ts` with 27 tests. Test files mock package-manager, env-detection, registry, and fs boundaries. |
| 5 | Installed inventory facts do not become unsafe or invalid apply defaults. | VERIFIED | The earlier `defaultTools` inventory flow is gone: [src/modes/wizard.tsx](/Users/jeff.williams/Developer/personal/tilde/src/modes/wizard.tsx:500) renders `ToolsStep` without `defaultTools`; integration coverage asserts installed metadata ids are not passed as default tools in [tests/integration/wizard-flow.test.tsx](/Users/jeff.williams/Developer/personal/tilde/tests/integration/wizard-flow.test.tsx:427). |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/inventory/report.ts` | Inventory report and scan readiness contract | VERIFIED | Defines evidence-backed facts, Homebrew summary/audit, warnings, environment snapshot, `InventoryScanState`, and empty report helper. |
| `src/inventory/scan.ts` | Read-only startup scanner | VERIFIED | Produces metadata, Homebrew, app-path, shell, core-tool, environment, unmatched audit, and warning data; special-cases `homebrew` command evidence when helpers prove availability. |
| `src/inventory/homebrew.ts` | Homebrew request-status classifier | VERIFIED | Pure classifier returns formula direct/dependency/unknown and direct casks. |
| `src/inventory/summary.ts` | Concise terminal summary helpers | VERIFIED | Formats installed known tools, Homebrew count lines, and warnings from `InventoryReport`. |
| `src/app.tsx` | Startup inventory state owner | VERIFIED | Owns loading/ready/failed transitions and passes `inventoryState` to wizard and config-first paths. |
| `src/steps/inventory.tsx` | Wizard inventory step | VERIFIED | Renders loading without choices; renders ready/failed summary with Continue only after loading ends. |
| `src/modes/wizard.tsx` | Wizard inventory propagation and setup gate | VERIFIED | Uses `inventoryState`, blocks setup steps while loading, and no longer derives `ToolsStep.defaultTools` from installed facts. |
| `src/modes/config-first.tsx` | Config-first inventory summary and apply gate | VERIFIED | Blocks apply choices while loading and renders inventory summary before config confirmation. |
| `src/plugins/first-party/*/metadata.ts` and `src/tools/registry.ts` | Plugin-backed metadata rows for inventory | VERIFIED | Registry imports and validates Homebrew, vfox, VS Code, Neovim, JetBrains, Cursor, and Zed metadata rows. |
| Inventory tests | Mocked scanner, Homebrew, registry, and flow coverage | VERIFIED | Unit and integration spot-checks passed during this verification. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `src/app.tsx` | `src/inventory/scan.ts` | `scanInventory()` startup effect | VERIFIED | App invokes `scanInventory()` for interactive modes. |
| `src/app.tsx` | `src/modes/wizard.tsx` | `inventoryState` prop | VERIFIED | App passes `inventoryState` to `Wizard`; helper checks for older `inventory` wording are stale. |
| `src/app.tsx` | `src/modes/config-first.tsx` | `inventoryState` prop | VERIFIED | App passes `inventoryState` to `ConfigFirstMode`; config-first gates apply choices from that state. |
| `src/modes/wizard.tsx` | `src/steps/inventory.tsx` | `InventoryStep inventoryState` prop | VERIFIED | Wizard renders `InventoryStep` with active inventory state. |
| `src/modes/wizard.tsx` | `src/steps/tools.tsx` | No inventory-derived `defaultTools` | VERIFIED | `ToolsStep` is rendered without `defaultTools`; test asserts the prop stays unset. |
| `src/inventory/scan.ts` | `src/tools/registry.ts` | `allToolMetadata` | VERIFIED | Scanner iterates metadata rows to produce known facts. |
| `src/inventory/scan.ts` | `ToolMetadata.install.appPath` | read-only `access()` check | VERIFIED | Scanner reads `metadata.install?.appPath` and calls `fs/promises.access`; automated helper rejected this plan regex but manual evidence verifies it. |
| `src/inventory/scan.ts` | `src/utils/package-manager.ts` | Homebrew list helpers and request-state helper | VERIFIED | Scanner imports and calls formula, cask, and installed-on-request helpers. |
| `src/inventory/scan.ts` | `src/inventory/homebrew.ts` | `classifyHomebrewInventory` | VERIFIED | Scanner classifies Homebrew lists into request-status data. |
| `src/steps/inventory.tsx` / `src/modes/config-first.tsx` | `src/inventory/summary.ts` | `summarizeInventory()` | VERIFIED | Both surfaces use the same summary helper. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `src/app.tsx` | `inventoryState.report` | `scanInventory()` | Yes; failed scanner becomes explicit warning report | VERIFIED |
| `src/steps/inventory.tsx` | `scanState.report` | `Wizard` / `App` `inventoryState` | Yes after ready/failed; loading does not allow Continue | VERIFIED |
| `src/modes/config-first.tsx` | `inventoryState.report` | `App` startup scan | Yes after ready/failed; loading does not allow apply | VERIFIED |
| `src/inventory/scan.ts` | `report.tools`, `homebrew`, `warnings` | Registry + mocked/external helper boundaries + app-path reads | Yes; failures produce warning/unknown evidence | VERIFIED |
| `src/modes/wizard.tsx` | `ToolsStep` defaults | User input/checkpoint values only | Yes; installed metadata ids do not flow into `config.tools` | VERIFIED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| TypeScript build accepts phase code | `npm run build` | Passed | PASS |
| Scanner/classifier/metadata unit coverage | `npm run test -- tests/unit/inventory-scanner.test.ts tests/unit/inventory-homebrew.test.ts tests/unit/tool-metadata.test.ts` | 3 files, 27 tests passed | PASS |
| Inventory UI/config-first integration coverage | `npm run test:integration -- tests/integration/wizard-flow.test.tsx tests/integration/config-first.test.ts tests/integration/env-capture.test.ts -t inventory` | 3 files, 11 tests passed, 20 skipped | PASS |

### Probe Execution

No `scripts/**/tests/probe-*.sh` files were found, and no Phase 02 plan or summary declared a probe. Step 7c skipped.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| INV-01 | 02-01, 02-02, 02-06, 02-07 | Detect already-installed package managers, version managers, shells, editors, and core tools before wizard interaction. | SATISFIED | Scanner creates metadata-backed, shell, and core-tool facts; App starts inventory in loading state and gates setup until ready/failed; Homebrew metadata id is marked installed when helper evidence proves brew availability. |
| INV-02 | 02-04, 02-07 | Distinguish direct Homebrew installs from dependency installs using `brew list --installed-on-request`. | SATISFIED | Package-manager helper and classifier are implemented and covered by unit tests. |
| INV-03 | 02-03, 02-05, 02-06 | Wizard or summary output can pre-highlight tools that are already installed. | SATISFIED | `summarizeInventory()` lists installed known tools and is rendered in both wizard inventory and config-first confirmation surfaces. |
| INV-04 | 02-01, 02-03, 02-04, 02-05, 02-06, 02-07 | Inventory scans fail softly when an external command is missing, slow, or unavailable. | SATISFIED | Command/helper failures become warnings/unknown evidence; loading scans withhold decisions; startup rejection becomes a failed warning report instead of crashing. |

All Phase 02 requirement IDs from `.planning/REQUIREMENTS.md` are covered. No additional Phase 2 requirements are orphaned.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| None | - | - | - | No unresolved `TODO`, `FIXME`, `XXX`, `TBD`, placeholder, or debt-marker blockers were found in the modified phase source/test files. Empty returns found by grep are normal fallback/control-flow values, not user-visible stubs. |

### Human Verification Required

### 1. Wizard Inventory Flow

**Test:** Run the normal wizard path and confirm the Inventory step appears before shell/package/tool setup choices.
**Expected:** The user sees inventory status or summary first; Continue is available only after the scan is ready or explicitly failed, and later setup choices are not reachable while inventory is loading.
**Why human:** Ink user-flow sequencing and terminal interaction feel need a real terminal pass even though integration tests cover rendered states.

### 2. Config-First Inventory Flow

**Test:** Run a config-first apply path with an existing config and inspect the confirmation screen.
**Expected:** Inventory summary appears before Configuration Summary and Apply/Edit/Start over choices; loading inventory withholds apply choices.
**Why human:** This is a terminal UAT flow and the final on-screen order should be confirmed outside the test renderer.

### Gaps Summary

No code gaps remain from the prior verification. The previous three blockers were closed by explicit loading/ready/failed inventory state, removal of broad inventory-derived `ToolsStep.defaultTools`, and Homebrew command evidence for metadata id `homebrew`.

The phase goal is achieved in the codebase, pending the two concrete terminal UAT checks listed above. Because human verification items are present, the GSD status is `human_needed`, not `passed`.

---

_Verified: 2026-06-14T01:21:46Z_
_Verifier: the agent (gsd-verifier)_
