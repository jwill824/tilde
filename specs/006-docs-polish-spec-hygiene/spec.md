# Feature Specification: Documentation Polish and Spec Hygiene

**Feature Branch**: `006-docs-polish-spec-hygiene`  
**Created**: 2026-03-31  
**Status**: Implemented  
**Input**: GitHub Issues #35, #15, #23, #36, #37, #38, #39, #32

## Clarifications

### Session 2026-03-30

- Q: Which SVG file should FR-010's "Thingstead logo" in the README header reference — the base `thingstead-logo.svg`, the new `tilde-logo-variation.svg`, or the existing `banner.svg`? → A: `docs/design/tilde-logo-variation.svg` — it is the tilde-specific product mark created precisely for product surfaces; the existing `banner.svg` remains unchanged.
- Q: What ESM-compatible mechanism should FR-006 use to read the package version from `package.json` at runtime given `"type": "module"` and Node ≥ 20? → A: `readFileSync` + `JSON.parse` via `import.meta.url` — portable across ESM environments, no import assertions needed, no dependency on npm runtime.
- Q: For FR-004, what should the schema versioning/migration section in `docs/config-format.md` contain given that v1 is the inaugural schema with no prior migrations? → A: Document that v1 is the inaugural schema (no prior versions exist), explain how the migration runner automatically detects `schemaVersion` and applies upgrades additively and non-destructively, and include a template skeleton for future version entries so the section is immediately useful when v2 is introduced.
- Q: For FR-009, what constitutes the "tilde-specific visual element" that distinguishes `tilde-logo-variation.svg` from the base `thingstead-logo.svg`? → A: The tilde character (`~`) incorporated into the logomark — semantically unambiguous, immediately identifies the product, consistent with developer-tool visual language.
- Q: For FR-005, what documentation strategy should be used for technically-named fields (`authMethod`, `envVars`, `secretsBackend`) given the non-technical audience requirement? → A: Wizard-equivalent phrasing — use the same purpose-driven language the wizard presents to users for each field, avoiding internal identifiers; map wizard question text to field descriptions so the doc matches what users see in the interactive flow.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Config-First Users Can Author `tilde.config.json` Without the Wizard (Priority: P1)

A developer wants to prepare their tilde configuration before they even have a machine to run
the wizard on — for example, setting up a new machine from scratch using a config file they
authored in advance. They visit the tilde GitHub repository, navigate to `docs/config-format.md`,
and find a complete, plain-language reference covering every field in `tilde.config.json` —
with an annotated example, clear descriptions of valid values, and guidance on how schema
versioning works so their config stays compatible across tilde upgrades.

**Why this priority**: The tilde constitution (Principle I) mandates config-first mode as a
first-class entry path. The constitution also explicitly requires `docs/config-format.md` to
exist at the mandated repo path. Today that file is absent from `docs/` (it exists only inside
the docs site source tree, not at the repository root path the constitution requires), and the
schema reference is incomplete. This blocks users from the config-first workflow. Resolves
issues #35 and #15.

**Independent Test**: Open `docs/config-format.md` in the repository root. Using only that
document and no other resources, author a valid `tilde.config.json` that covers all required
fields. Feed it to tilde and confirm it is accepted without errors.

**Acceptance Scenarios**:

1. **Given** a user visits the tilde GitHub repository, **When** they navigate to `docs/config-format.md`, **Then** the file exists at that path and renders a complete configuration reference.
2. **Given** a user reads `docs/config-format.md`, **When** they attempt to set any configuration field, **Then** every field is documented with its name, a plain-English description, valid values or format, whether it is required or optional, and a default value where applicable.
3. **Given** a user reads `docs/config-format.md`, **When** they review the annotated example, **Then** they can copy it and fill it in without needing to consult any other document.
4. **Given** a user has a `tilde.config.json` written for an older schema version, **When** they read the migration notes in `docs/config-format.md`, **Then** they understand what changed between versions and how to update their file.
5. **Given** a user with no technical background reads `docs/config-format.md`, **When** they encounter a field they don't recognise, **Then** the description uses plain language — no jargon about code constructs, no assumption of prior CLI knowledge.

---

### User Story 2 - CLI Splash Screen Shows the Actual Running Version (Priority: P1)

A developer launches tilde and sees the splash screen. The version shown in the splash — and
in any other CLI output — matches the installed version of tilde they are actually running,
not a stale number baked in at some earlier point in the codebase. If tilde is updated without
a corresponding source change, the displayed version updates automatically.

**Why this priority**: The tilde constitution (Principle IV) explicitly requires the splash
screen to display the running tilde version dynamically at runtime. Today the source contains
a hardcoded version constant (`0.1.0`) that is out of sync with the published package version
(`1.2.0`). This is a constitution violation and actively misleads users about which version
they are running. Resolves issue #32.

**Independent Test**: Install a known version of tilde, run it, and verify the version shown
on the splash matches the installed package version exactly. Update to a newer version without
any source changes and re-run; the splash version must update without any manual edits.

**Acceptance Scenarios**:

1. **Given** tilde is launched in interactive mode, **When** the splash screen renders, **Then** the displayed tilde version matches the version declared in the project's own package manifest.
2. **Given** tilde is updated to a newer release, **When** the splash screen renders after the update, **Then** the version shown reflects the new release — no source changes required.
3. **Given** tilde is launched with `--version`, **When** the output is printed, **Then** the version string matches what the splash screen displays and the package manifest version.
4. **Given** tilde is run in CI / non-interactive mode (`--ci` or `--yes`), **When** the process runs, **Then** the splash screen is suppressed (per Principle IV), and the version requirement does not cause any errors.

---

### User Story 3 - README Header Displays the Tilde Product Logo (Priority: P2)

A potential contributor or user lands on the tilde GitHub repository page. The first thing
they see in the README is the Thingstead logo, centred in the header, giving the project an
instantly recognisable brand identity consistent with the other Thingstead surfaces. A product
variant of the logo — `tilde-logo-variation.svg` — is also available in `docs/design/` for
use wherever a tilde-specific mark is needed.

**Why this priority**: Branding consistency was established in spec 005. The README header logo
and the product logo variant are the two visible deliverables left outstanding from that work.
They improve first impressions without affecting any functional behaviour, making this P2 after
the two P1 constitution violations. Resolves issues #36 and #37.

**Independent Test**: Open the tilde GitHub repository in a browser. Verify the README header
shows a centred Thingstead logo image. Navigate to `docs/design/tilde-logo-variation.svg` and
confirm the file exists and renders as a coherent product logo variation consistent with the
design tokens defined in `docs/design/design-tokens.md`.

**Acceptance Scenarios**:

1. **Given** a visitor opens the tilde GitHub repository, **When** they view the README, **Then** a centred tilde product logo (`tilde-logo-variation.svg`) `<img>` element appears at the top of the header section.
2. **Given** the logo image in the README, **When** GitHub renders it, **Then** it is centred (using standard GitHub Markdown alignment) and displays correctly in both light and dark mode.
3. **Given** the `docs/design/` folder, **When** a contributor browses it, **Then** `tilde-logo-variation.svg` exists and is visually consistent with the existing `thingstead-logo.svg` design tokens (same colour palette and proportions, with a tilde-specific element).
4. **Given** the logo variation SVG, **When** it is opened standalone, **Then** it renders without errors and at a legible default size.

---

### User Story 4 - All Markdown Documentation Lives in the Right Place (Priority: P2)

A contributor browsing the tilde repository can find all project documentation under the
`docs/` folder, as the tilde constitution requires. No stray markdown files live at the
repository root (except the standard allowed exceptions: README.md, CONTRIBUTING.md,
CHANGELOG.md, LICENSE). This makes the repository easier to navigate and keeps it in
compliance with the project constitution.

**Why this priority**: Constitution compliance is required for all PRs. Any remaining loose
markdown files represent ongoing violations. While not user-facing, this unblocks clean audits
and reduces contributor confusion. Resolves issue #23.

**Independent Test**: Run a directory listing of all `.md` files in the repository root
(excluding the allowed exceptions). No additional markdown files should be found. Verify that
any content migrated from the root now exists under `docs/`.

**Acceptance Scenarios**:

1. **Given** the repository root, **When** all files are listed, **Then** the only `.md` files present are README.md, CONTRIBUTING.md, CHANGELOG.md, and LICENSE (if markdown).
2. **Given** any markdown document that was previously at the root, **When** it is browsed from `docs/`, **Then** its content is intact and any internal links still resolve correctly.
3. **Given** any document that links to a previously-root-level markdown file, **When** the link is followed, **Then** it resolves to the new `docs/` location without a broken path.

---

### User Story 5 - Spec 005 Hygiene Corrections Are Applied (Priority: P3)

A future contributor reading spec 005 (`005-ui-branding-consolidation`) sees accurate, enforceable
requirements and correct task dependency information. FR-006 no longer contains an unenforceable
requirement about applying brand colours and typefaces via GitHub Markdown (which cannot support
custom CSS). The tasks file correctly documents that T0021 and T0025 depend on T0011, since all
three modify the same Astro configuration file and must run sequentially to avoid merge conflicts.

**Why this priority**: These are spec hygiene fixes with no user-facing impact. They prevent
future confusion for anyone implementing or reviewing spec 005, but they do not block any
current work. Resolves issues #38 and #39.

**Independent Test**: Read spec 005's FR-006 and verify it contains no reference to applying
custom colours or typefaces on GitHub Markdown surfaces. Open spec 005's tasks.md and confirm
T0021 and T0025 each declare a dependency on T0011.

**Acceptance Scenarios**:

1. **Given** spec 005 `spec.md`, **When** FR-006 is read, **Then** it describes only enforceable branding requirements — no mention of applying custom CSS, colours, or typefaces to GitHub Markdown surfaces.
2. **Given** spec 005 `tasks.md`, **When** T0021 is read, **Then** it lists T0011 as a prerequisite dependency.
3. **Given** spec 005 `tasks.md`, **When** T0025 is read, **Then** it lists T0011 as a prerequisite dependency.
4. **Given** a reader reviewing the corrected FR-006, **When** they evaluate it against a completed implementation, **Then** they can make a clear pass/fail determination without ambiguity.

---

### Edge Cases

- What if `docs/config-format.md` already has partial content from a previous attempt? The file must be replaced with a complete, authoritative version — partial content is treated as absent.
- What if a loose markdown file at the repository root contains content also present in `docs/`? Duplicates must be resolved by retaining the `docs/` copy and removing the root copy; if the root copy contains content not yet in `docs/`, that content must be merged before the root file is removed.
- What if the Thingstead logo in the README renders differently across GitHub's light and dark themes? The logo SVG must be tested against both themes; if a single file cannot satisfy both, a light-mode-first approach is used (GitHub's default) and the issue is noted in `docs/design/`.
- What if the package manifest version is unavailable at runtime (e.g., in an unusual installation path)? The splash screen must fall back gracefully to a static placeholder string (e.g., `unknown`) rather than crashing or showing an empty field — consistent with the constitution's graceful fallback requirement in Principle IV.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The file `docs/config-format.md` MUST exist at that exact path in the repository (not only within the docs site source tree), satisfying the constitution's mandate in the Entry Modes / Config Schema sections.
- **FR-002**: `docs/config-format.md` MUST document every field in `tilde.config.json` — each with its field name, a plain-English description, the set of valid values or expected format, whether the field is required or optional, and a default value where one exists.
- **FR-003**: `docs/config-format.md` MUST include a fully annotated example `tilde.config.json` that covers all required fields and representative optional fields, with inline comments explaining each entry in plain language.
- **FR-004**: `docs/config-format.md` MUST include a schema versioning and migration section explaining: what `schemaVersion` means, how tilde uses it on load, what happens when a config is on an older version, and the guarantee that migration is additive and non-destructive. The section MUST explicitly state that v1 is the inaugural schema (no prior versions exist and no migration is required for any config already at v1), describe how the migration runner automatically detects `schemaVersion` and applies upgrades, and include a clearly marked template skeleton (e.g., "Future migrations will follow this pattern: …") so the section remains useful when v2 is introduced.
- **FR-005**: `docs/config-format.md` MUST be written for non-technical users — no references to code constructs, compiler behaviour, or internal implementation; terminology must match what the wizard uses when presenting the same choices. For technically-named fields (e.g., `authMethod`, `envVars`, `secretsBackend`), descriptions MUST use wizard-equivalent, purpose-driven language that maps directly to the wizard's own question text — internal identifiers must not appear as explanatory terms; they may appear only as field name labels.
- **FR-006**: The CLI splash screen MUST display the tilde version read dynamically from the project's own package manifest at startup, not from a hardcoded constant in source code. The version MUST be read using `readFileSync` + `JSON.parse` resolved via `import.meta.url` — this is the required ESM-compatible mechanism; `createRequire`, import assertions, and `process.env.npm_package_version` are explicitly excluded.
- **FR-007**: The version displayed on the CLI splash screen MUST match the version reported by `tilde --version` and the version in the project's package manifest. All three must be consistent at all times without any manual synchronisation step.
- **FR-008**: When the package manifest version cannot be determined at runtime, the splash screen MUST display a graceful fallback (e.g., `unknown`) rather than an error or blank value.
- **FR-009**: The file `docs/design/tilde-logo-variation.svg` MUST be created as a product variant of the Thingstead logo, using the colour palette and proportions defined in `docs/design/design-tokens.md`, with the tilde character (`~`) incorporated into the logomark as the distinguishing visual element — this is the required tilde-specific mark that distinguishes it from the base `thingstead-logo.svg`.
- **FR-010**: The README.md header MUST display the Thingstead logo as a centred `<img>` element using standard GitHub Markdown alignment techniques, referencing `docs/design/tilde-logo-variation.svg` as the logo source — not the base `thingstead-logo.svg` nor the existing `banner.svg` (which remains unchanged). The existing `<div align="center">` banner wrapper MAY be extended to include the logo `<img>` above or alongside the current banner, provided the result renders correctly on GitHub.
- **FR-011**: All markdown documentation files in the repository MUST reside under the `docs/` folder, with the sole exceptions of README.md, CONTRIBUTING.md, CHANGELOG.md, and LICENSE. Any remaining non-compliant files must be migrated with content intact and internal links updated.
- **FR-012**: Spec 005 (`specs/005-ui-branding-consolidation/spec.md`) FR-006 MUST be narrowed to remove any requirement about applying brand colours or typefaces on GitHub Markdown surfaces (which cannot support custom CSS). The revised requirement MUST describe only enforceable, verifiable branding outcomes.
- **FR-013**: Spec 005 (`specs/005-ui-branding-consolidation/tasks.md`) MUST document that task T0021 depends on T0011, and that task T0025 depends on T0011, with the rationale that all three tasks modify the same Astro configuration file and must execute sequentially.

### Key Entities

- **Config Format Document** (`docs/config-format.md`): The authoritative plain-language reference for `tilde.config.json`. Covers all fields, valid values, an annotated example, and schema migration guidance. Audience: non-technical users and developers new to tilde.
- **tilde.config.json schema**: The versioned structure of the configuration file. Contains a `schemaVersion` field; each version is documented in the config format document with forward migration notes.
- **Tilde Logo Variation** (`docs/design/tilde-logo-variation.svg`): A product-specific SVG mark derived from the base Thingstead logo. Constrained by the design tokens defined in `docs/design/design-tokens.md`.
- **Splash Screen**: The animated terminal screen displayed on every interactive tilde launch. Displays OS, architecture, shell, and — critically for this feature — the dynamically read tilde version.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with no prior tilde experience can write a valid, wizard-equivalent `tilde.config.json` from scratch using only `docs/config-format.md` — verified by having a test reader complete the task without any other assistance and succeeding on first attempt. **Note (post-implementation)**: This is a manual usability criterion with no automated verification path. Automated schema validation (`npm run validate:config-doc`) covers SC-008 (field coverage) but not SC-001 (usability). Recommend exercising this at beta/v2.0 milestone with a real test reader.
- **SC-002**: The version displayed on the CLI splash screen matches the installed package version on 100% of launches, across a clean install, an upgrade, and a downgrade scenario. **Note (post-implementation)**: Clean install and runtime read are covered by unit tests. Upgrade/downgrade scenarios are validated manually at release time; no automated integration test covers this path.
- **SC-003**: Zero markdown files exist at the repository root other than the four permitted exceptions (README.md, CONTRIBUTING.md, CHANGELOG.md, LICENSE), confirmed by a directory listing. **Audit result (2026-03-30)**: ✅ PASS — `find . -maxdepth 1 -name "*.md"` returns exactly `CHANGELOG.md`, `CONTRIBUTING.md`, `README.md` (3 files; LICENSE has no extension).
- **SC-004**: The tilde product logo (`tilde-logo-variation.svg`) is visible and centred in the README header when the repository is viewed on GitHub in a standard browser — confirmed in both light and dark theme.
- **SC-005**: `docs/design/tilde-logo-variation.svg` exists, opens without rendering errors, and is visually identifiable as a tilde-specific variant of the Thingstead brand — verified by reviewing the file against `docs/design/design-tokens.md`.
- **SC-006**: Spec 005 FR-006 contains no requirements that reference GitHub Markdown CSS, custom colours applied in Markdown, or typeface enforcement in the README — confirmed by reading the revised requirement.
- **SC-007**: Spec 005 tasks.md shows explicit dependency declarations for T0021 → T0011 and T0025 → T0011 — confirmed by reading both task entries.
- **SC-008**: `docs/config-format.md` covers 100% of the fields present in the current `tilde.config.json` schema, with no undocumented fields — verified by comparing the document against the schema definition.

## Assumptions

- The `tilde.config.json` schema is at version `1` currently; all migration guidance in `docs/config-format.md` will describe the path from any previous version to version `1`. Future schema versions are out of scope for this spec but the document structure must accommodate them.
- The Thingstead logo source assets (`docs/design/thingstead-logo.svg`) and design tokens (`docs/design/design-tokens.md`) from spec 005 are already in place; `tilde-logo-variation.svg` builds on those rather than redefining the brand.
- The README logo uses a GitHub-hosted path to the SVG (e.g., a relative path or raw GitHub URL) so it renders on the GitHub repository page without a separate CDN or hosting requirement.
- "Non-technical user" means someone who understands their developer toolchain goals (e.g., "I want to use Node 22 with nvm") but is not expected to know JSON schema standards, TypeScript types, or internal tilde architecture.
- The splash screen version change is limited to reading the version from the package manifest at runtime — no changes to the splash visual design, animation, or other displayed fields are in scope.
- Spec 005 corrections (FR-006 narrowing and tasks.md dependency declarations) are editorial changes only; they do not change the scope of work in spec 005, only its accuracy and enforceability.
- Any markdown files found at the repository root that are not among the four permitted exceptions are either stale or have been superseded by content already in `docs/`. If unique content is found, it will be merged into `docs/` before the root file is removed.
