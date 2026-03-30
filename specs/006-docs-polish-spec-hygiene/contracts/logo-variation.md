# Contract: Tilde Logo Variation SVG

**Spec**: 006-docs-polish-spec-hygiene  
**FR**: FR-009, FR-010  
**Type**: Design asset contract

---

## Contract

`docs/design/tilde-logo-variation.svg` is the tilde product logomark. It MUST be created as a brand-consistent SVG that is visually distinct from `docs/design/thingstead-logo.svg` through incorporation of the `~` tilde character.

---

## Asset specification

| Property | Value | Source |
|---|---|---|
| Output path | `docs/design/tilde-logo-variation.svg` | FR-009 |
| `viewBox` | `0 0 120 60` | Aspect ratio for 2:1 horizontal logomark |
| Background | `#030712` filled `<rect>` with `rx="8"` | design-tokens.md `--color-bg` |
| Primary colour | `#4ade80` | design-tokens.md `--color-brand` |
| Wave bezier path | `M4 22 C8 10, 14 10, 16 22 C18 34, 24 34, 28 22` (scaled) | design-tokens.md Wave mark |
| Wave stroke | `stroke="#4ade80" stroke-width="4" stroke-linecap="round" fill="none"` | design-tokens.md |
| Tilde character | `~` rendered as SVG `<text>` in brand green | FR-009 distinguishing element |
| Typeface (text) | `ui-monospace, 'Cascadia Code', 'Fira Code', monospace` | design-tokens.md Typeface Stack |
| No fixed width/height | Scales to container via `viewBox` only | GitHub README responsive |

---

## Rendering requirements

| Requirement | Verification |
|---|---|
| Renders without errors as a standalone SVG | Open in browser directly |
| Legible at `width="160"` (README context) | View at 160px width |
| Dark background visible against GitHub light theme | Screenshot on GitHub.com |
| No external dependencies (fonts, URLs, images) | Inspect SVG source |
| `<title>` element for accessibility | `<title>tilde</title>` present |
| Passes SVG well-formedness | No unclosed tags, valid namespace |

---

## README integration contract (FR-010)

The README.md `<div align="center">` block MUST be updated to include the logo `<img>`:

```html
<div align="center">
  <img src="docs/design/tilde-logo-variation.svg" alt="tilde" width="160"/>
  <br/><br/>
  <img src="docs/banner.svg" alt="tilde — developer environment bootstrap" width="560"/>
  ...badges...
</div>
```

### Constraints
- `src` path: relative path from repo root (`docs/design/tilde-logo-variation.svg`) — works on GitHub.com
- `alt` text: `"tilde"` (product name only, concise)
- `width`: `"160"` — appropriate for a product logomark in a README header
- `banner.svg` MUST NOT be replaced or removed
- The logo `<img>` MUST appear above the banner `<img>`
- Both `<img>` elements remain inside the same `<div align="center">` wrapper

---

## Visual consistency requirements

| Check | Requirement |
|---|---|
| Colour palette | Only `#4ade80`, `#030712`, and optionally muted `#9ca3af` — no other colours |
| No serif/proportional fonts | Monospace typeface stack only |
| Brand accent colour `#4ade80` passes WCAG AA | Against `#030712` background — contrast ratio ~8:1 ✓ |
| Wave path unchanged | Uses exact bezier from design-tokens.md Wave mark section |
| Distinguishing element present | `~` tilde character visually present in the mark |

---

## Non-goals

- This asset does NOT replace `docs/design/thingstead-logo.svg`
- This asset does NOT replace `docs/banner.svg`
- This asset is NOT used as a favicon (existing favicons remain in `site/*/public/`)
- No animation required (static SVG only)
