---
phase: 01
slug: tool-metadata-registry
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-13
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test -- tests/unit/tool-metadata.test.ts tests/unit/browser-step.test.tsx` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- tests/unit/tool-metadata.test.ts tests/unit/browser-step.test.tsx`
- **After every plan wave:** Run `npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | META-01, META-02, META-04, META-05 | T-01-01 | Metadata rejects malformed install ids, paths, labels, and platform declarations. | unit | `npm run test -- tests/unit/tool-metadata.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 2 | META-03, META-05 | T-01-02 | Browser step consumes registry metadata without changing rendered options or external command behavior. | component | `npm run test -- tests/unit/browser-step.test.tsx` | ✅ | ⬜ pending |
| 01-03-01 | 03 | 3 | META-01, META-02, META-03, META-04, META-05 | T-01-03 | Registry aggregate validation catches missing required fields and duplicate ids before downstream use. | unit | `npm run test -- tests/unit/tool-metadata.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/tool-metadata.test.ts` — schema, uniqueness, lookup, and malformed fixture coverage for META-01, META-02, META-04, META-05.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Wizard browser prompt remains understandable in a terminal | META-03 | Ink output snapshots can verify structure, but a terminal sanity pass catches prompt flow regressions. | Run `npm run dev`, navigate to the browser step, and confirm browser labels and selection behavior match the pre-migration flow. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
