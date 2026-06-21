---
phase: 03
slug: dotfiles-discovery-map
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-19
---

# Phase 03 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.ts`, `vitest.integration.config.ts`, `vitest.contract.config.ts` |
| **Quick run command** | `npm run test -- tests/unit/inventory-dotfiles.test.ts tests/unit/inventory-scanner.test.ts` |
| **Full suite command** | `npm run lint && npm run build && npm test && npm run test:integration` |
| **Targeted task command latency** | < 30 seconds |
| **Full suite estimated runtime** | ~120 seconds; wave/phase gate only |

---

## Sampling Rate

- **After every task commit:** Run the task-specific targeted command from the Per-Task Verification Map below; each task-level command must complete in under 30 seconds or be narrowed before continuing.
- **After every plan wave:** Run `npm run lint && npm run build && npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max task feedback latency:** < 30 seconds
- **Full-suite latency:** ~120 seconds, reserved for wave and phase gates

---

## Targeted Task Commands

| Task ID | Targeted Command | Expected Latency | Gate |
|---------|------------------|------------------|------|
| 03-01-01 | `npm run test -- tests/unit/tool-metadata.test.ts tests/unit/inventory-dotfiles.test.ts` | < 30 seconds | task |
| 03-01-02 | `npm run test -- tests/unit/inventory-dotfiles.test.ts tests/unit/inventory-scanner.test.ts` | < 30 seconds | task |
| 03-02-01 | `npm run test -- tests/unit/inventory-dotfiles.test.ts` | < 30 seconds | task |
| 03-02-02 | `npm run test -- tests/unit/inventory-dotfiles.test.ts tests/integration/wizard-flow.test.tsx -t inventory` | < 30 seconds | task |

Full `lint`, `build`, `npm test`, and `test:integration` runs remain required at wave or phase gates, not as the primary task feedback loop.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | DOT-01 | T-03-01 | Metadata path matching never reads outside explicit candidates | unit | `npm run test -- tests/unit/tool-metadata.test.ts tests/unit/inventory-dotfiles.test.ts` | W0 | pending |
| 03-01-02 | 01 | 1 | DOT-03 | T-03-02 | Home, dotfiles repo, and workspace scans remain read-only and bounded | unit | `npm run test -- tests/unit/inventory-dotfiles.test.ts tests/unit/inventory-scanner.test.ts` | W0 | pending |
| 03-02-01 | 02 | 2 | DOT-02 | T-03-03 | Rc parsing records env names and value kinds without raw values | unit | `npm run test -- tests/unit/inventory-dotfiles.test.ts` | W0 | pending |
| 03-02-02 | 02 | 2 | DOT-04 | T-03-04 | Unknown files and findings are reported separately without error state | unit/integration | `npm run test -- tests/unit/inventory-dotfiles.test.ts tests/integration/wizard-flow.test.tsx -t inventory` | W0 | pending |

*Status: pending, green, red, flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/inventory-dotfiles.test.ts` - covers DOT-01, DOT-02, DOT-03, DOT-04.
- [ ] Extend `tests/unit/inventory-scanner.test.ts` - proves `scanInventory()` attaches dotfile map and warning data.
- [ ] Extend `tests/integration/wizard-flow.test.tsx` - proves concise dotfile summary appears in the inventory wizard surface.
- [ ] Extend `tests/integration/config-first.test.ts` - proves concise dotfile summary appears in config-first output.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Task feedback latency < 30s
- [x] Full suite reserved for wave/phase gates
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-19
