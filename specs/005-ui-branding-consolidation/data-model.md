# Data Model: UI/UX and Branding Consolidation

**Branch**: `005-ui-branding-consolidation` | **Date**: 2026-03-30

This feature introduces no new runtime data models. It operates on static assets, configuration files, and documentation. The entities below represent the brand/design system artifacts introduced by this feature.

---

## Brand Asset Inventory

| Asset | Path | Format | Description |
|-------|------|--------|-------------|
| Thingstead logo (primary) | `docs/design/thingstead-logo.svg` | SVG | Parent brand logo, scalable vector |
| Thingstead logo (PNG) | `docs/design/thingstead-logo.png` | PNG 512×512 | Rasterized for favicon/OG use |
| Tilde logo variation | `docs/design/tilde-logo-variation.svg` | SVG | Product variant of Thingstead logo |
| Design tokens | `docs/design/design-tokens.md` | Markdown | Canonical color + typeface reference |
| Favicon (docs site) | `site/docs/public/favicon.svg` | SVG | Derived from Thingstead logo |
| Favicon (install page) | `site/tilde/favicon.svg` | SVG | Same favicon asset |

---

## Design Token Schema

The `design-tokens.md` file documents the following canonical values. These are informational — not a compiled token system (deferred to future Storybook migration).

```
Colors:
  primary-green:    #4ade80   (Tailwind green-400)
  bg-dark:          #030712   (Tailwind gray-950)
  bg-medium:        #111827   (Tailwind gray-900)
  text-primary:     #f9fafb   (Tailwind gray-50)
  text-muted:       #9ca3af   (Tailwind gray-400)
  border:           #1f2937   (Tailwind gray-800)

Typography:
  font-family: ui-monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace
  scale: 
    xs:  0.75rem
    sm:  0.875rem
    base: 1rem
    lg:  1.125rem
    xl:  1.25rem
    2xl: 1.5rem
    4xl: 2.25rem
    5xl: 3rem

CLI (ANSI approximations):
  primary-green → chalk.hex('#4ade80') or Ink color="green"
  text-muted    → Ink dimColor
  text-primary  → default terminal color
```

---

## Config Schema URL Migration

The `$schema` field in `TildeConfig` (and all test fixtures) transitions from:

```
OLD: https://tilde.sh/config-schema/v1.json
NEW: https://thingstead.io/tilde/config-schema/v1.json
```

**Validation rule**: The schema validator in `src/config/schema.ts` MUST accept both the old and new URL values during the transition window to avoid breaking existing user configs. A `z.enum([old, new]).or(z.string())` or `.default(new)` approach avoids regression.

**Affected files**: See `research.md` Finding 3 for the complete file list.

---

## Docs Content Inventory

| Document | Current Path | Target Path | Action |
|----------|-------------|-------------|--------|
| Installation guide | `site/docs/src/content/docs/installation.md` | (no change) | Verify routing fix |
| Getting Started | `site/docs/src/content/docs/getting-started.md` | (no change) | Verify |
| Config Reference | `site/docs/src/content/docs/config-reference.md` | (no change) | Update schema URL |
| Config Format (dev ref) | `docs/config-format.md` | `site/docs/src/content/docs/config-format.md` | Migrate + update schema URL |
| Docs index | `site/docs/src/content/docs/index.mdx` | (no change) | Verify |
| README | `README.md` | (no change, trim content) | Consolidate |
| CONTRIBUTING | `CONTRIBUTING.md` | (no change) | Update project structure section |
