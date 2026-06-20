---
phase: 05
slug: config-discovery-polish
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-20
---

# Phase 05 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.ts`; `vitest.integration.config.ts` |
| **Quick run command** | `npm run test -- tests/unit/config-discovery.test.ts tests/unit/reconfigure.test.ts` |
| **Full suite command** | `npm run build && npm test && npm run test:integration && npm run test:contract` |
| **Estimated runtime** | ~120 seconds for targeted tests; longer for full suite |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- tests/unit/config-discovery.test.ts tests/unit/reconfigure.test.ts`
- **After every plan wave:** Run `npm run build && npm run test:integration -- tests/integration/cli-regression.test.ts`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds for targeted feedback

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | CONF-01 | T-05-01 / T-05-04 | Missing config output lists searched paths and does not imply fallback after explicit paths | unit | `npm run test -- tests/unit/config-discovery.test.ts` | yes | pending |
| 05-01-02 | 01 | 0 | CONF-02 | T-05-01 / T-05-02 | Discovery uses fixed known config paths only; no recursive scanning | unit | `npm run test -- tests/unit/config-discovery.test.ts` | yes | pending |
| 05-01-03 | 01 | 0 | CONF-03 | T-05-04 | Missing `--config` and `TILDE_CONFIG` fail without auto-discovery fallback | integration | `npm run test:integration -- tests/integration/cli-regression.test.ts` | yes | pending |
| 05-01-04 | 01 | 0 | CONF-03 | T-05-04 | Invalid explicit config reports selected-file parse/schema errors, not searched paths | unit + integration | `npm run test -- tests/unit/reconfigure.test.ts && npm run test:integration -- tests/integration/cli-regression.test.ts` | yes | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/integration/cli-regression.test.ts` covers config-required command behavior beyond help/version.
- [ ] `tests/unit/config-discovery.test.ts` replaces outdated negative assertions for `~/.config/tilde/tilde.config.json` and `~/tilde.config.json`.
- [ ] Unit or integration tests assert source-specific `TILDE_CONFIG` wording.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency < 120s for targeted tests
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
