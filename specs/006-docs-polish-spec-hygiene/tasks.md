---
description: "Task list for spec 006 — Documentation Polish and Spec Hygiene"
---

# Tasks: Documentation Polish and Spec Hygiene

**Branch**: `006-docs-polish-spec-hygiene`  
**Input**: Design documents from `specs/006-docs-polish-spec-hygiene/`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · quickstart.md ✅ · contracts/ ✅

**Tests**: One unit test required (US2 only — `readPackageVersion()`). No TDD for other stories.

**Organization**: Tasks are grouped by user story. US1 and US2 (P1) are fully independent. US3, US4 (P2) and US5 (P3) can begin after Phase 1.

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: Parallelizable — operates on a different file from preceding tasks with no unsatisfied dependencies
- **[Story]**: Which user story this task belongs to (US1 – US5)
- All task IDs are 4-digit zero-padded (T0001, T0002, …) to avoid lexicographic sort issues

---

## Phase 1: Setup

**Purpose**: Verify baseline integrity before any changes are made.

- [X] T0001 Verify baseline: run `npm run build && npm test` at repo root and confirm all existing tests pass with no pre-existing failures

**Checkpoint**: Baseline green — all user stories can now proceed independently

---

## Phase 2: Foundational

**N/A** — This spec makes no schema changes, introduces no shared infrastructure, and has no cross-story blocking prerequisites. All five user stories can proceed in priority order immediately after Phase 1.

---

## Phase 3: User Story 1 — Config-First Users Can Author tilde.config.json Without the Wizard (Priority: P1) 🎯 MVP

**Goal**: Create `docs/config-format.md` — the complete, plain-English schema reference at the mandated repo path — with an annotated example, wizard-equivalent phrasing, a schema versioning section, a README link, and a CI validation step.

**Independent Test**: Open `docs/config-format.md` and, using only that file, author a valid `tilde.config.json` covering every required field. Run `npm run validate:config-doc` and confirm it exits 0. Resolves issues #35 and #15.

### Implementation for User Story 1

- [X] T0002 [US1] Copy `site/docs/src/content/docs/config-format.md` to `docs/config-format.md`; strip the Astro frontmatter block (the `--- title: … ---` section at the top of the file); replace it with `# tilde Configuration Format` as the H1 header
- [X] T0003 [US1] Expand the Schema Versioning and Migration section of `docs/config-format.md` to include: (1) explicit inaugural v1 statement — "v1 is the first schema version; no prior versions exist; any config already at v1 requires no migration"; (2) migration runner behaviour — tilde detects `schemaVersion` on load, applies applicable migration steps in order, writes back atomically, notifies the user; migration is additive and non-destructive; on failure: warn, preserve original file unmodified, offer wizard re-run; (3) forward-version handling — if `schemaVersion` is higher than installed tilde supports: warn user, open config in read-only mode, prompt to upgrade tilde; (4) a clearly labelled future migration template skeleton block showing the pattern future v2 entries will follow
- [X] T0004 [US1] Apply wizard-equivalent phrasing to the `authMethod`, `envVars`, and `secretsBackend` field descriptions in `docs/config-format.md` per the Wizard-Equivalent Phrasing Map in `specs/006-docs-polish-spec-hygiene/data-model.md`: `authMethod` → "How will you authenticate to GitHub in this context?"; `envVars` → "Environment variables to load when you're working in this context (use your secrets backend references — not raw tokens)"; `secretsBackend` → "Where should tilde store and retrieve your secrets?"
- [X] T0005 [US1] Audit the annotated example block in `docs/config-format.md` and confirm it: (a) explicitly sets `"schemaVersion": 1`; (b) includes all required fields from the contracts/config-format-doc.md Required Fields Checklist; (c) includes representative optional fields (`$schema`, `tools`, `accounts`, `vscodeProfile`, `isDefault`); (d) includes at least two `contexts` entries; (e) has inline `//` comments explaining every field; correct any gaps found
- [X] T0006 [US1] Create `scripts/validate-config-doc-example.ts`: reads `docs/config-format.md`, extracts the first fenced JSON code block in the annotated example section, strips `//` inline comments (regex `//[^\n]*`), parses the result, validates against `TildeConfigSchema` from `src/config/schema.ts`, prints `✅ Config doc example is valid` on success or the Zod error details on failure, and exits non-zero on any failure
- [X] T0007 [US1] Add `"validate:config-doc": "npx tsx scripts/validate-config-doc-example.ts"` to the `scripts` section of `package.json`
- [X] T0008 [US1] Add a `validate-config-doc` step to the existing `test` job in `.github/workflows/ci.yml` after the `Build` step: `run: npm run validate:config-doc`; also remove `'docs/**'` from the `paths-ignore` list in the `on.push` trigger so that changes to `docs/config-format.md` cause CI to run
- [X] T0009 [US1] Add a "Configuration reference" entry to the `README.md` highlights section: insert a bullet `- 📄 [Configuration reference](docs/config-format.md)` after the existing quick-start / highlight bullets in the README body (not inside the `<div align="center">` header block)

**Checkpoint**: US1 complete — `docs/config-format.md` exists, is complete, links from README, and passes `npm run validate:config-doc`

---

## Phase 4: User Story 2 — CLI Splash Screen Shows the Actual Running Version (Priority: P1)

**Goal**: Replace the hardcoded `const VERSION = '0.1.0'` constant in `src/index.tsx` with `readPackageVersion()` — an ESM-safe, synchronous read of the version from `package.json` at startup — and add a unit test for the helper.

**Independent Test**: Run `npm run build && node dist/index.js --version`; confirm the output matches `` `tilde v$(jq -r .version package.json)` ``. Resolves issue #32.

### Implementation for User Story 2

- [X] T0010 [US2] Edit `src/index.tsx` imports: add `readFileSync` to the existing `node:fs` import line (alongside `existsSync`); add `import { fileURLToPath } from 'node:url';`; add `dirname` to the existing `node:path` import line (alongside `resolve`)
- [X] T0011 [US2] Add `export function readPackageVersion(): string` immediately before `const VERSION` in `src/index.tsx`, using the exact implementation from `specs/006-docs-polish-spec-hygiene/contracts/version-reading.md`: resolves path via `fileURLToPath(import.meta.url)` → `dirname` → `resolve('../package.json')`, reads with `readFileSync`, parses with `JSON.parse`, returns `.version ?? 'unknown'`; wraps entirely in try/catch returning `'unknown'` on any error; export the function to make it unit-testable
- [X] T0012 [US2] Replace `const VERSION = '0.1.0'` on line 15 of `src/index.tsx` with `const VERSION = readPackageVersion()` — no other changes to the file required (the `--version` flag output on line 79 and the `version: VERSION` prop on line 287 already use this constant and require no modification)
- [X] T0013 [US2] Create `tests/unit/read-package-version.test.ts` with two Vitest test cases: (1) **normal case** — import `readPackageVersion` from `src/index.tsx`; assert the returned string matches `version` from `package.json` (read via `readFileSync`); (2) **fallback case** — mock `node:fs` so `readFileSync` throws; assert `readPackageVersion()` returns `'unknown'`

**Checkpoint**: US2 complete — `node dist/index.js --version` outputs the actual package.json version; unit test passes

---

## Phase 5: User Story 3 — README Header Displays the Tilde Logo (Priority: P2)

**Goal**: Create `docs/design/tilde-logo-variation.svg` — a brand-consistent product logomark — and insert it into the README header above the existing banner.

**Independent Test**: `xmllint --noout docs/design/tilde-logo-variation.svg` exits 0; README.md displays a centred logo above the banner when viewed on GitHub.com. Resolves issues #36 and #37.

### Implementation for User Story 3

- [X] T0014 [US3] Create `docs/design/tilde-logo-variation.svg` per `specs/006-docs-polish-spec-hygiene/contracts/logo-variation.md`: `viewBox="0 0 120 60"` with no fixed `width`/`height`; `<title>tilde</title>` for accessibility; dark background `<rect width="120" height="60" fill="#030712" rx="8"/>`; wave bezier `<path d="M4 22 C8 10, 14 10, 16 22 C18 34, 24 34, 28 22" stroke="#4ade80" stroke-width="4" stroke-linecap="round" fill="none"/>`; tilde glyph `<text>` element in `fill="#4ade80"` with `font-family="ui-monospace, 'Cascadia Code', 'Fira Code', monospace"`; no external font references, no animation
- [X] T0015 [US3] Edit `README.md`: inside the existing `<div align="center">` block, insert `<img src="docs/design/tilde-logo-variation.svg" alt="tilde" width="160"/>` followed by `<br/><br/>` on the line immediately above the existing `<img src="docs/banner.svg" alt="tilde — developer environment bootstrap" width="560"/>` tag; do not remove or alter the banner `<img>` or any badges

**Checkpoint**: US3 complete — logo SVG is well-formed and renders in the README header above the banner

---

## Phase 6: User Story 4 — All Markdown Docs Live in the Right Place (Priority: P2)

**Goal**: Confirm the repository root already satisfies the markdown location requirement; close issue #23 with documented evidence.

**Independent Test**: `find . -maxdepth 1 -name "*.md" | sort` returns exactly three files: `./CHANGELOG.md`, `./CONTRIBUTING.md`, `./README.md`. Resolves issue #23.

### Implementation for User Story 4

- [X] T0016 [P] [US4] Run `find . -maxdepth 1 -name "*.md" | sort` at repo root; confirm output is exactly `./CHANGELOG.md`, `./CONTRIBUTING.md`, `./README.md`; record SC-003 as ✅ pass (no migration needed — repo root was already compliant before this spec)
- [X] T0017 [US4] Close GitHub issue #23 via `gh issue close 23 --comment "Audit completed on branch \`006-docs-polish-spec-hygiene\`. Root-level markdown files: CHANGELOG.md, CONTRIBUTING.md, README.md — exactly the three permitted exceptions. No additional .md files found at repo root. SC-003 satisfied. No migration needed."` using the `gh` CLI

**Checkpoint**: US4 complete — issue #23 closed with documented compliance confirmation

---

## Phase 7: User Story 5 — Spec 005 Hygiene Corrections (Priority: P3)

**Goal**: Narrow FR-006 in `specs/005-ui-branding-consolidation/spec.md` to remove the unenforceable README surface, and add explicit T0011 dependency declarations to T0021 and T0025 in `specs/005-ui-branding-consolidation/tasks.md`.

**Independent Test**: Read revised FR-006 — no mention of README or GitHub Markdown CSS; read T0021 and T0025 entries — each explicitly declares "Depends on: T0011" with the shared `astro.config.mjs` rationale; no "independent" marker remains between US2/US3/US4 for that file. Resolves issues #38 and #39.

### Implementation for User Story 5

- [X] T0018 [P] [US5] Edit `specs/005-ui-branding-consolidation/spec.md` FR-006: replace the surface list "README, install page, docs site, and CLI splash screen" with "the install page, docs site, and CLI splash screen"; append the sentence: "GitHub Markdown surfaces (README) are excluded — custom CSS cannot be applied to GitHub-rendered Markdown."
- [X] T0019 [P] [US5] Edit `specs/005-ui-branding-consolidation/tasks.md` Dependencies section: under T0021, add "**Depends on**: T0011 — both T0021 and T0011 modify `site/docs/astro.config.mjs`; run T0011 to completion before starting T0021 to avoid merge conflicts"; under T0025, add the same dependency note referencing T0011 and `site/docs/astro.config.mjs`; remove any "independent" marker or note between US2/US3/US4 that implies these tasks can run in parallel on that shared file

**Checkpoint**: US5 complete — spec 005 editorial corrections applied; FR-006 is enforceable; T0021/T0025 dependency chain is explicit

---

## Final Phase: Polish & Cross-Cutting Validation

**Purpose**: Full regression check, acceptance criteria sweep, and SC verification across all stories.

- [X] T0020 [P] Run full validation: `npm run build && npm test && npm run validate:config-doc` — confirm all unit/contract/integration tests pass and config-doc example validates against the Zod schema (covers SC-001, SC-002, SC-008)
- [X] T0021 [P] Verify SVG well-formedness and README rendering: run `xmllint --noout docs/design/tilde-logo-variation.svg` (SC-005); open README.md preview and confirm logo appears centred above the banner (SC-004)
- [X] T0022 [P] Perform field-coverage spot-check: for each schema field listed in `specs/006-docs-polish-spec-hygiene/contracts/config-format-doc.md` Required Fields Checklist, grep `docs/config-format.md` to confirm presence; flag any gap (SC-008)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: N/A — no blocking prerequisites for this spec
- **User Stories (Phases 3–7)**: All depend on Phase 1 passing; all stories are otherwise independent of each other
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

| Story | Priority | Depends On | Notes |
|---|---|---|---|
| **US1** Config format doc | P1 | Phase 1 only | Fully independent; create new file |
| **US2** Dynamic version | P1 | Phase 1 only | Fully independent; single source file edit + test |
| **US3** README logo | P2 | Phase 1 only | Fully independent; new SVG asset + README edit |
| **US4** Markdown audit | P2 | Phase 1 only | No code changes; audit + issue close only |
| **US5** Spec 005 hygiene | P3 | Phase 1 only | Fully independent; two spec artifact edits |

### Within Each User Story

- **US1**: T0002 (copy+strip) → T0003 (versioning section) → T0004 (wizard phrasing) → T0005 (example audit) → T0006 (validation script) → T0007 (npm script) → T0008 (CI step) → T0009 (README link)
- **US2**: T0010 (add imports) → T0011 (add function) → T0012 (replace constant) → T0013 (unit test)
- **US3**: T0014 (create SVG) → T0015 (update README)
- **US4**: T0016 (audit) → T0017 (close issue)
- **US5**: T0018 ‖ T0019 (edit different files — can run in parallel)

### Parallel Opportunities

- **US1 + US2**: Can be executed by different developers simultaneously (different files throughout)
- **US3 + US4 + US5**: Can all run in parallel after Phase 1 (completely disjoint files)
- **US5 within story**: T0018 and T0019 operate on different spec artifact files — parallelizable
- **Final Phase**: T0020, T0021, T0022 are all read-only verifications operating on different concerns — parallelizable

---

## Parallel Execution Examples

### Parallel Example: US1 + US2 (both P1, fully independent)

```bash
# Terminal A — US1
Task: "T0002 Copy and strip site Starlight draft → docs/config-format.md"
Task: "T0003 Expand schema versioning section in docs/config-format.md"
# … continue through T0009

# Terminal B — US2 (starts simultaneously)
Task: "T0010 Add readFileSync / fileURLToPath / dirname imports to src/index.tsx"
Task: "T0011 Add readPackageVersion() function to src/index.tsx"
Task: "T0012 Replace const VERSION = '0.1.0' with readPackageVersion()"
Task: "T0013 Create tests/unit/read-package-version.test.ts"
```

### Parallel Example: US3, US4, US5 (after Phase 1)

```bash
# Terminal A — US3
Task: "T0014 Create docs/design/tilde-logo-variation.svg"
Task: "T0015 Insert logo <img> in README.md <div align='center'>"

# Terminal B — US4
Task: "T0016 Run root markdown audit (find . -maxdepth 1 -name '*.md')"
Task: "T0017 Close issue #23 with gh CLI"

# Terminal C — US5
Task: "T0018 Narrow FR-006 in specs/005-ui-branding-consolidation/spec.md"
Task: "T0019 Add T0011 deps to T0021/T0025 in specs/005-ui-branding-consolidation/tasks.md"
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1: Setup (T0001)
2. Complete Phase 3: US1 — Config format doc (T0002–T0009)
3. Complete Phase 4: US2 — Dynamic CLI version (T0010–T0013)
4. **STOP and VALIDATE**: `npm run build && npm test && npm run validate:config-doc && node dist/index.js --version`
5. PR and merge — constitution violations resolved

### Incremental Delivery

1. Phase 1 → Foundation ready
2. US1 + US2 in parallel → Constitution violations fixed → **MVP delivered**
3. US3 → Logo + README → Deploy/preview
4. US4 → Audit complete → Issue #23 closed
5. US5 → Spec 005 editorial corrections applied
6. Final Phase validation → Release-ready

### Single-Developer Sequence (priority order)

```
T0001 → T0002 → T0003 → T0004 → T0005 → T0006 → T0007 → T0008 → T0009   (US1)
      → T0010 → T0011 → T0012 → T0013                                       (US2)
      → T0014 → T0015                                                         (US3)
      → T0016 → T0017                                                         (US4)
      → T0018 → T0019                                                         (US5)
      → T0020 → T0021 → T0022                                              (Polish)
```

---

## Acceptance Checklist Reference

| SC | Story | Verification |
|---|---|---|
| SC-001 | US1 | `docs/config-format.md` exists at repo root and covers 100% of `src/config/schema.ts` fields |
| SC-002 | US2 | `node dist/index.js --version` output matches `jq -r .version package.json` |
| SC-003 | US4 | `find . -maxdepth 1 -name "*.md"` returns exactly 3 files |
| SC-004 | US3 | README renders logo centred above banner on GitHub.com |
| SC-005 | US3 | `xmllint --noout docs/design/tilde-logo-variation.svg` exits 0 |
| SC-006 | US5 | Revised FR-006 contains no reference to GitHub Markdown CSS or README surface |
| SC-007 | US5 | T0021 and T0025 in spec 005 tasks.md both declare "Depends on: T0011" |
| SC-008 | US1 | Field-by-field comparison of `docs/config-format.md` against `src/config/schema.ts` shows 100% coverage |

---

## Notes

- `[P]` tasks operate on different files with no unsatisfied upstream dependencies
- `[US#]` label maps each task to its user story for independent traceability
- US4 requires **zero code changes** — T0016 is a read-only audit; T0017 is an issue close
- The only unit test in this spec is T0013 (`readPackageVersion()`) — no TDD required for other stories
- `readPackageVersion()` must be `export`ed from `src/index.tsx` (T0011) for the unit test in T0013 to import it directly
- The CI yml currently has `paths-ignore: ['docs/**']`; T0008 removes this exclusion so that `docs/config-format.md` changes trigger `npm run validate:config-doc`
- `tsx` is already a dev dependency (`^4.21.0`) — no new dev tooling required for T0006/T0007
- All file paths are relative to the repository root (`/Users/jeff.williams/Developer/personal/tilde`)
