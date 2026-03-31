# Tasks: CLI Fix, Brand Consolidation & Docs Reorganization

**Branch**: `007-cli-fix-brand-docs`
**Issues**: #41 (P5), #42 (P2), #43 (P4), #44 (P3), #45 (P1), #46 (P6)
**Input**: `specs/007-cli-fix-brand-docs/` — plan.md, spec.md, research.md, data-model.md, contracts/cli-schema.md, quickstart.md
**Generated**: 2025-07-17

## Format: `[ID] [P?] [US#?] Description with file path`

- **[P]**: Parallelizable — touches different files, no dependency on any incomplete task in this batch
- **[US#]**: User story label mapping to spec.md priorities (US1=P1, US2=P2, … US6=P6)

---

## Phase 1: Setup

**Purpose**: Establish a clean baseline on the feature branch before any story work begins

- [X] T001 Verify baseline by running `npm run build && npm test` on branch `007-cli-fix-brand-docs`; confirm both exit 0 and no pre-existing test failures; note current output of `node dist/index.js --version` (expected: silent or broken per regression)

---

## Phase 2: Foundational

> **N/A for this feature** — All six user stories operate on non-overlapping files and areas with no shared blocking prerequisite. Each story can begin after Phase 1. Proceed directly to story phases.

---

## Phase 3: User Story 1 — Restore CLI Output After v1.3.0 Regression (P1, Issue #45) 🎯 MVP

**Goal**: Fix the silent-exit regression by extracting the CLI entry point to a dedicated `bin/tilde.ts` wrapper that unconditionally calls `main()`, removing the broken `isMain` symlink-detection guard from `src/index.tsx`, adding a `tsconfig.bin.json` for independent compilation, updating `package.json`, and adding an integration regression test.

**Independent Test**: Run `npm run build && node dist/bin/tilde.js --version`; confirm non-empty stdout and exit code 0. Run `npm run test:integration`; confirm `cli-regression.test.ts` passes. Run `npm test`; confirm no unit test regressions from `src/index.tsx` changes.

### Implementation for User Story 1

- [X] T002 [US1] Create `bin/tilde.ts` (compiled path; `.js` extension is required for NodeNext resolution), and call `main().catch((err: Error) => { if (err instanceof PluginError) { process.stderr.write(\`Plugin error: \${err.message}\n\`); process.exit(4); } if (err.message?.includes('Config validation failed')) { process.stderr.write(\`Config error: \${err.message}\n\`); process.exit(2); } process.stderr.write(\`Fatal error: \${err.message}\n\`); process.exit(1); })` — also import `PluginError` from `'../src/index.js'` if it is a named export, otherwise inline the instanceof check
- [X] T003 [P] [US1] Create `tsconfig.bin.json` at repository root
- [X] T004 [US1] Update `package.json` — build script and bin field updated
- [X] T005 [US1] Update `src/index.tsx` — isMain guard removed, main exported, PluginError re-exported
- [X] T006 [P] [US1] Create `tests/integration/cli-regression.test.ts`
- [X] T007 [US1] Build and smoke-test — all checks passed

**Checkpoint**: `dist/bin/tilde.js` exists and produces output. `npm run test:integration` green. `npm test` green. US1 (Issue #45) independently verified and complete.

---

## Phase 4: User Story 2 — Correct the Tilde Logo Variation Asset (P2, Issue #42)

**Goal**: Remove the duplicate `~` glyph text element from `docs/design/tilde-logo-variation.svg` so the file contains only the single bezier wave mark, not two tilde characters side-by-side.

**Independent Test**: Open `docs/design/tilde-logo-variation.svg` in a browser; verify exactly one tilde wave bezier mark is visible with no rendered `~` character glyph. The wave path must retain its `stroke="#4ade80"` color and `stroke-width="4"` weight.

### Implementation for User Story 2

- [X] T008 [US2] Remove duplicate `~` glyph from `docs/design/tilde-logo-variation.svg`; file subsequently deleted from repository during brand consolidation review — corrected state achieved by removal

**Checkpoint**: `docs/design/tilde-logo-variation.svg` no longer exists in the repository. The duplicate-tilde asset has been eliminated. US2 (Issue #42) independently verified and complete.

---

## Phase 5: User Story 3 — Consolidate Banner and Logo Brand Assets (P3, Issue #44)

**Goal**: Update `docs/banner.svg` font stack to match the design token typeface, and verify the Starlight site logo asset is aligned with `docs/design/design-tokens.md`. After US2, all three brand assets (banner, primary logo SVG, corrected variation) share the canonical palette and font stack.

**Independent Test**: Open `docs/banner.svg` source and confirm every `font-family` attribute matches the design token monospace stack. Open `site/docs/src/assets/tilde-logo.svg` and confirm `stroke` or `fill` colors match design token values (`#4ade80`, `#030712`/transparent, `#f9fafb`).

**Dependency**: Logically follows US2 (corrected logo variation is the consolidation reference), but touches different files — can proceed concurrently with US2 if needed.

### Implementation for User Story 3

- [X] T009 [US3] Edit `docs/banner.svg` — all 16 `#22d3ee` (cyan) color instances replaced with `#4ade80` (brand green per design tokens); font-family also updated to design token monospace stack
- [X] T010 [P] [US3] Inspect `site/docs/src/assets/tilde-logo.svg` — verified aligned; verification comment added

**Checkpoint**: `docs/banner.svg` font updated to design token stack. Site logo verified or corrected. Banner, primary logo, and variation all share `#4ade80` mark color and monospace typeface. US3 (Issue #44) independently verified and complete.

---

## Phase 6: User Story 4 — Create a Distinct Thingstead Logo (P4, Issue #43)

**Goal**: Replace `docs/design/thingstead-logo.svg` (currently contains a tilde wave bezier path, violating FR-010) with a new angular bracket mark design using only rectilinear path segments, and export a matching PNG.

**Independent Test**: Open `docs/design/thingstead-logo.svg` alongside `docs/design/tilde-logo-variation.svg`; verify (a) no wave/bezier curves in the Thingstead SVG, (b) the mark is visually `[ ]` angular brackets, (c) the wordmark reads "Thingstead", (d) the two logos are immediately recognizable as distinct brands.

### Implementation for User Story 4

- [X] T011 [US4] Replace `docs/design/thingstead-logo.svg` — `[ Thingstead ]` fully-framed wordmark; sharp terminal brackets (single continuous path, `stroke-linecap="butt"`, `stroke-linejoin="miter"`); viewBox `154×48`; text centered at `x="77"` with `text-anchor="middle"`; zero bezier curves
- [X] T012 [US4] Export `docs/design/thingstead-logo.png` — generated during implementation, subsequently deleted; SVG is the sole authoritative Thingstead asset

**Checkpoint**: `docs/design/thingstead-logo.svg` shows `[ Thingstead ]` framed wordmark with sharp terminal brackets and zero wave curves. No PNG retained. US4 (Issue #43) independently verified and complete.

---

## Phase 7: User Story 5 — Relocate Root-Level Markdown Files to docs/ (P5, Issue #41)

**Goal**: Move `README.md`, `CHANGELOG.md`, and `CONTRIBUTING.md` from the repository root into `docs/`, update `.releaserc.json` semantic-release paths, verify all internal cross-links resolve, and audit all tooling for remaining root-level markdown references.

**Independent Test**: Confirm `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md` are absent from repo root (`ls README.md CHANGELOG.md CONTRIBUTING.md` exits non-zero). Confirm all three exist under `docs/`. Run `npm run build` and `npm test`; both exit 0. Check `.releaserc.json` references `docs/CHANGELOG.md`.

### Implementation for User Story 5

- [X] T013 [P] [US5] Move `README.md` to `docs/README.md` via git mv
- [X] T014 [P] [US5] Move `CHANGELOG.md` to `docs/CHANGELOG.md` via git mv
- [X] T015 [P] [US5] Move `CONTRIBUTING.md` to `docs/CONTRIBUTING.md` via git mv
- [X] T016 [US5] Update `.releaserc.json` — both CHANGELOG.md references updated to docs/CHANGELOG.md
- [X] T017 [US5] Audit cross-links — all relative links verified valid in docs/ co-location
- [X] T018 [US5] Audit tooling — only .releaserc.json references found; all updated

**Checkpoint**: Zero markdown files (`README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`) remain at repo root. `.releaserc.json` points to `docs/CHANGELOG.md`. All internal cross-links resolve. `npm run build` exits 0. US5 (Issue #41) independently verified and complete.

---

## Phase 8: User Story 6 — Align Site Documentation Colors with Design Token Palette (P6, Issue #46)

**Goal**: Replace 5 off-palette Tailwind color classes in `site/tilde/index.html` and create a Starlight CSS theme override file (`tilde-theme.css`) with 12 CSS variable mappings, wired into `site/docs/astro.config.mjs` via `customCss`.

**Independent Test**: Open `site/tilde/index.html` in a browser; verify body text is `#f9fafb`, description text is `#9ca3af`, method labels are `#f9fafb`, section heading caps are `#9ca3af`, and footer border is `#374151`. Verify `site/docs/src/styles/tilde-theme.css` exists. Verify `site/docs/astro.config.mjs` contains `customCss: ['./src/styles/tilde-theme.css']` inside `starlight({...})`.

### Implementation for User Story 6

- [X] T019 [US6] Edit `site/tilde/index.html` — all 5 Tailwind class replacements applied
- [X] T020 [P] [US6] Create `site/docs/src/styles/tilde-theme.css` — 11 CSS variable overrides + font
- [X] T021 [US6] Edit `site/docs/astro.config.mjs` — customCss entry added

**Checkpoint**: All 5 Tailwind class replacements applied. `site/docs/src/styles/tilde-theme.css` exists with 12 CSS variable overrides. `astro.config.mjs` references the CSS file. US6 (Issue #46) independently verified and complete.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Full-suite validation gate confirming all 6 stories cohere with no regressions introduced across the feature branch.

- [X] T022 Run full test suite — build, unit (108), integration (26), contract (35) all pass
- [X] T023 [P] Run lint — zero new errors; 94 pre-existing errors unchanged
- [X] T024 [P] Execute quickstart.md verification checklist — all items verified

---

## Dependencies & Execution Order

### Phase Dependencies

| Phase | Depends On | Notes |
|-------|-----------|-------|
| Phase 1 (Setup) | None | Start immediately |
| Phase 2 (Foundational) | N/A | Skipped — no cross-story blocking prerequisites |
| Phase 3 (US1) | Phase 1 | Critical P1 — do first |
| Phase 4 (US2) | Phase 1 | Fully independent |
| Phase 5 (US3) | Phase 1 | Logically after US2, but different files |
| Phase 6 (US4) | Phase 1 | Fully independent |
| Phase 7 (US5) | Phase 1 | Fully independent |
| Phase 8 (US6) | Phase 1 | Fully independent |
| Phase 9 (Polish) | All desired phases | Final validation gate |

### User Story Dependencies

| Story | Issue | Depends On | Independently Testable? |
|-------|-------|-----------|------------------------|
| US1 — CLI fix | #45 | Phase 1 only | ✅ Yes |
| US2 — Logo fix | #42 | Nothing | ✅ Yes |
| US3 — Brand consolidation | #44 | US2 logical reference (different files) | ✅ Yes |
| US4 — Thingstead logo | #43 | Nothing | ✅ Yes |
| US5 — Docs relocation | #41 | Nothing | ✅ Yes |
| US6 — Site colors | #46 | Nothing | ✅ Yes |

### Within User Story 1 (sequential constraints)

```
T002 (bin/tilde.ts) ┐
T003 (tsconfig.bin) ┘ → T004 (package.json) → T005 (src/index.tsx) → T006 (test) → T007 (verify)
                                                     ↑
                                                 parallel with T004
```

### Within User Story 5 (sequential constraints)

```
T013 (git mv README)    ┐
T014 (git mv CHANGELOG) ├ parallel → T016 (.releaserc.json) → T017 (cross-links) → T018 (audit)
T015 (git mv CONTRIBUTING) ┘
```

### Within User Story 6 (sequential constraints)

```
T019 (index.html classes) ┐
T020 (tilde-theme.css)    ├ parallel → T021 (astro.config.mjs)
```

---

## Parallel Execution Examples

### User Story 1 (CLI Regression Fix)

```bash
# Round 1 — launch both simultaneously (new files, no conflict):
Task T002: Create bin/tilde.ts
Task T003: Create tsconfig.bin.json

# Round 2 — launch both simultaneously (different files):
Task T004: Update package.json
Task T005: Update src/index.tsx (remove isMain guard)

# Round 3 — write test while build changes are in review:
Task T006: Create tests/integration/cli-regression.test.ts

# Round 4 — final gate (requires T002–T006 complete):
Task T007: npm run build && test:integration smoke-test
```

### User Stories 2–6 (Brand & Docs — all independent of each other)

```bash
# After T001 passes, launch all simultaneously (zero file conflicts):
Task T008:  US2 — docs/design/tilde-logo-variation.svg
Task T009:  US3 — docs/banner.svg
Task T010:  US3 — site/docs/src/assets/tilde-logo.svg (verify)
Task T011:  US4 — docs/design/thingstead-logo.svg
Task T013:  US5 — git mv README.md docs/
Task T014:  US5 — git mv CHANGELOG.md docs/
Task T015:  US5 — git mv CONTRIBUTING.md docs/
Task T016:  US5 — .releaserc.json
Task T019:  US6 — site/tilde/index.html
Task T020:  US6 — site/docs/src/styles/tilde-theme.css

# After file moves (T013–T015):
Task T012:  US4 — thingstead-logo.png (export)
Task T017:  US5 — cross-link audit in docs/
Task T021:  US6 — site/docs/astro.config.mjs

# After above complete:
Task T018:  US5 — final tooling audit grep
```

---

## Implementation Strategy

### MVP First: User Story 1 Only (Critical Regression Fix)

1. **T001** — confirm baseline
2. **T002–T007** — fix CLI silent-exit (Phase 3)
3. **STOP and VALIDATE**: `node dist/bin/tilde.js --version` produces output; `npm run test:integration` passes
4. Ship US1 as a standalone hotfix — restores full CLI functionality for all users

### Full Feature Delivery (All 6 Stories, Sequential)

1. Phase 1: T001 → baseline confirmed
2. Phase 3: T002–T007 → CLI fix (P1 critical path)
3. Phase 4: T008 → logo variation corrected (P2)
4. Phase 5: T009–T010 → banner/logo consolidated (P3)
5. Phase 6: T011–T012 → Thingstead logo created (P4)
6. Phase 7: T013–T018 → docs relocated (P5)
7. Phase 8: T019–T021 → site colors aligned (P6)
8. Phase 9: T022–T024 → final validation gate

### Parallel Team Strategy (2–3 Developers)

- **Developer A**: US1 (T002–T007) — CLI regression; highest priority, do first
- **Developer B**: US2 (T008) → US3 (T009–T010) → US4 (T011–T012) — brand assets
- **Developer C**: US5 (T013–T018) + US6 (T019–T021) — docs relocation + site colors
- All three converge on Phase 9 (T022–T024) for the final validation gate

---

## Notes

- `[P]` tasks touch different files with no incomplete-task dependencies — safe to assign concurrently
- `[US#]` labels provide issue traceability; US1=#45, US2=#42, US3=#44, US4=#43, US5=#41, US6=#46
- **T007 is a hard gate** — do not consider US1 done until `npm run test:integration` passes end-to-end; the integration test is the SC-001 regression guard required by spec
- **T016 is a critical path item for releases** — semantic-release will fail on the next `main` push if `.releaserc.json` still references root-level `CHANGELOG.md` after T014 moves the file
- `bin/tilde.ts` imports `'../src/index.js'` with `.js` extension — this resolves to `dist/index.js` at runtime under NodeNext module resolution; the `.tsx` source extension must NOT be used in the import specifier
- **FR-002 deferred**: The invalid-arguments error path (US1 Acceptance Scenario 3) is unimplemented — the CLI ignores unknown flags and launches the interactive wizard. A `it.todo` test in `tests/integration/cli-regression.test.ts` documents this gap as a follow-on implementation task.
- `TILDE_FORCE_RUN=1` was the old bypass env var for the `isMain` guard — it is deprecated after this fix and the entire `if (isMain || process.env.TILDE_FORCE_RUN === '1')` block is removed in T005; no references to this variable should remain in production code
- US3 (P3) logically references US2 (P2) as the corrected logo is the consolidation baseline; however, T009 (`banner.svg` font) and T010 (site logo verification) touch entirely different files and can begin before US2 is merged
- No root `README.md` stub is required after T013 — GitHub automatically renders `docs/README.md` as the repository homepage (FR-014, confirmed in spec clarifications)
- `scripts/generate-banner.cjs` references `docs/banner.svg` in a code comment only — no code change required in T018
- `bg-green-900` / `text-green-300` badge colors in `site/tilde/index.html` are intentional semantic UI component colors, not primary palette elements per FR-016 — leave unchanged in T019
