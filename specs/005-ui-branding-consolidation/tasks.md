# Tasks: UI/UX and Branding Consolidation

**Input**: Design documents from `/specs/005-ui-branding-consolidation/`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths included in all descriptions

---

## Phase 1: Setup

**Purpose**: Create new directory structure required by this feature before any story work begins.

- [X] T001 Create `docs/design/` directory in repository root (brand assets home per clarification Q5)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema URL migration — shared infrastructure touched by test fixtures across all stories. Must complete before running tests for any story.

**⚠️ CRITICAL**: Test suite reliability depends on this phase. Complete before any story work.

- [X] T002 Update `$schema` default URL in `src/config/schema.ts` — change default from `https://tilde.sh/config-schema/v1.json` to `https://thingstead.io/tilde/config-schema/v1.json` and update validator to accept both URLs during transition
- [X] T003 [P] Replace `tilde.sh` schema URL in `tests/fixtures/tilde.config.json`
- [X] T004 [P] Replace `tilde.sh` schema URL in `tests/unit/config-schema.test.ts`, `tests/unit/config-first.test.ts`, `tests/unit/config-validation.test.ts`, and `tests/unit/security-audit.test.ts`
- [X] T005 [P] Replace `tilde.sh` schema URL in `tests/integration/reconfigure.test.ts` and `tests/integration/context-switch.test.ts`
- [X] T006 [P] Replace `tilde.sh` schema URL in `tests/contract/config-schema.test.ts`

**Checkpoint**: Run `npm test` — all tests should pass with updated schema URLs before proceeding.

---

## Phase 3: User Story 1 — Fix Install in Non-Interactive Environment (Priority: P1) 🎯 MVP

**Goal**: `curl -fsSL https://thingstead.io/tilde/install.sh | bash` completes with exit 0 and no error messages in a non-interactive (piped) terminal.

**Independent Test**: Run `echo "" | node dist/index.js` after building — must print a "run tilde interactively" message and exit 0 with no Ink raw mode error.

- [X] T007 [US1] Add TTY guard to `site/tilde/install.sh` — replace final `exec tilde "$@"` with: check `[ -t 0 ] && [ -t 1 ]`; if true exec normally; if false print `"✓ Installation complete — open a new terminal and run: tilde"` and `exit 0` (per contract `contracts/cli-non-interactive.md`)
- [X] T008 [US1] Add `process.stdin.isTTY` guard to `src/index.tsx` — before calling `render(React.createElement(App, ...))`, check `if (!process.stdin.isTTY && mode !== 'non-interactive')`, write message to stdout, and `process.exit(0)` (safety guard per contract)
- [X] T009 [P] [US1] Fix duplicate React key warning in `src/ui/splash.tsx` — replace `key={i}` index-based keys in any `.map()` call with stable unique keys (e.g., derived from content or explicit id)
- [X] T0010 [P] [US1] Audit `src/app.tsx` `Static` component for duplicate key source — verify `key={item.id}` where `id = 'header'` is unique; trace the duplicate key error from issue #20 stack trace to its origin component and fix

**Checkpoint**: `echo "" | node dist/index.js` exits 0 with message. `node dist/index.js` still launches splash + wizard interactively. No duplicate key warnings in either path.

---

## Phase 4: User Story 2 — Fix Docs Site Navigation (Priority: P1)

**Goal**: All internal navigation links on `https://thingstead.io/tilde/docs/` resolve to correct paths under `/tilde/docs/` with no incorrect redirects.

**Independent Test**: Run `cd site/docs && npm run build` — inspect `dist/` HTML for sidebar hrefs; all must begin with `/tilde/docs/`.

- [X] T0011 [US2] Investigate and fix routing in `site/docs/astro.config.mjs` — test `base: '/tilde/docs/'` (with trailing slash) vs `base: '/tilde/docs'` (current, without); apply whichever resolves Starlight sidebar link generation to correct `/tilde/docs/installation/` paths (per `contracts/docs-routing.md`)
- [X] T0012 [US2] Check `@astrojs/starlight` version in `site/docs/package.json` — if a patch version exists that fixes multi-segment base path routing, upgrade it; otherwise confirm current version works with the fix from T011
- [X] T0013 [US2] Build docs site via `cd site/docs && npm run build` and validate `site/docs/dist/` — grep all generated HTML `href` values to confirm every sidebar link starts with `/tilde/docs/` and none start with `/installation/`, `/getting-started/`, or `/config-reference/` in isolation

**Checkpoint**: Every sidebar link in the built `dist/` output includes the full `/tilde/docs/` prefix. Routing contract acceptance tests all pass.

---

## Phase 5: User Story 3 — Consistent Branding Across All Surfaces (Priority: P2)

**Goal**: Thingstead logo and favicon present on all web surfaces; CLI splash uses canonical brand colors; `docs/design/design-tokens.md` documents the canonical palette and typeface.

**Independent Test**: Open `site/tilde/index.html` in a browser — favicon appears in tab, Thingstead logo or attribution visible on page. Open `site/docs/` locally — favicon in tab. CLI `node dist/index.js` shows green splash matching `#4ade80`.

- [X] T0014 [US3] Create `docs/design/thingstead-logo.svg` — design Thingstead parent brand SVG logo using established visual language: green (`#4ade80`) as primary color, monospace typeface, tilde wave motif adapted for parent brand identity
- [X] T0015 [P] [US3] Export `docs/design/thingstead-logo.png` at 512×512px from the SVG created in T014 (use `svgexport`, `sharp`, or browser screenshot; commit PNG file)
- [X] T0016 [US3] Create `docs/design/design-tokens.md` — document canonical design tokens (colors: `#4ade80`, `#030712`, `#111827`, `#f9fafb`, `#9ca3af`, `#1f2937`; typography: `ui-monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace`; CLI ANSI equivalents) per `contracts/brand-identity.md` and `data-model.md`
- [X] T0017 [P] [US3] Create `site/docs/public/favicon.svg` — derive from Thingstead logo SVG (T014); should be recognizable at 16×16 (simplified wave mark or letter mark)
- [X] T0018 [P] [US3] Create `site/tilde/favicon.svg` — same favicon asset as T017 (copy or symlink)
- [X] T0019 [US3] Add `<link rel="icon" href="/tilde/favicon.svg" type="image/svg+xml">` to `<head>` of `site/tilde/index.html`
- [X] T0020 [US3] Add Thingstead logo to `site/tilde/index.html` — add parent brand attribution (e.g., "by Thingstead" with logo) in page footer using `docs/design/thingstead-logo.svg` referenced inline or as `<img src>` with correct relative path
- [X] T0021 [US3] Configure Starlight favicon in `site/docs/astro.config.mjs` — add `favicon: { href: '/favicon.svg', type: 'image/svg+xml' }` to the Starlight integration config so the favicon from T017 is used on the docs site

  **Depends on**: T0011 — both T0021 and T0011 modify `site/docs/astro.config.mjs`; run T0011 to completion before starting T0021 to avoid merge conflicts

**Checkpoint**: `site/tilde/index.html` shows favicon in browser tab. `site/docs/` (built) shows favicon. `docs/design/` contains `thingstead-logo.svg`, `thingstead-logo.png`, `design-tokens.md`.

---

## Phase 6: User Story 4 — Consolidated and Up-to-Date Documentation (Priority: P2)

**Goal**: README trimmed to tagline + install + highlights + docs link. `docs/config-format.md` migrated to docs site. CONTRIBUTING.md reflects current project structure. Zero `tilde.sh` domain references in active source.

**Independent Test**: `grep -rn "tilde\.sh" src/ docs/ site/docs/src/ tests/ README.md CONTRIBUTING.md` returns no matches. README renders cleanly at under 50 lines.

- [X] T0022 [P] [US4] Update schema URL in `site/docs/src/content/docs/config-reference.md` — replace all occurrences of `https://tilde.sh/config-schema/v1.json` with `https://thingstead.io/tilde/config-schema/v1.json`
- [X] T0023 [P] [US4] Update schema URL in `docs/config-format.md` — replace `tilde.sh` URL with `thingstead.io/tilde` URL (pre-migration cleanup before T024)
- [X] T0024 [US4] Migrate `docs/config-format.md` to `site/docs/src/content/docs/config-format.md` — copy file with frontmatter (`title: Configuration Format`, `description: ...`) compatible with Starlight content collection format
- [X] T0025 [US4] Add `config-format` page to Starlight sidebar in `site/docs/astro.config.mjs` — insert `{ label: 'Configuration Format', slug: 'config-format' }` in appropriate sidebar position

  **Depends on**: T0011 — both T0025 and T0011 modify `site/docs/astro.config.mjs`; run T0011 to completion before starting T0025 to avoid merge conflicts
- [X] T0026 [US4] Delete `docs/config-format.md` from repository root `docs/` — file has been migrated to `site/docs/src/content/docs/config-format.md` in T024
- [X] T0027 [US4] Consolidate `README.md` — trim to: (1) Thingstead/tilde tagline, (2) one-liner install command, (3) 3–5 feature highlights, (4) "Full documentation →" link to `https://thingstead.io/tilde/docs/`; verify any content removed already exists in the docs site
- [X] T0028 [US4] Update `CONTRIBUTING.md` project/file structure section — replace any outdated directory tree with current actual structure (reflecting `site/`, `docs/design/`, `src/`, `specs/`, `tests/`, `scripts/`, `terraform/`)

**Checkpoint**: `grep -rn "tilde\.sh" src/ docs/ site/docs/src/ tests/ README.md CONTRIBUTING.md` returns no output. README is lean. CONTRIBUTING.md file tree matches `ls -R` of actual repo.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validation, regression checks, and final cleanup.

- [X] T0029 Run full test suite — `npm test` and `npx vitest run --config vitest.integration.config.ts` and `npx vitest run --config vitest.contract.config.ts` — all tests must pass
- [X] T0030 [P] Build docs site and verify routing — `cd site/docs && npm run build`; confirm no build errors and `site/docs/dist/` HTML sidebar hrefs all include `/tilde/docs/` prefix
- [X] T0031 [P] Run lint — `npm run lint`; fix any issues introduced by changes in this feature
- [X] T0032 [P] Final domain reference audit — run `grep -rn "tilde\.sh" src/ docs/ site/docs/src/ tests/ README.md CONTRIBUTING.md --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json" --include="*.sh" --include="*.html" --include="*.mjs"` — output must be empty
- [X] T0033 Verify install script TTY behavior — run `echo "" | bash site/tilde/install.sh 2>/dev/null`; must print success message and exit 0 without Ink raw mode error

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS test validation for all stories
- **US1 (Phase 3)**: Depends on Phase 2 completion
- **US2 (Phase 4)**: Depends on Phase 2 completion — independent of US1
- **US3 (Phase 5)**: Depends on Phase 2 completion — independent of US1, US2
- **US4 (Phase 6)**: Depends on Phase 2 completion; T025 (sidebar) should run after T011 (routing fix already in place)
- **Polish (Phase 7)**: Depends on all desired stories complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependency on US2, US3, US4
- **US2 (P1)**: Can start after Phase 2 — no dependency on US1, US3, US4
- **US3 (P2)**: Can start after Phase 2 — no dependency on other stories
- **US4 (P2)**: Can start after Phase 2; T025 benefits from T011 (routing) being done first

### Within Each User Story

- US1: T007 (install.sh fix) → T008 (index.tsx guard) can both start; T009 and T010 are parallel audits
- US2: T011 → T012 → T013 (sequential investigation flow)
- US3: T014 (logo) → T015 (PNG export) and T017/T018 (favicons) are parallel after logo exists; T016 (tokens) is independent
- US4: T022/T023 (URL cleanup) → T024 (migration) → T025 (sidebar) → T026 (delete source)

### Parallel Opportunities

- T003, T004, T005, T006 — all schema URL replacements run in parallel (different files)
- T009, T010 — parallel duplicate key audits
- T014, T016 — logo creation and tokens doc are independent
- T017, T018 — two favicon files, parallel
- T022, T023 — parallel URL cleanup in different files
- T029, T030, T031, T032 — all final validation checks run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```
Launch simultaneously (different test files, no conflicts):
  Task T003: Replace tilde.sh URL in tests/fixtures/tilde.config.json
  Task T004: Replace tilde.sh URL in tests/unit/*.test.ts (4 files)
  Task T005: Replace tilde.sh URL in tests/integration/*.test.ts (2 files)
  Task T006: Replace tilde.sh URL in tests/contract/config-schema.test.ts
```

## Parallel Example: User Story 3 (Branding)

```
Sequential dependency:
  Task T014: Create thingstead-logo.svg  ← must complete first

Then launch simultaneously:
  Task T015: Export thingstead-logo.png
  Task T016: Create design-tokens.md
  Task T017: Create site/docs/public/favicon.svg
  Task T018: Create site/tilde/favicon.svg
```

---

## Implementation Strategy

### MVP First (P1 bugs only — US1 + US2)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T006)
3. Complete Phase 3: US1 — install fix (T007–T010)
4. Complete Phase 4: US2 — docs routing (T011–T013)
5. **STOP and VALIDATE**: Both P1 bugs fixed and verified
6. Ship fix — users can install via `curl | bash` and navigate docs

### Full Delivery (All 4 stories)

1. Setup + Foundational → Foundation ready
2. US1 + US2 → P1 bugs resolved (MVP)
3. US3 → Branding consistent across all surfaces
4. US4 → Docs consolidated and clean
5. Polish → All tests green, lint clean, zero `tilde.sh` references

### Parallel Team Strategy

With two developers after Phase 2:
- **Developer A**: US1 (T007–T010) then US3 (T014–T021)
- **Developer B**: US2 (T011–T013) then US4 (T022–T028)

---

## Notes

- [P] tasks use different files — safe to parallelise with no merge conflicts
- [Story] label maps each task to its user story for traceability to spec.md
- US1 and US2 are P1 — complete these before starting P2 work
- Schema URL migration (Phase 2) must accept both old and new URLs in the validator to avoid breaking existing user `tilde.config.json` files on disk
- Commit after each phase with conventional commit messages referencing issues: `fix: #20`, `fix: #21`, `feat: #22`, `chore: #23`, `docs: #24`, `docs: #26`, `fix: #28`
- Design assets (T014–T018) require visual judgment — review in browser before committing
