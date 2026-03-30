# Implementation Plan: UI/UX and Branding Consolidation

**Branch**: `005-ui-branding-consolidation` | **Date**: 2026-03-30 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/005-ui-branding-consolidation/spec.md`

## Summary

Fix two P1 bugs (non-interactive install crash, docs routing), then deliver P2 branding and docs consolidation. The install fix requires a TTY guard in `install.sh` and a safety guard in `src/index.tsx`. The routing fix requires an `astro.config.mjs` base-path correction. Branding work introduces a `docs/design/` directory with brand assets and design tokens. Docs work consolidates README, migrates `docs/config-format.md` to the Starlight content tree, and replaces all `tilde.sh` domain references.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22.x (CLI); Astro 5.x + Starlight (docs site); Bash (install script); HTML + Tailwind CDN (install page)  
**Primary Dependencies**: Ink (React terminal UI), Astro, @astrojs/starlight, Vitest  
**Storage**: N/A — no database; config is JSON files on disk  
**Testing**: Vitest (unit, integration, contract) via `npm test` / `npx vitest run --config vitest.integration.config.ts`  
**Target Platform**: macOS (CLI); web (docs site + install page at thingstead.io)  
**Project Type**: CLI tool + static site (multi-surface single repository)  
**Performance Goals**: Install script completes in <60s; docs site page load <2s  
**Constraints**: TTY fix must not affect existing interactive sessions; Astro routing fix must not break built output; schema URL migration must not break existing user config files  
**Scale/Scope**: Personal OSS project; small contributor team; ~5 affected surfaces

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post-design — all clear.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Configuration-First | ✅ Pass | No changes to config flow or wizard |
| II. Bootstrap-Ready | ✅ Pass (AFFECTS) | Install one-liner fix directly fulfills this principle — `curl \| bash` must work |
| III. Context-Aware Environments | ✅ Pass | Not affected |
| IV. Interactive & Ink-First UX | ✅ Pass (AFFECTS) | TTY fix preserves full interactive mode; non-interactive path prints message and exits; `--ci`/`--yes` behavior unchanged. Splash screen already skips in CI per constitution. |
| V. Idempotent Operations | ✅ Pass | No changes to install/config operations |
| VI. Secrets-Free Repository | ✅ Pass | No secrets introduced |
| VII. N/A | — | — |
| VIII. Extensibility & Plugin Architecture | ✅ Pass | Not affected |

**No violations. No Complexity Tracking entries required.**

## Project Structure

### Documentation (this feature)

```text
specs/005-ui-branding-consolidation/
├── plan.md              # This file
├── research.md          # Phase 0 — technical findings
├── data-model.md        # Phase 1 — brand asset inventory + schema
├── quickstart.md        # Phase 1 — local dev/test guide
├── contracts/
│   ├── cli-non-interactive.md   # CLI TTY behavior contract
│   ├── docs-routing.md          # Astro routing URL contract
│   └── brand-identity.md        # Brand asset compliance contract
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── index.tsx            # FIX: add stdin TTY guard before render()
└── ui/
    └── splash.tsx       # FIX: audit duplicate React key (index-as-key)

site/
├── docs/
│   ├── astro.config.mjs # FIX: base path routing
│   └── src/
│       ├── assets/
│       │   └── tilde-logo.svg      # (existing — retain)
│       └── content/docs/
│           ├── config-format.md    # NEW — migrated from docs/config-format.md
│           ├── config-reference.md # UPDATE — replace tilde.sh schema URL
│           ├── installation.md     # VERIFY — routing fix validation
│           ├── getting-started.md  # VERIFY
│           └── index.mdx           # VERIFY
└── tilde/
    ├── index.html        # UPDATE — add favicon link + Thingstead brand attribution
    ├── favicon.svg       # NEW — derived from Thingstead logo
    └── install.sh        # FIX — TTY guard before exec tilde

docs/
├── design/               # NEW
│   ├── thingstead-logo.svg    # NEW — Thingstead parent brand logo
│   ├── thingstead-logo.png    # NEW — PNG export (512×512)
│   └── design-tokens.md       # NEW — canonical color + typeface reference
└── config-format.md      # REMOVE after migration to site/docs/src/content/docs/

tests/
├── fixtures/
│   └── tilde.config.json # UPDATE — replace tilde.sh schema URL
├── unit/
│   ├── config-schema.test.ts     # UPDATE — schema URL in fixtures
│   ├── config-first.test.ts      # UPDATE — schema URL in fixtures
│   ├── config-validation.test.ts # UPDATE — schema URL in fixtures
│   └── security-audit.test.ts    # UPDATE — schema URL in fixtures
├── integration/
│   └── reconfigure.test.ts  # UPDATE — schema URL
│   └── context-switch.test.ts # UPDATE — schema URL
└── contract/
    └── config-schema.test.ts # UPDATE — schema URL

README.md                 # CONSOLIDATE — trim to tagline + install + highlights + docs link
CONTRIBUTING.md           # UPDATE — project/file structure section

src/config/schema.ts      # UPDATE — $schema default URL; accept both old + new during transition
```

**Structure Decision**: Single-project CLI with co-located static site. No new projects added.
