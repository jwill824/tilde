---
phase: 02
slug: machine-inventory-scanner
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-13
---

# Phase 02 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 with Ink testing helpers |
| **Config file** | `vitest.config.ts`, `vitest.integration.config.ts`, `vitest.contract.config.ts` |
| **Quick run command** | `npm run test -- tests/unit/inventory-scanner.test.ts tests/unit/inventory-homebrew.test.ts tests/unit/package-manager.test.ts` |
| **Full suite command** | `npm run lint && npm run build && npm test && npm run test:integration` |
| **Estimated runtime** | ~90 seconds targeted, ~5 minutes full |

---

## Sampling Rate

- **After every task commit:** Run the targeted test command for touched inventory, package-manager, or Ink files.
- **After every plan wave:** Run `npm run lint && npm run build` plus the relevant unit/integration subset.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 5 minutes for full phase verification.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 02-01 | 1 | INV-01 | T-02-01 | Inventory facts preserve evidence without resolving secrets | unit | `npm run test -- tests/unit/inventory-scanner.test.ts` | No - W0 | pending |
| 02-01-02 | 02-01 | 1 | INV-04 | T-02-02 | Missing or failed command evidence becomes warnings/unknown facts | unit | `npm run test -- tests/unit/inventory-scanner.test.ts` | No - W0 | pending |
| 02-02-01 | 02-02 | 2 | INV-02 | T-02-03 | Homebrew output is parsed as data using argument arrays, not shell strings | unit | `npm run test -- tests/unit/inventory-homebrew.test.ts tests/unit/package-manager.test.ts` | No - W0 | pending |
| 02-02-02 | 02-02 | 2 | INV-03 | T-02-04 | Summary UI renders concise counts and warnings without executing commands | integration | `npm run test:integration -- tests/integration/wizard-flow.test.tsx tests/integration/config-first.test.ts -t inventory` | Partial - W0 | pending |

---

## Wave 0 Requirements

- [ ] `tests/unit/inventory-scanner.test.ts` - inventory report shape, metadata matching, warning accumulation, and INV-01/INV-04 failures.
- [ ] `tests/unit/inventory-homebrew.test.ts` - direct/dependency/unknown formula classification and unmatched Homebrew audit data.
- [ ] `tests/unit/package-manager.test.ts` - new Homebrew helper command arguments and output parsing with mocked command execution.
- [ ] Rename or adapt `tests/unit/capture-scanner.test.ts` and `tests/integration/env-capture.test.ts` if their behavior moves under `src/inventory/`.
- [ ] Add config-first inventory summary assertion before apply confirmation.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Local Homebrew request-state interpretation | INV-02 | Tests must mock Homebrew; optional local smoke can confirm command shape on a developer machine | Run `brew list --installed-on-request --formula --full-name` manually only if desired; do not require it in automated verification |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing test references.
- [x] No watch-mode flags.
- [x] Feedback latency target under 5 minutes.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
