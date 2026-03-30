# Contract: Brand Identity

**Branch**: `005-ui-branding-consolidation` | **Date**: 2026-03-30

---

## Overview

This contract defines the required brand assets and their placement across all UI surfaces. It is the acceptance reference for the branding work in this feature.

---

## Asset Requirements

| Asset | Required On | Format | Location |
|-------|-------------|--------|----------|
| Thingstead logo (SVG) | GitHub README, `docs/design/` reference | SVG | `docs/design/thingstead-logo.svg` |
| Thingstead logo (PNG) | Favicon generation, OG image | PNG 512×512 | `docs/design/thingstead-logo.png` |
| Favicon | Docs site browser tab, install page browser tab | SVG or ICO | `site/docs/public/favicon.svg`, `site/tilde/favicon.svg` |
| Design tokens doc | Contributor reference | Markdown | `docs/design/design-tokens.md` |

---

## Per-Surface Compliance

### GitHub README
- MUST display Thingstead logo (SVG) as a centered header image
- MUST use monospace typeface styling in any code blocks
- Color rendering deferred to GitHub's markdown renderer

### Docs Site (`site/docs/`)
- MUST display Thingstead favicon in browser tab
- Existing tilde product logo (`site/docs/src/assets/tilde-logo.svg`) is retained for the Starlight header
- MUST use green-400 (`#4ade80`) as primary accent (already applied via Starlight theme)

### Install Page (`site/tilde/index.html`)
- MUST display Thingstead favicon in browser tab
- Existing inline tilde wordmark SVG is retained; Thingstead logo added to page footer or header as parent brand attribution

### CLI Splash Screen
- MUST use green (`#4ade80` / Ink `color="green"`) as primary text color
- MUST use `dimColor` for secondary/muted text
- Typeface is the terminal's monospace font — no explicit font setting possible in CLI

---

## Design Token Canonical Reference

All surfaces MUST reference values from `docs/design/design-tokens.md` as the source of truth. Any deviation from the canonical tokens constitutes a branding inconsistency.

See `data-model.md` for the full token schema.
