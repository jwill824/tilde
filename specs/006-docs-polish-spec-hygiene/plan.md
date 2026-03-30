# Implementation Plan: Documentation Polish and Spec Hygiene

**Branch**: `006-docs-polish-spec-hygiene` | **Date**: 2026-03-31 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/006-docs-polish-spec-hygiene/spec.md`

## Summary

This feature resolves two P1 constitution violations (missing `docs/config-format.md`, hardcoded CLI version constant) and delivers three follow-on improvements: a tilde product logo variation SVG, a README logo header, and spec 005 editorial corrections. No new runtime schema, no API changes, no new plugin contracts. The only source code change is replacing `const VERSION = '0.1.0'` in `src/index.tsx` with a runtime read of `package.json` via `readFileSync + JSON.parse` anchored to `import.meta.url`.

**Deliverables**:
1. `docs/config-format.md` — standalone plain-English schema reference (based on existing Starlight draft at `site/docs/src/content/docs/config-format.md`, expanded with wizard phrasing and complete migration section)
2. `src/index.tsx` — single-line fix: `const VERSION = readPackageVersion()` replacing `'0.1.0'`
3. `docs/design/tilde-logo-variation.svg` — brand-consistent product logomark with `~` character
4. `README.md` — logo `<img>` inserted in existing `<div align="center">` header
5. `specs/005-ui-branding-consolidation/spec.md` — FR-006 narrowed (remove README surface)
6. `specs/005-ui-branding-consolidation/tasks.md` — T0021 and T0025 declare T0011 dependency

## Technical Context

**Language/Version**: TypeScript 5.4, Node.js 20 LTS, ESM (`"type": "module"`)  
**Primary Dependencies**: Ink (React terminal UI), Zod (config schema validation), `node:fs`, `node:url`, `node:path`  
**Storage**: File system only — `docs/`, `docs/design/`, `src/`, `specs/`  
**Testing**: Vitest (`npm test`) — existing unit tests cover `captureEnvironment`; one new unit test for `readPackageVersion()` fallback  
**Target Platform**: macOS (runtime); GitHub.com (SVG and Markdown rendering)  
**Project Type**: CLI tool  
**Performance Goals**: N/A — startup-time file read is synchronous and sub-millisecond  
**Constraints**: ESM-safe version reading only (no `createRequire`, no import assertions, no `process.env.npm_package_version`); SVG must render on GitHub in both light and dark themes  
**Scale/Scope**: 6 files changed or created; ~1 source line changed; ~2 new documentation files; 1 new SVG asset; 2 spec artifact edits

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-design check

| Principle | Status | Notes |
|---|---|---|
| I. Configuration-First | ⚠️ VIOLATION (being fixed) | `docs/config-format.md` absent from repo root — users cannot author config-first without this file. **This spec fixes the violation.** |
| II. Bootstrap-Ready | ✅ pass | No change to bootstrap path |
| III. Context-Aware Environments | ✅ pass | No change to context switching |
| IV. Interactive & Ink-First UX | ⚠️ VIOLATION (being fixed) | Splash displays `v0.1.0` (hardcoded) instead of dynamic runtime version. **This spec fixes the violation.** |
| V. Idempotent Operations | ✅ pass | No new mutations introduced |
| VI. Secrets-Free Repository | ✅ pass | No secrets; SVG and Markdown contain no credentials |
| VII. macOS First | ✅ pass | All changes target macOS or are platform-agnostic docs |
| VIII. Extensibility & Plugin Architecture | ✅ pass | No plugin changes |

**Constitution requirement: `docs/config-format.md` must exist** (`Technology Constraints → Entry Modes` section):
> "The config file format MUST be documented in `docs/config-format.md` within the repo"

→ This spec creates the file. ✅

**Constitution requirement: FR-009 (all markdown docs in `docs/`):**
→ Root audit (RES-005) confirms root is already compliant. ✅

### Post-design re-check

All Phase 1 design decisions are consistent with constitution requirements:
- Version reading via `readFileSync + JSON.parse` satisfies Principle IV dynamic display requirement
- `docs/config-format.md` satisfies Principle I + Entry Modes mandate
- SVG and README changes are purely additive; no existing behaviour altered
- Spec 005 editorial corrections are narrowing-only; no new constitution conflicts introduced

**GATE PASSED** — no unjustified violations. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/006-docs-polish-spec-hygiene/
├── plan.md              # This file
├── research.md          # Phase 0 output — all NEEDS CLARIFICATION resolved
├── data-model.md        # Phase 1 output — entities and data flows
├── quickstart.md        # Phase 1 output — step-by-step implementer guide
├── contracts/
│   ├── version-reading.md    # readPackageVersion() function contract
│   ├── config-format-doc.md  # docs/config-format.md completeness contract
│   └── logo-variation.md     # SVG asset and README integration contract
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
└── index.tsx            # Line 15: const VERSION = readPackageVersion() [1 line change]

docs/
├── config-format.md     # NEW: standalone schema reference (FR-001–FR-005)
└── design/
    ├── design-tokens.md          # unchanged (authoritative source)
    ├── thingstead-logo.svg       # unchanged
    └── tilde-logo-variation.svg  # NEW: product logomark (FR-009)

README.md                # Updated: logo <img> added to <div align="center"> header (FR-010)

specs/005-ui-branding-consolidation/
├── spec.md              # FR-006 narrowed: remove README surface (FR-012)
└── tasks.md             # T0021 + T0025 declare T0011 dependency (FR-013)

tests/unit/
└── (new test for readPackageVersion() fallback — optional, recommended)
```

**Structure Decision**: Single-project layout. All changes are in `src/`, `docs/`, `README.md`, and spec artifacts. No new directories except the already-existing `docs/design/` target.

## Complexity Tracking

> No constitution violations to justify — this spec resolves existing violations, it does not introduce them.
