# Feature Specification: UI/UX and Branding Consolidation

**Feature Branch**: `005-ui-branding-consolidation`  
**Created**: 2026-03-30  
**Status**: Draft  
**Input**: GitHub Issues #20, #21, #22 (primary), #23, #24, #26, #28

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fix Install in Non-Interactive Environment (Priority: P1)

A developer discovers tilde and follows the quickstart instructions, running `curl -fsSL https://thingstead.io/tilde/install.sh | bash` in their terminal. Today, this fails with a "Raw mode is not supported" error because the install script pipes into a shell, creating a non-interactive environment that the CLI cannot handle. After this fix, the install command completes successfully and tilde launches as expected.

**Why this priority**: The install script is the primary entry point for new users. A fatal error on first run is the highest-impact blocker — it prevents adoption entirely.

**Independent Test**: Run `curl -fsSL https://thingstead.io/tilde/install.sh | bash` in a terminal. The command must complete without errors and display the tilde welcome experience.

**Acceptance Scenarios**:

1. **Given** a user runs the install command via `curl | bash`, **When** the script executes in a non-interactive (piped) environment, **Then** tilde installs and completes setup without any error messages.
2. **Given** a non-interactive environment is detected, **When** the install script completes, **Then** the user sees a message such as "Run `tilde` in an interactive terminal to complete setup" — the interactive wizard does NOT launch automatically.
3. **Given** the install script runs with duplicate React component keys, **When** the UI renders, **Then** no duplicate-key warnings appear in the output.

---

### User Story 2 - Fix Docs Site Navigation (Priority: P1)

A user is browsing the tilde documentation at `https://thingstead.io/tilde/docs/` and clicks a navigation link such as "Installation." Instead of landing on `https://thingstead.io/tilde/docs/installation/`, they are incorrectly redirected to `https://thingstead.io/installation/` — a broken URL. After this fix, all navigation links on the docs site resolve to the correct paths under the `/tilde/` base.

**Why this priority**: Broken navigation makes the docs site unusable, directly harming the experience of any user trying to learn how to use tilde.

**Independent Test**: Open `https://thingstead.io/tilde/docs/` and click every navigation link. Every link must resolve to a valid page under the `/tilde/docs/` path.

**Acceptance Scenarios**:

1. **Given** a user is on the docs landing page, **When** they click any internal navigation link, **Then** the browser navigates to the correct page under the `/tilde/docs/` path.
2. **Given** a user directly visits a docs sub-page URL, **When** the page loads, **Then** all internal links on that page also resolve correctly.
3. **Given** a user refreshes a docs sub-page, **When** the page reloads, **Then** the correct page is displayed (no redirect to root or 404).

---

### User Story 3 - Consistent Branding Across All Surfaces (Priority: P2)

A user encounters tilde across multiple touchpoints: the GitHub README, the install page, the docs site, and the CLI splash screen. Today each surface has a slightly different look and feel. After this work, a standard Thingstead logo exists and is applied consistently — with appropriate minimal variations — across all surfaces. Colors and typefaces are unified, and favicons are present on web surfaces.

**Why this priority**: Consistent branding builds trust and professionalism. It is high impact but does not block core functionality, making it P2.

**Independent Test**: View the README, install page, docs site, and CLI splash side by side. All must display the Thingstead logo (or a sanctioned variation), use the same color palette, and use the same typeface family.

**Acceptance Scenarios**:

1. **Given** a visitor lands on any web surface (install page, docs site), **When** the page loads, **Then** a Thingstead favicon is displayed in the browser tab.
2. **Given** a user views the CLI splash screen, **When** tilde launches, **Then** the visual style (color, typography) is consistent with the web surfaces.
3. **Given** the standard Thingstead logo is defined, **When** it is placed on any surface, **Then** only approved logo variations are used (e.g., light/dark variants) with no ad-hoc styling differences.
4. **Given** a brand color palette and typeface are defined, **When** any UI surface renders, **Then** only those approved colors and typefaces appear.

---

### User Story 4 - Consolidated and Up-to-Date Documentation (Priority: P2)

A contributor or new user visits the GitHub repository. They find a README that is lean and purposeful — pointing them to the docs site for full documentation — and a CONTRIBUTING guide that accurately reflects the current project structure. All markdown documentation lives in the correct `docs/` folder. No links or references point to the old `tilde.sh` domain.

**Why this priority**: Accurate documentation reduces friction for contributors and new users alike. Stale references and sprawling READMEs create confusion but do not block installation.

**Independent Test**: Read the README, CONTRIBUTING.md, and browse the `docs/` folder. Verify all links resolve, all domain references are current, and no content points to `tilde.sh`.

**Acceptance Scenarios**:

1. **Given** a user reads the README, **When** they want to learn more, **Then** a clear link directs them to the full docs site.
2. **Given** the README is consolidated, **When** it is compared to the docs site, **Then** there is no duplicate content — each source has a distinct, clearly-scoped purpose.
3. **Given** a contributor reads CONTRIBUTING.md, **When** they review the project/file structure section, **Then** it accurately reflects the current repository layout.
4. **Given** all markdown documentation, **When** it is browsed, **Then** every file lives under the `docs/` folder (excluding top-level repo conventions like README and CONTRIBUTING).
5. **Given** any document or codebase file, **When** it references a domain or URL, **Then** no reference to the old `tilde.sh` domain exists.

---

### Edge Cases

- What happens if a user runs the install script in a CI/CD environment with no TTY attached? *(Out of scope for this iteration — CI/CD support is deferred.)*
- What if a user's browser caches old docs routes that no longer exist after the routing fix?
- How does the logo render on both light and dark backgrounds (e.g., GitHub dark mode vs. docs site)?
- What if the `docs/` folder migration breaks existing external links pointing to the old markdown paths?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The install script MUST complete successfully when executed in a non-interactive (piped) environment such as `curl | bash` in a developer terminal. CI/CD pipeline support is explicitly out of scope for this iteration.
- **FR-002**: When the CLI is launched in a non-interactive (piped/headless) environment, it MUST detect this condition, skip the interactive wizard, and print a clear message directing the user to run `tilde` in an interactive terminal to complete setup.
- **FR-003**: Duplicate component key warnings MUST be eliminated from the CLI render output.
- **FR-004**: All internal navigation links on the docs site MUST resolve to correct paths relative to the `/tilde/` base path.
- **FR-005**: A standard Thingstead logo MUST be created and delivered as an SVG source file plus PNG exports, committed to `docs/design/` in the repository. A `design-tokens.md` file in the same directory MUST document the approved color palette and typeface. Design tooling (e.g., Storybook) is out of scope for this iteration but the tokens foundation enables future migration.
- **FR-006**: Brand colors and typeface MUST be defined and applied consistently across: the install page, docs site, and CLI splash screen. GitHub Markdown surfaces (README) are excluded — custom CSS cannot be applied to GitHub-rendered Markdown.
- **FR-007**: A favicon derived from the Thingstead logo MUST be present on all web surfaces (install page, docs site).
- **FR-008**: The README MUST be consolidated to contain: a tagline, the one-liner install command, a short list of feature highlights, and a prominent link to the full docs site. Content beyond this scope MUST be removed from the README and confirmed to exist in the docs site instead.
- **FR-009**: All markdown documentation files MUST be located within the `docs/` folder, with the exception of standard top-level repo files (README.md, CONTRIBUTING.md, CHANGELOG.md, LICENSE).
- **FR-010**: CONTRIBUTING.md MUST include an accurate and current project/file structure reference.
- **FR-011**: All references to the old `tilde.sh` domain MUST be replaced with the current domain across all documentation and codebase files.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The `curl -fsSL https://thingstead.io/tilde/install.sh | bash` command completes with exit code 0 and zero error messages in a non-interactive environment.
- **SC-002**: 100% of internal docs site navigation links resolve to valid pages without redirects to incorrect paths.
- **SC-003**: Zero occurrences of the old `tilde.sh` domain remain in any documentation or source file after cleanup.
- **SC-004**: All web surfaces (install page, docs site) display a Thingstead favicon and logo within a single viewport without custom per-surface styling overrides.
- **SC-005**: A new user can navigate from the GitHub README to the full documentation site in one click.
- **SC-006**: The CONTRIBUTING.md project structure section matches the actual repository layout with zero discrepancies.

## Assumptions

- The current production domain for tilde is `thingstead.io/tilde/` and the docs site is hosted at `thingstead.io/tilde/docs/` with a `/tilde/` base path configured in the static site generator.
- `tilde.sh` was a prior domain that is no longer active; all references to it are stale and should be replaced.
- The Thingstead brand is the parent brand; tilde is a product under it. The logo created for Thingstead will be adapted (not duplicated) for tilde-specific surfaces.
- A design tooling standard (e.g., Storybook) is out of scope for this iteration; branding consistency will be enforced through a `design-tokens.md` file and committed logo assets (SVG + PNG) located in `docs/design/`. The tokens foundation explicitly supports a future Storybook migration without rework.
- The relationship between the root-level `docs/` folder and `site/docs/` is a planning-level concern. The intent is for the site generator to consume `docs/` as its content source (single source of truth), avoiding duplication. This architecture should be confirmed and wired up during implementation planning.
- Mobile responsiveness of web surfaces is assumed to already meet baseline standards; this feature does not introduce new responsive design work.
- The `docs/` migration will update internal cross-references; the team accepts that any external links pointing to old markdown paths may break and will not be redirected.
- The duplicate React component key issue and raw mode error in #20 are both present in the same install flow and will be resolved together.

## Clarifications

### Session 2026-03-30

- Q: Where should brand assets (SVG, PNG, design-tokens.md) live in the repo? → A: `docs/design/` — co-located with contributor documentation.
- Q: Is CI/CD pipeline support in scope for the non-interactive install fix? → A: Out of scope — only `curl | bash` in a developer terminal is targeted for this iteration.
- Q: What content should remain in the README after consolidation? → A: Tagline + install command + short feature highlights + link to full docs. Content beyond this scope moves to the docs site.
- Q: When the CLI detects a non-interactive environment during install, what should happen? → A: Install completes successfully and prints a message directing the user to run `tilde` in an interactive terminal to complete setup; the interactive wizard does NOT launch automatically.
- Q: What logo/brand artifacts must be delivered and where? → A: SVG source + PNG exports committed to the repo; a `design-tokens.md` file documents approved colors and typeface. Storybook is out of scope now but the tokens foundation supports future migration.
