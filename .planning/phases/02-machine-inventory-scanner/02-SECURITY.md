---
phase: 02-machine-inventory-scanner
reviewed: 2026-06-14T05:00:02Z
threats_total: 32
threats_open: 0
status: verified
asvs_level: 1
block_on: high
register_authored_at_plan_time: true
---

# Phase 02 - Security

Per-phase security contract for the machine inventory scanner. This audit verifies only the plan-time threat register in `02-01-PLAN.md` through `02-07-PLAN.md`; it does not scan for new threats beyond the declared register.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| External CLI output -> inventory scanner | Homebrew and environment helper output is parsed into facts. | Package names, request status, command availability |
| Local filesystem -> inventory scanner | Dotfiles, rc files, git config, and app bundle paths are read for inventory evidence. | Rc/gitconfig content, app-path existence booleans |
| Static metadata -> registry consumers | Metadata rows drive scanner facts and user-facing summaries. | Tool ids, labels, app paths, Homebrew ids, config paths |
| Inventory report -> UI summaries | Evidence and warnings influence wizard/config-first decisions. | Aggregate counts, known labels, warning messages |
| Startup scanner -> App state | Async scanner state gates setup/apply choices. | Loading, ready, failed states plus warning report |
| Inventory report -> setup steps | Inventory evidence must not become install defaults without explicit mapping. | Tool facts and metadata ids |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status | Evidence |
|-----------|----------|-----------|-------------|------------|--------|----------|
| T-02-01 | Tampering | `src/inventory/scan.ts` Homebrew matching | mitigate | Use Homebrew helper result arrays; do not concatenate package names into shell strings. | closed | `src/inventory/scan.ts:102-106` calls helper functions; `src/utils/package-manager.ts:15-17` executes `brew` with arg arrays; `src/utils/package-manager.ts:24-47` uses fixed list arg arrays. |
| T-02-02 | Information Disclosure | `src/inventory/scan.ts` rc/env capture compatibility | mitigate | Keep rc/gitconfig under `environment`, preserve secret exclusion behavior, and do not resolve backend references. | closed | `src/inventory/scan.ts:45-50` stores data under `environment`; `src/inventory/scan.ts:167-175` applies `createCaptureFilter()`/`filterDotfiles()`; `src/capture/filter.ts:5-10` uses default secret patterns; `src/capture/parser.ts:1-34` filters `ghp_`, `sk-`, `AKIA`, and `op://` export values without resolving them. |
| T-02-03 | Spoofing | `src/inventory/summary.ts` labels | mitigate | Render evidence/count labels only; no final provenance labels. | closed | `src/inventory/summary.ts:7-21` renders known installed tools, Homebrew counts, and warnings only. |
| T-02-04 | Denial of Service | `scanInventory()` subsystem failures | mitigate | Catch subsystem failures independently and convert to warnings/unknown states. | closed | `src/inventory/scan.ts:131-155` catches Homebrew list/request failures; `src/inventory/scan.ts:158-185` catches environment detectors; `src/inventory/scan.ts:296-326` catches app-path failures. |
| T-02-04A | Information Disclosure | `scanInventory()` app-path checks | mitigate | Check only metadata-declared `install.appPath` with read-only access and persist only path plus exists boolean. | closed | `src/inventory/scan.ts:267-310` reads `metadata.install?.appPath`, calls `access(appPath)`, and emits `{ type: 'app-path', path, exists }`; `src/inventory/report.ts:13-19` defines no other app-path payload. |
| T-02-05 | Tampering | `src/tools/registry.ts` metadata aggregation | mitigate | Validate all rows through `validateToolMetadata`; test expected ids and lookups. | closed | `src/tools/registry.ts:18-28` wraps aggregated metadata in `validateToolMetadata`; `tests/unit/tool-metadata.test.ts:61` asserts validation; `tests/unit/tool-metadata.test.ts:151-197` asserts expected ids and Homebrew lookups. |
| T-02-06 | Spoofing | New metadata labels/install ids | mitigate | Derive labels and Homebrew identifiers from static first-party metadata and test exact rows. | closed | `src/plugins/first-party/*/metadata.ts` exports static `ToolMetadata[]` rows only; `tests/unit/tool-metadata.test.ts:173-197` asserts exact package-manager/version-manager/editor labels and Homebrew formula/cask ids. |
| T-02-07 | Information Disclosure | Metadata files | accept | Static metadata contains install/config paths only; no raw secrets or user files are read in this plan. | closed | Documented in Accepted Risks Log as `AR-02-01`; static rows inspected in `src/plugins/first-party/*/metadata.ts`. |
| T-02-08 | Denial of Service | `src/app.tsx` startup scan | mitigate | Initialize fallback report, catch scan failures, and convert to `inventory-startup-failed`. | closed | `src/app.tsx:68-71` initializes loading state with `createEmptyInventoryReport()`; `src/app.tsx:91-112` catches `scanInventory()` rejection and emits warning id `inventory-startup-failed`. |
| T-02-09 | Spoofing | `src/steps/inventory.tsx` summary text | mitigate | Render concise inventory evidence and warnings only; avoid final provenance labels. | closed | `src/steps/inventory.tsx:35-43` selects ready/failed heading and delegates all lines to `summarizeInventory()`. |
| T-02-10 | Information Disclosure | `src/modes/wizard.tsx` defaults from inventory environment | mitigate | Reuse filtered rc/gitconfig data and render summaries instead of raw rc/env content. | closed | `src/modes/wizard.tsx:484-487` reads only parsed git identity and detected languages from `inventoryReport.environment`; `src/capture/parser.ts:50-77` parses gitconfig fields; `src/inventory/summary.ts:7-21` renders aggregate summary lines. |
| T-02-11 | Tampering | `listInstalledOnRequestFormulae()` | mitigate | Call `runBrew()` with exact argument array; no shell string interpolation. | closed | `src/utils/package-manager.ts:46-47` calls `runBrew(['list', '--installed-on-request', '--formula', '--full-name'])`; `tests/unit/package-manager.test.ts:25-27` asserts the exact `execa('brew', args)` call. |
| T-02-12 | Spoofing | `summarizeInventory()` Homebrew labels | mitigate | Render request-status counts and warnings only; avoid final provenance labels. | closed | `src/inventory/summary.ts:12-21` renders direct/dependency/unknown counts and warnings only. |
| T-02-13 | Denial of Service | `scanInventory()` request-state lookup | mitigate | Catch installed-on-request failures independently, keep installed package data, emit `homebrew-request-state-unavailable`. | closed | `src/inventory/scan.ts:144-155` catches request-state failure with the required id; `tests/unit/inventory-scanner.test.ts:285-314` verifies installed facts are kept with unknown request status. |
| T-02-14 | Information Disclosure | Homebrew audit data | accept | Formula/cask names are local package identifiers; default summary renders counts while unmatched detail stays structured. | closed | Documented in Accepted Risks Log as `AR-02-02`; `src/inventory/summary.ts:12-15` renders counts, not unmatched formula names. |
| T-02-15 | Spoofing | Config-first and wizard inventory summaries | mitigate | Render counts, known labels, and warnings only; block final provenance labels. | closed | `src/modes/config-first.tsx:185-190` and `src/steps/inventory.tsx:43-50` render only `summarizeInventory()` lines; `src/inventory/summary.ts:12-21` contains no final provenance labels. |
| T-02-16 | Information Disclosure | Config-first inventory block | mitigate | Render aggregate counts and known labels only; do not dump rc/env content or unmatched audit names. | closed | `src/modes/config-first.tsx:185-199` renders summary lines before `ConfigSummary`; `tests/integration/config-first.test.ts:122-127` asserts the inventory block has counts/warnings and omits unmatched `ripgrep`. |
| T-02-17 | Denial of Service | `ConfigFirstMode` inventory display | mitigate | Accept report/state as props and do not run scanner commands from config-first rendering. | closed | `src/modes/config-first.tsx:18-24` declares `inventory`/`inventoryState` props and has no `scanInventory` import; `src/app.tsx:214-217` passes App-owned `inventoryState`. |
| T-02-18 | Spoofing | `InventoryStep` headings | mitigate | Show complete only for ready and failed only for explicit failed state. | closed | `src/steps/inventory.tsx:22-37` handles loading separately and derives heading from `scanState.status`; `tests/integration/wizard-flow.test.tsx:512-555` verifies failed status remains failed after navigation. |
| T-02-19 | Tampering | `Wizard` -> `ToolsStep.defaultTools` | mitigate | Remove broad inventory metadata id flow into generic package install input. | closed | `src/modes/wizard.tsx:500-514` renders `ToolsStep` without `defaultTools`; `tests/integration/wizard-flow.test.tsx:427-509` verifies installed inventory ids do not populate `defaultTools`. |
| T-02-20 | Denial of Service | pending `scanInventory()` | mitigate | Render loading state without setup/apply choices until ready or failed. | closed | `src/steps/inventory.tsx:22-28` renders loading without `SelectInput`; `src/modes/wizard.tsx:316-317` redirects setup steps back to inventory while loading; `src/modes/config-first.tsx:163-170` returns before apply choices. |
| T-02-21 | Information Disclosure | inventory summaries | mitigate | Use aggregate summary lines and warnings; do not dump rc/env contents or unmatched Homebrew audit names. | closed | `src/inventory/summary.ts:12-21` formats aggregate lines only; `tests/integration/config-first.test.ts:122-127` verifies unmatched audit names stay out of the inventory block. |
| T-02-22 | Spoofing | `homebrew` package-manager fact | mitigate | Mark installed only when a Homebrew helper resolves; failed helpers produce unknown warning-backed evidence. | closed | `src/inventory/scan.ts:102-108` derives availability from helper resolution; `src/inventory/scan.ts:205-220` sets installed or unknown evidence; `tests/unit/inventory-scanner.test.ts:317-363` covers success and failure. |
| T-02-23 | Tampering | Homebrew command evidence | mitigate | Use existing helper results; no new shell strings or arbitrary input parsing. | closed | `src/inventory/scan.ts:6` imports existing helpers; `src/inventory/scan.ts:102-106` uses helper outcomes; `src/utils/package-manager.ts:15-47` uses `execa('brew', args)` with arg arrays. |
| T-02-24 | Repudiation | scanner warning evidence | mitigate | Attach first Homebrew warning id to inconclusive `homebrew` evidence. | closed | `src/inventory/scan.ts:210-218` attaches `warningId`; `src/inventory/scan.ts:389-390` selects the first source warning id; `tests/unit/inventory-scanner.test.ts:351-359` asserts warning-backed evidence. |
| T-02-SC (02-01) | Tampering | npm installs | accept | No package-manager install tasks exist in this plan; package legitimacy audit lists no new packages. | closed | Documented in Accepted Risks Log as `AR-02-SC-01`; `02-01-SUMMARY.md` tech-stack added list is empty. |
| T-02-SC (02-02) | Tampering | npm installs | accept | No package-manager install tasks exist in this plan; package legitimacy audit lists no new packages. | closed | Documented in Accepted Risks Log as `AR-02-SC-02`; `02-02-SUMMARY.md` tech-stack added list is empty. |
| T-02-SC (02-03) | Tampering | npm installs | accept | No package-manager install tasks exist in this plan; package legitimacy audit lists no new packages. | closed | Documented in Accepted Risks Log as `AR-02-SC-03`; `02-03-SUMMARY.md` tech-stack added list is empty. |
| T-02-SC (02-04) | Tampering | npm installs | accept | No package-manager install tasks exist in this plan; package legitimacy audit lists no new packages. | closed | Documented in Accepted Risks Log as `AR-02-SC-04`; `02-04-SUMMARY.md` tech-stack added list is empty. |
| T-02-SC (02-05) | Tampering | npm installs | accept | No package-manager install tasks exist in this plan; package legitimacy audit lists no new packages. | closed | Documented in Accepted Risks Log as `AR-02-SC-05`; `02-05-SUMMARY.md` tech-stack added list is empty. |
| T-02-SC (02-06) | Tampering | npm installs | accept | No package-manager install tasks exist in this plan; package legitimacy audit lists no new packages. | closed | Documented in Accepted Risks Log as `AR-02-SC-06`; `02-06-SUMMARY.md` tech-stack added list is empty. |
| T-02-SC (02-07) | Tampering | npm installs | accept | No package-manager install tasks exist in this plan; package legitimacy audit lists no new packages. | closed | Documented in Accepted Risks Log as `AR-02-SC-07`; `02-07-SUMMARY.md` tech-stack added list is empty. |

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-07 | Static metadata contains install/config paths only. This phase does not read user files through metadata files. | plan-time acceptance | 2026-06-14 |
| AR-02-02 | T-02-14 | Homebrew formula/cask names are local package identifiers. Default summaries expose counts while unmatched names remain structured report data. | plan-time acceptance | 2026-06-14 |
| AR-02-SC-01 | T-02-SC (02-01) | No package-manager install tasks or new npm packages in plan 02-01. | plan-time acceptance | 2026-06-14 |
| AR-02-SC-02 | T-02-SC (02-02) | No package-manager install tasks or new npm packages in plan 02-02. | plan-time acceptance | 2026-06-14 |
| AR-02-SC-03 | T-02-SC (02-03) | No package-manager install tasks or new npm packages in plan 02-03. | plan-time acceptance | 2026-06-14 |
| AR-02-SC-04 | T-02-SC (02-04) | No package-manager install tasks or new npm packages in plan 02-04. | plan-time acceptance | 2026-06-14 |
| AR-02-SC-05 | T-02-SC (02-05) | No package-manager install tasks or new npm packages in plan 02-05. | plan-time acceptance | 2026-06-14 |
| AR-02-SC-06 | T-02-SC (02-06) | No package-manager install tasks or new npm packages in plan 02-06. | plan-time acceptance | 2026-06-14 |
| AR-02-SC-07 | T-02-SC (02-07) | No package-manager install tasks or new npm packages in plan 02-07. | plan-time acceptance | 2026-06-14 |

## Unregistered Flags

None. `02-01-SUMMARY.md` through `02-06-SUMMARY.md` Threat Flags sections state none. `02-07-SUMMARY.md` has no Threat Flags section and no flagged entries were present to map.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By | Notes |
|------------|---------------|--------|------|--------|-------|
| 2026-06-14T05:00:02Z | 32 | 32 | 0 | Codex security auditor | Verified plan-time mitigations by source evidence; ran targeted unit and integration checks. |

## Verification Commands

| Command | Result |
|---------|--------|
| `npm run test -- tests/unit/inventory-scanner.test.ts tests/unit/inventory-homebrew.test.ts tests/unit/tool-metadata.test.ts tests/unit/package-manager.test.ts` | passed: 4 files, 28 tests |
| `npm run test:integration -- tests/integration/wizard-flow.test.tsx tests/integration/config-first.test.ts tests/integration/env-capture.test.ts -t inventory` | passed: 3 files, 11 matching tests, 20 skipped |

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

Approval: verified 2026-06-14
