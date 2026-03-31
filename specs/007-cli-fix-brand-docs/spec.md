# Feature Specification: CLI Fix, Brand Consolidation & Docs Reorganization

**Feature Branch**: `007-cli-fix-brand-docs`  
**Created**: 2025-07-17  
**Status**: Draft  
**Issues**: #41, #42, #43, #44, #45, #46

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Restore CLI Output After v1.3.0 Regression (Priority: P1)

A developer installs or upgrades to Tilde v1.3.0 and runs it from the command line. Currently the CLI produces no output at all — no banner, no prompts, no errors — leaving the user with no feedback that the tool is running or broken. This story restores the expected CLI output so users can see the tool is working.

**Why this priority**: This is a critical regression that makes the tool completely unusable for all CLI users. No other fix matters if the tool silently does nothing when invoked.

**Independent Test**: Install the project locally, run the CLI entry point (`tilde` or equivalent), and verify that visible output (banner, prompts, or status messages) appears in the terminal. Delivers full user-facing value as a standalone fix. **Automated regression coverage**: An integration test in `tests/integration/` spawns `bin/tilde.ts` via Node.js `child_process`, asserts that stdout is non-empty, and asserts the process exits cleanly (exit code 0). This test must pass on every CI run.

**Acceptance Scenarios**:

1. **Given** a user has Tilde v1.3.0 installed, **When** they invoke the CLI with no arguments, **Then** the tool displays its expected startup output (banner and/or first prompt) rather than silently exiting.
2. **Given** a user runs Tilde with valid arguments, **When** the tool processes the request, **Then** all expected progress messages and results are visible in the terminal.
3. **Given** a user runs Tilde with invalid arguments, **When** the tool encounters an error, **Then** a meaningful error message is printed to the terminal rather than silent failure.

---

### User Story 2 - Correct the Tilde Logo Variation Asset (Priority: P2)

A designer or developer opens `docs/design/tilde-logo-variation.svg` expecting to find a variant of the Tilde logo. Instead, they see an image containing two tilde characters (`~~`), which is visually incorrect and inconsistent with the brand. This story resolves the broken asset by removing the duplicate glyph element.

**Why this priority**: A broken brand asset actively misleads contributors and downstream consumers. It is a higher priority than creating new assets but lower than restoring CLI functionality.

**Implementation Note**: During implementation, the SVG glyph was removed and the file was subsequently deleted from the design asset set. The file is no longer part of the consolidated brand asset inventory (see FR-008). The acceptance criteria below are satisfied by the file's removal — the asset no longer misleads anyone.

**Acceptance Scenarios**:

1. **Given** the file `docs/design/tilde-logo-variation.svg` existed with two tilde characters, **When** the design assets were reviewed, **Then** the file was removed from the repository rather than retained as a variation — eliminating the inconsistency.
2. **Given** the brand consolidation (US3), **When** all design assets are reviewed together, **Then** no broken or redundant logo variation asset exists in `docs/design/`.

---

### User Story 3 - Consolidate Banner and Logo Brand Assets (Priority: P3)

A contributor visits `docs/design/` and finds that the project banner (`docs/banner.svg`) and the Tilde logo assets use inconsistent visual styles, typography, or color choices, making the brand look fragmented. This story aligns the banner and logo so they share a coherent visual identity.

**Why this priority**: Brand consistency improves contributor and user trust. Comes after fixing the incorrect logo file since consolidation depends on having a correct logo as the reference.

**Independent Test**: Place the banner and the primary logo side-by-side; verify they share the same brand colors, typeface (or lettering style), and visual weight — a viewer should immediately identify them as belonging to the same product.

**Acceptance Scenarios**:

1. **Given** `docs/banner.svg` and the primary Tilde logo asset exist, **When** a user views both, **Then** they use a consistent color palette and visual style.
2. **Given** the consolidated banner and logo, **When** compared against the design tokens documented in `docs/design/design-tokens.md`, **Then** all colors and spacing values match the documented tokens.
3. **Given** any existing logo variation assets, **When** reviewed after consolidation, **Then** all variations are visually consistent with the primary logo.

---

### User Story 4 - Create a Distinct Thingstead Logo (Priority: P4)

A designer needs a logo for the Thingstead product/brand. Currently `docs/design/thingstead-logo.svg` (and `.png`) either does not exist or is a copy of the Tilde logo. Thingstead should have its own distinct visual identity that is clearly separate from the Tilde brand while potentially sharing design-system foundations.

**Why this priority**: Thingstead is a distinct product and needs its own brand assets. This is lower priority than fixing existing broken assets.

**Independent Test**: Open the Thingstead logo file and the Tilde logo file side-by-side. A viewer seeing them for the first time should immediately recognize them as two separate brands, not variants of the same logo.

**Acceptance Scenarios**:

1. **Given** the new Thingstead logo asset exists in `docs/design/`, **When** a user views it alongside the Tilde logo, **Then** the two logos are visually distinct (different mark, name, or both).
2. **Given** the Thingstead logo, **When** reviewed in isolation, **Then** it clearly reads as "Thingstead" (either by the wordmark or by an accompanying label/title in the asset).
3. **Given** both logo files, **When** exported or embedded in documentation, **Then** the Thingstead logo does not contain any Tilde-specific visual elements that would cause brand confusion.

---

### User Story 5 - Relocate Root-Level Markdown Files to docs/ (Priority: P5)

A contributor cloning the project finds `README.md`, `CHANGELOG.md`, and `CONTRIBUTING.md` in the repository root alongside source files, making the root directory cluttered. This story moves these files into `docs/` so documentation is co-located and the root is cleaner.

**Why this priority**: This is a housekeeping improvement. Important for long-term maintainability but not urgent relative to functional or brand fixes.

**Independent Test**: After the move, verify that (a) the files are no longer in the repository root, (b) the files exist under `docs/`, and (c) any internal cross-references or links between the documents still resolve correctly.

**Acceptance Scenarios**:

1. **Given** the repository after the move, **When** a user navigates to the root directory, **Then** `README.md`, `CHANGELOG.md`, and `CONTRIBUTING.md` are no longer present at the root level.
2. **Given** the moved files under `docs/`, **When** a user opens them, **Then** any internal hyperlinks (e.g., a link in README to CONTRIBUTING) resolve to the correct `docs/`-relative paths.
3. **Given** GitHub hosts the repository, **When** a user visits the repository homepage, **Then** the project README is rendered from `docs/README.md` — GitHub automatically detects and renders it when no root `README.md` exists.

---

### User Story 6 - Align Site Documentation Colors with Design Token Palette (Priority: P6)

As a site visitor, I want the documentation site to visually match the official brand color palette, so the site feels cohesive with the rest of the product.

A site visitor browses the documentation hosted under `site/` and notices that colors used for backgrounds, text, links, headings, and borders do not match the brand colors established in `docs/design/design-tokens.md`. This story updates the site docs to apply the canonical design token values for all primary UI color roles, ensuring visual consistency between the documentation site and other product surfaces.

**Why this priority**: Color consistency across the documentation site is a polish concern. All functional fixes and core brand asset work (P1–P5) take precedence, but this is a meaningful contributor to overall brand cohesion.

**Independent Test**: Conduct a visual review of the rendered documentation site and compare each primary color value (backgrounds, text, links, headings, borders) against the values defined in `docs/design/design-tokens.md`. Every primary color in the site must exactly match a token value.

**Acceptance Scenarios**:

1. **Given** the site documentation is rendered in a browser, **When** a site visitor views any page, **Then** all primary color values (backgrounds, text, links, headings, borders) match the tokens defined in `docs/design/design-tokens.md`.
2. **Given** the design tokens are updated in `docs/design/design-tokens.md`, **When** a developer references those values in the site styles, **Then** updating the token source is the single change required to propagate a color change to the site docs.
3. **Given** the site docs before and after this change, **When** a reviewer compares them against the official palette, **Then** zero undocumented or off-palette color values remain in primary UI elements.

---

### Edge Cases

- Piped/non-interactive environment behavior: FR-001 and SC-001 explicitly apply to interactive TTY only. Piped-mode support is out of scope for this fix and tracked as a follow-on issue.
- If `docs/banner.svg` uses a different SVG coordinate system or format from the logo files, do they still align visually when rendered at the same scale?
- When markdown files are moved to `docs/`, do any external tools (CI scripts, package.json references, linters) that reference root-level paths need updating?
- Moving `README.md` does not break GitHub rendering — GitHub automatically renders `docs/README.md` when no root README exists (clarified; no redirect stub required).
- If the Thingstead logo shares font files or SVG symbol definitions with the Tilde logo, does moving/renaming assets break references in either file?

## Requirements *(mandatory)*

### Functional Requirements

**CLI Regression Fix (Issue #45)**

- **FR-001**: The CLI MUST produce visible output (banner, prompt, or status message) when invoked in an **interactive TTY terminal** under v1.3.0+. This requirement applies to interactive terminal sessions only; piped/non-interactive mode is explicitly out of scope for this fix (see Out-of-Scope below) and is tracked as a follow-on issue.
- **FR-001a**: The CLI entry point MUST be implemented as `bin/tilde.ts` — a thin wrapper that unconditionally calls `main()`. `src/index.tsx` MUST remain a pure importable module with no top-level side effects (no auto-invocation on `require`/`import`).
- **FR-002**: The CLI MUST print a meaningful error message when invoked with invalid arguments in an interactive terminal, rather than exiting silently. **Implementation Note**: This requirement is **deferred** — the CLI currently ignores unknown flags and launches the interactive wizard. A `.todo` test in `tests/integration/cli-regression.test.ts` documents the gap. FR-002 is tracked as a follow-on implementation task.
- **FR-003**: All output that was present in v1.2.x MUST be restored in v1.3.0 unless explicitly deprecated and documented.

**Logo Correction (Issue #42)**

- **FR-004**: ~~The file `docs/design/tilde-logo-variation.svg` MUST display exactly one tilde symbol (or stylized single-tilde mark), not two tilde characters side-by-side.~~ **Resolved by deletion**: The file `docs/design/tilde-logo-variation.svg` was removed from the repository during implementation. The duplicate-glyph issue is resolved by removal; the file is no longer part of the brand asset set.
- **FR-005**: ~~The corrected logo variation MUST be visually consistent with the primary Tilde logo in color, typeface, and proportions.~~ **N/A**: Superseded by the deletion of `tilde-logo-variation.svg` (see FR-004).

**Brand Consolidation (Issue #44)**

- **FR-006**: The banner asset and the primary Tilde logo MUST share the same color palette as documented in `docs/design/design-tokens.md`. **Implementation Note**: `docs/banner.svg` was updated to replace all `#22d3ee` (cyan) instances with `#4ade80` (brand green) to align with the canonical design token value.
- **FR-007**: All brand assets in `docs/design/` MUST use consistent visual style (stroke weights, typography, spacing) after consolidation. Authoritative values: `stroke-width="2.5"` for mark strokes, monospace font stack (`ui-monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace`) per `docs/design/design-tokens.md`.
- **FR-008**: ~~The corrected `tilde-logo-variation.svg` MUST be included as part of the consolidated asset set.~~ **Resolved**: `tilde-logo-variation.svg` was removed from the repository. The consolidated brand asset set consists of `docs/banner.svg`, `docs/design/thingstead-logo.svg`, and `site/docs/src/assets/tilde-logo.svg`.

**Thingstead Logo (Issue #43)**

- **FR-009**: A Thingstead logo asset MUST exist in `docs/design/` as an SVG file. **Implementation Note**: A PNG export (`thingstead-logo.png`) was generated during implementation but subsequently removed — the SVG is the single authoritative source. No PNG is required or present.
- **FR-010**: The Thingstead logo MUST be visually distinct from the Tilde logo so the two brands cannot be confused. The symbol/mark MUST be independently designed with no tilde wave or tilde character. The logo MAY reuse the color palette and typeface from `docs/design/design-tokens.md`.
- **FR-011**: The Thingstead logo MUST clearly identify the "Thingstead" name, either as a wordmark or with a visible label in the asset.

**Documentation Reorganization (Issue #41)**

- **FR-012**: `README.md`, `CHANGELOG.md`, and `CONTRIBUTING.md` MUST be relocated from the repository root to the `docs/` directory.
- **FR-013**: All internal cross-links between relocated markdown files MUST be updated to reflect their new paths.
- **FR-014**: `README.md`, `CHANGELOG.md`, and `CONTRIBUTING.md` MUST be moved fully to `docs/` with no root-level README stub. GitHub automatically renders `docs/README.md` as the repository homepage when no root `README.md` is present.
- **FR-015**: Any project tooling, scripts, or CI configuration that references root-level markdown paths MUST be updated to reference the new `docs/` paths.

**Site Documentation Color Palette (Issue #46)**

- **FR-016**: The site documentation (`site/`) MUST apply color values from `docs/design/design-tokens.md` for all primary UI elements — backgrounds, text, links, headings, and borders. No off-palette or undocumented color values are permitted in these roles.

## Out of Scope

- **Piped/non-interactive mode CLI support**: FR-001 acceptance criteria apply to interactive TTY sessions only. Behavior when stdout is piped to another process or when the terminal is non-interactive is undefined for this release and tracked as a follow-on issue.
- **New version release specification**: Versioning decisions for this fix are out of scope.
- **Published package artifact updates**: Brand asset changes (SVG/PNG) affect repository source files only; no published package artifacts need updating for this release.
- **Root-level README stub**: No redirect or stub is required at the repository root after moving `README.md` to `docs/`; GitHub renders `docs/README.md` automatically.
- **Markdown files other than README, CHANGELOG, and CONTRIBUTING**: Files such as `LICENSE` at the root are out of scope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of users who invoke the Tilde CLI in an interactive TTY after the fix see visible terminal output — zero silent-exit occurrences for valid interactive invocations. Piped/non-interactive mode is out of scope for this criterion. **Test strategy**: Validated by an integration test in `tests/integration/` that spawns `bin/tilde.ts` via Node.js `child_process`, asserts stdout is non-empty, and asserts the process exits cleanly (exit code 0); this test must pass on every CI run.
- **SC-002**: ~~The corrected `tilde-logo-variation.svg` passes visual review with zero instances of duplicate tilde characters when rendered.~~ **Resolved by deletion**: `tilde-logo-variation.svg` was removed from the repository. The criterion is satisfied — no broken asset exists.
- **SC-003**: All brand assets in `docs/design/` share a documented, consistent color palette — zero undocumented color values appear in any asset after consolidation.
- **SC-004**: The Thingstead logo is immediately identifiable as distinct from the Tilde logo by 100% of reviewers in a side-by-side comparison. The symbol/mark contains no tilde wave or tilde character; shared elements are limited to the color palette and typeface defined in `docs/design/design-tokens.md`.
- **SC-005**: Zero root-level markdown files (`README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`) remain in the repository root after the documentation reorganization. No root README stub is required; GitHub renders `docs/README.md` automatically.
- **SC-006**: All internal hyperlinks in relocated documentation files resolve correctly — zero broken links after the move.
- **SC-007**: CI/CD pipeline passes without errors after all changes are applied — zero *new* build or lint failures introduced by this feature's changes. Note: 94 pre-existing lint errors exist in the baseline and are explicitly excluded from this criterion.
- **SC-008**: A visual review confirms that all primary color values in the site documentation (`site/`) match the tokens defined in `docs/design/design-tokens.md` — zero off-palette or undocumented color values remain in primary UI elements (backgrounds, text, links, headings, borders).

## Assumptions

- The CLI regression in v1.3.0 is caused by a code change (likely a rendering or output pathway change) rather than an environment or dependency issue; investigation will happen in the source under `src/`.
- "Consistent with the primary Tilde logo" means sharing the same design tokens already documented in `docs/design/design-tokens.md`; those tokens are considered authoritative.
- The Thingstead logo assets (`thingstead-logo.svg` and `thingstead-logo.png`) that currently exist in `docs/design/` are either placeholders or incorrect copies of the Tilde logo and will be replaced.
- GitHub rendering of the repository README is preserved by moving `README.md` to `docs/README.md`. GitHub automatically renders `docs/README.md` as the repository homepage when no root README exists (confirmed via GitHub documentation).
- "Root-level markdown files" in scope are: `README.md`, `CHANGELOG.md`, and `CONTRIBUTING.md`. Any other markdown files at the root (e.g., `LICENSE`) are out of scope unless specified.
- Brand asset changes (SVG/PNG) do not require updates to any published package artifacts for this release — only repository source files are in scope.
- The fix for the CLI regression does not require a new version release to be specified here; versioning decisions are out of scope for this specification.

## Clarifications

### Session 2026-03-30

- Q: CLI Regression Fix Strategy — how should the entry point / module boundary be restructured? → A: Extract CLI entry to a new `bin/tilde.ts` wrapper that unconditionally calls `main()`; keep `src/index.ts` as an importable module only (Option C).
- Q: Root README Stub Decision (FR-014) — is a root-level README stub required after moving markdown files to docs/? → A: No stub required. GitHub automatically renders `docs/README.md` as the repository homepage when no root `README.md` exists (confirmed via GitHub documentation). Markdown files move fully to `docs/` with no root-level remnant.
- Q: Thingstead Logo Design Boundary — what design elements may the Thingstead logo share with the Tilde brand? → A: The Thingstead logo may reuse the color palette and typeface defined in `docs/design/design-tokens.md`, but the symbol/mark must be independently designed with no tilde wave or tilde character.
- Q: Piped/Non-Interactive Mode Scope — does FR-001 apply to piped/non-interactive environments? → A: FR-001 and its acceptance criteria apply to interactive TTY only. Piped/non-interactive mode support is explicitly out of scope for this fix and is tracked as a follow-on issue.
- Q: Automated Regression Test Strategy — how should the CLI regression fix be automatically validated? → A: Integration test in `tests/integration/` that spawns `bin/tilde.ts` via Node.js `child_process`, asserts stdout is non-empty, and asserts the process exits cleanly (exit code 0); must pass on every CI run (Option B).
