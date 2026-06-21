---
phase: 07
slug: config-and-schema-versioning-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-21
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for config/schema versioning, migration safety, and schema inspection.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 |
| **Config file** | `vitest.config.ts`, `vitest.integration.config.ts`, `vitest.contract.config.ts` |
| **Quick run command** | `npm test -- --run tests/unit/config tests/unit/repos tests/unit/index` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run tests/unit/config tests/unit/repos tests/unit/index`
- **After every plan wave:** Run `npm test -- --run`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | SCHEMA-01 | T-07-01 | Unknown config versions fail closed without destructive writes | unit | `npm test -- --run tests/unit/config` | W0 | pending |
| 07-01-02 | 01 | 1 | SCHEMA-01 | T-07-02 | Version ordering treats `1.10` as newer than `1.9` | unit | `npm test -- --run tests/unit/config` | W0 | pending |
| 07-02-01 | 02 | 1 | SCHEMA-02 | T-07-03 | Existing repo configs remain readable without raw secret resolution | unit | `npm test -- --run tests/unit/repos` | W0 | pending |
| 07-03-01 | 03 | 2 | SCHEMA-03 | T-07-04 | Schema inspection prints metadata without requiring user config or exposing secrets | unit/CLI | `npm test -- --run tests/unit/index tests/contract` | W0 | pending |
| 07-04-01 | 04 | 2 | SCHEMA-01, SCHEMA-03 | T-07-05 | Docs match generated schema metadata and do not document unsupported fields | unit/docs | `npm test -- --run tests/unit/config` | W0 | pending |

---

## Wave 0 Requirements

- [ ] Unit tests exist for schema version comparison, unknown/future version handling, and migration compatibility.
- [ ] Unit tests exist for reading legacy `repos.json` without a schema version and current `repos.json` with a schema version.
- [ ] CLI tests exist for `tilde config schema` with no config path.
- [ ] Test fixtures avoid real external commands; any command execution remains mocked.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
