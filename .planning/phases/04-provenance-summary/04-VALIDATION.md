---
phase: 04
slug: provenance-summary
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-20
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.ts`; integration suite via `vitest.integration.config.ts` |
| **Quick run command** | `npm run test -- tests/unit/inventory-provenance.test.ts` |
| **Full suite command** | `npm test && npm run test:integration && npm run build && npm run lint` |
| **Estimated runtime** | ~60-180 seconds for focused tests; full suite depends on integration breadth |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- tests/unit/inventory-provenance.test.ts`
- **After every plan wave:** Run touched unit/integration tests, then `npm run build`
- **Before `$gsd-verify-work`:** Full suite must be green: `npm test && npm run test:integration && npm run build && npm run lint`
- **Max feedback latency:** 180 seconds for focused feedback

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | PROV-01, PROV-03, PROV-04 | T-04-01 | Default output does not expose raw rc/env values or secrets | unit | `npm run test -- tests/unit/inventory-provenance.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | PROV-02, PROV-03 | T-04-01 | Shared summary stays concise and config-aware | integration | `npm run test:integration -- tests/integration/config-first.test.ts tests/integration/wizard-flow.test.tsx` | ✅ | ⬜ pending |
| 04-02-02 | 02 | 2 | PROV-02, PROV-04 | T-04-02 | Unknown scanner evidence preserves warnings and does not block apply | unit + integration | `npm run test -- tests/unit/inventory-provenance.test.ts tests/unit/inventory-scanner.test.ts` | partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/inventory-provenance.test.ts` — covers derivation precedence for managed, installed, dependency, manual GUI/App Store, OS-provided, unmanaged, and unknown.
- [ ] Config-first integration assertion — provenance line uses current config intent and hides verbose evidence.
- [ ] Wizard integration assertion — wizard output receives the shared provenance line at a config-aware point.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s for focused tests
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
