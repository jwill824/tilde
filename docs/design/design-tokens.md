# Design Tokens: Thingstead / tilde

Canonical reference for all brand colours, typography, and CLI colour equivalents.  
All product surfaces — install page, docs site, CLI splash screen — MUST use these values.

---

## Colours

### Primary Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-brand` | `#4ade80` | Primary accent — CTAs, wave marks, highlighted text |
| `--color-bg` | `#030712` | Page and terminal background |
| `--color-surface` | `#111827` | Cards, code blocks, elevated surfaces |
| `--color-surface-raised` | `#1f2937` | Hover states, active nav items |
| `--color-text` | `#f9fafb` | Primary body text |
| `--color-text-muted` | `#9ca3af` | Captions, secondary labels, dimmed text |
| `--color-border` | `#374151` | Dividers, card borders |

### Semantic Mapping

| Role | Token | Hex |
|------|-------|-----|
| Success / brand | `--color-brand` | `#4ade80` |
| Background | `--color-bg` | `#030712` |
| Surface | `--color-surface` | `#111827` |
| Text | `--color-text` | `#f9fafb` |
| Muted text | `--color-text-muted` | `#9ca3af` |

---

## Typography

### Typeface Stack

All product surfaces use a monospace typeface exclusively. This is a deliberate brand
choice — tilde is a developer tool and the visual identity reflects that.

```
ui-monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace
```

### CSS Custom Property

```css
--font-mono: ui-monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
```

### Tailwind CSS

The install page uses Tailwind CSS via CDN. Apply the monospace stack with:

```html
<div class="font-mono">...</div>
```

Or via the custom class defined in `site/tilde/index.html`:

```html
<style>
  .font-mono-stack {
    font-family: ui-monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
  }
</style>
```

---

## CLI ANSI Equivalents

The tilde CLI (built with [Ink](https://github.com/vadimdemedes/ink)) uses these ANSI
colour mappings to mirror the brand palette in terminal output.

| Role | Ink colour prop | Closest hex |
|------|----------------|-------------|
| Brand / accent | `color="green"` / `color="#4ade80"` | `#4ade80` |
| Primary text | (default) | `#f9fafb` |
| Muted / secondary | `dimColor` | `#9ca3af` |
| Bold headings | `bold` | — |
| Warning | `color="yellow"` | `#fbbf24` |
| Error | `color="red"` | `#f87171` |

### Splash screen

The animated wave in `src/ui/splash.tsx` uses `color="cyan"` which maps to the terminal
cyan (approximately `#22d3ee`). This is intentional — the splash animates in cyan, then
the static header locks to green (`#4ade80`) for the wizard steps.

---

## Logo & Mark

| Asset | Location | Usage |
|-------|----------|-------|
| Thingstead wordmark SVG | `docs/design/thingstead-logo.svg` | Parent brand attribution in footers, about pages |
| tilde wave favicon | `site/docs/public/favicon.svg` | Browser tab icon for docs site |
| tilde wave favicon | `site/tilde/favicon.svg` | Browser tab icon for install page |
| tilde site logo | `site/docs/src/assets/tilde-logo.svg` | Starlight sidebar logo |

### Wave mark

The tilde wave (`~`) is the primary visual mark. Rendered as an SVG cubic bezier:

```svg
<path d="M4 22 C8 10, 14 10, 16 22 C18 34, 24 34, 28 22"
      stroke="#4ade80" stroke-width="4" stroke-linecap="round" fill="none"/>
```

This produces a single S-curve wave that reads as `~` at all sizes.

---

## Usage Rules

1. **Never use the brand green on a light background** — it's optimised for dark surfaces.
2. **All text must pass WCAG AA** contrast against `--color-bg` (`#030712`).
3. **No serif or proportional fonts** — monospace only, everywhere.
4. **Colours are specified in hex** — do not use colour names (e.g. `green`) in CSS or SVG outside of Ink ANSI output.
