# Implementation Plan: CLI Fix, Brand Consolidation & Docs Reorganization

**Branch**: `007-cli-fix-brand-docs` | **Date**: 2025-07-17 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/007-cli-fix-brand-docs/spec.md`  
**Issues**: #41 (P5), #42 (P2), #43 (P4), #44 (P3), #45 (P1), #46 (P6)

## Summary

Six coordinated fixes across the CLI, brand assets, and documentation. The critical item (P1) restores tilde's silent-exit regression by extracting the CLI entry point to a new `bin/tilde.ts` wrapper that unconditionally calls `main()`, removing the broken `isMain` symlink-detection guard from `src/index.tsx`. Supporting work: correct a double-tilde logo variation (P2), consolidate banner/logo to design tokens (P3), create an independently-designed Thingstead logo (P4), move root markdown files into `docs/` (P5), and align site documentation colors to the canonical design token palette (P6).

## Technical Context

**Language/Version**: TypeScript 5.4, Node.js ≥ 20  
**Primary Dependencies**: Ink 6 (terminal UI), React 19, Vitest 4, tsx 4, execa 9, Zod 4; Astro/Starlight (docs site)  
**Storage**: N/A — file-based configs (`tilde.config.json`); SVG/PNG assets  
**Testing**: Vitest (unit `vitest.config.ts`, integration `vitest.integration.config.ts`, contract `vitest.contract.config.ts`)  
**Target Platform**: macOS (CLI); static site hosting (site/tilde, site/docs)  
**Project Type**: CLI tool (primary) + static documentation site  
**Performance Goals**: N/A for this feature  
**Constraints**: ESM-only (`"type": "module"`), NodeNext module resolution; no root README stub (GitHub renders `docs/README.md` automatically)  
**Scale/Scope**: Single-repo; ~6 source files changed; 4 SVG assets; 3 markdown files relocated; 2 site files patched

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Configuration-First** | ✅ PASS | CLI fix does not change the wizard or config file format; `main()` still routes to the same config-first/wizard/non-interactive modes |
| **II. Bootstrap-Ready** | ✅ PASS | `bin/tilde.ts` is the npm bin entry; `bootstrap.sh` unchanged; install path unchanged |
| **III. Context-Aware Environments** | ✅ PASS | No changes to context resolution logic |
| **IV. Interactive & Ink-First UX** | ✅ PASS | Splash screen, wizard, and Ink render path all preserved in `main()`; `bin/tilde.ts` is a pure delegation wrapper |
| **V. Idempotent Operations** | ✅ PASS | No operation logic changed |
| **VI. Secrets-Free Repository** | ✅ PASS | No credential handling changed |
| **VII. macOS First** | ✅ PASS | `assertMacOS()` check preserved in `main()` |
| **VIII. Extensibility & Plugin Architecture** | ✅ PASS | Plugin subsystem unchanged |

**Gate result**: PASS — no violations. Proceed to Phase 1.

**Post-Phase-1 re-check**: No design decisions introduce new violations. The `bin/tilde.ts` module boundary is narrower than the previous `isMain` guard approach, strictly improving separation of concerns.

## Project Structure

### Documentation (this feature)

```text
specs/007-cli-fix-brand-docs/
├── plan.md              ← this file
├── research.md          ← Phase 0 complete
├── data-model.md        ← Phase 1 complete
├── quickstart.md        ← Phase 1 complete
├── contracts/
│   └── cli-schema.md    ← Phase 1 complete
└── tasks.md             ← Phase 2 (via /speckit.tasks — not yet created)
```

### Source Code (repository root)

```text
bin/                          ← NEW directory
└── tilde.ts                  ← NEW — CLI entry wrapper (unconditional main())

src/
├── index.tsx                 ← CHANGED — remove isMain guard; export main
├── app.tsx                   ← unchanged
├── ui/
│   └── splash.tsx            ← unchanged
└── ...                       ← all other src files unchanged

tests/
├── integration/
│   ├── cli-regression.test.ts  ← NEW — regression test for #45
│   ├── config-first.test.ts
│   └── ...                   ← existing tests unchanged
├── contract/
└── unit/

docs/
├── README.md                 ← MOVED from root (was root/README.md)
├── CHANGELOG.md              ← MOVED from root (was root/CHANGELOG.md)
├── CONTRIBUTING.md           ← MOVED from root (was root/CONTRIBUTING.md)
├── banner.svg                ← CHANGED — font family updated
├── config-format.md
└── design/
    ├── design-tokens.md
    ├── tilde-logo-variation.svg  ← CHANGED — glyph text element removed
    ├── thingstead-logo.svg       ← CHANGED — new non-wave mark
    └── thingstead-logo.png       ← CHANGED — re-exported from new SVG

site/
├── tilde/
│   └── index.html            ← CHANGED — 5 Tailwind color class replacements
└── docs/
    ├── astro.config.mjs      ← CHANGED — add customCss reference
    └── src/
        └── styles/
            └── tilde-theme.css   ← NEW — Starlight CSS variable overrides

tsconfig.json                 ← unchanged
tsconfig.bin.json             ← NEW — compiles bin/ → dist/bin/
package.json                  ← CHANGED — build script + bin path
```

**Structure Decision**: Single-project layout (Option 1). No new layers or projects added. All changes are additive (new files) or targeted edits to existing files. The `bin/` directory is a standard npm convention for CLI entry points and requires no architectural justification.

## Complexity Tracking

> No constitution violations — this section is not required.
