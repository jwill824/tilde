# Quickstart: CLI Fix, Brand Consolidation & Docs Reorganization

**Branch**: `007-cli-fix-brand-docs`  
**Date**: 2025-07-17

This is a multi-issue feature. Implement in priority order: P1 first (CLI regression), then brand/docs work (P2–P6) can proceed largely in parallel.

---

## P1 — Fix CLI Silent-Exit Regression (Issue #45)

### 1. Create `bin/tilde.ts`

```typescript
#!/usr/bin/env node
import { main } from '../src/index.js';

main().catch((err: Error) => {
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
```

### 2. Update `src/index.tsx`

Remove the `isMain` guard at the bottom of the file:

```diff
- // Guard: only execute the CLI when this file is run directly
- const isMain = process.argv[1] != null && fileURLToPath(import.meta.url).endsWith(...)
-   || process.argv[1] === fileURLToPath(import.meta.url);
- 
- if (isMain || process.env.TILDE_FORCE_RUN === '1') {
-   main().catch((err: Error) => { ... });
- }
```

Ensure `main` is exported:
```typescript
export async function main(): Promise<void> { ... }
```

### 3. Add `tsconfig.bin.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist/bin",
    "rootDir": "bin",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["bin/**/*"]
}
```

### 4. Update `package.json`

```diff
  "scripts": {
-   "build": "tsc",
+   "build": "tsc && tsc -p tsconfig.bin.json",
  },
  "bin": {
-   "tilde": "dist/index.js"
+   "tilde": "dist/bin/tilde.js"
  },
```

### 5. Build and verify

```bash
npm run build
node dist/bin/tilde.js --version    # should print version
node dist/bin/tilde.js --help       # should print usage
```

### 6. Write integration test

Create `tests/integration/cli-regression.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const BIN = resolve(ROOT, 'dist/bin/tilde.js');

describe('CLI regression — #45', () => {
  it('produces visible output when invoked with --version', async () => {
    const result = await execa('node', [BIN, '--version'], {
      reject: false,
      timeout: 10_000,
    });
    expect(result.stdout.length + result.stderr.length).toBeGreaterThan(0);
    expect(result.exitCode).toBe(0);
  });

  it('does not silently exit with no output on --help', async () => {
    const result = await execa('node', [BIN, '--help'], {
      reject: false,
      timeout: 10_000,
    });
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.exitCode).toBe(0);
  });
});
```

Run: `npm run build && npm run test:integration`

---

## P2 — Fix Tilde Logo Variation (Issue #42)

Edit `docs/design/tilde-logo-variation.svg`:

- **Remove** the `<text>` element containing the `~` glyph character
- **Keep** the bezier wave path as the sole visual element
- Update `viewBox` if needed to center the wave mark

**Verify**: Open in browser — single wave mark, no character glyph visible.

---

## P3 — Consolidate Banner and Logo (Issue #44)

Edit `docs/banner.svg`:

- Update font family from `'Courier New',Courier,monospace` to `ui-monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace`
- Colors (animated cyan `#22d3ee`, accent green `#4ade80`) are intentional per design tokens — no change

Check `site/docs/src/assets/tilde-logo.svg` already uses design token colors — verify and update if needed.

---

## P4 — Create Thingstead Logo (Issue #43)

Replace `docs/design/thingstead-logo.svg` with a new logo using a non-wave, non-tilde mark:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 48" fill="none" role="img"
     aria-label="Thingstead">
  <title>Thingstead</title>
  <!-- Angular bracket mark — NOT a tilde wave -->
  <path d="M8 8 L8 40 L16 40" stroke="#4ade80" stroke-width="3.5"
        stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M36 8 L36 40 L28 40" stroke="#4ade80" stroke-width="3.5"
        stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <!-- Wordmark -->
  <text x="52" y="34"
        font-family="ui-monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace"
        font-size="22" font-weight="600" fill="#f9fafb" letter-spacing="-0.5">Thingstead</text>
</svg>
```

Export PNG from SVG (using browser screenshot, Inkscape, or `sharp`/`svgexport` CLI).

---

## P5 — Move Root Markdown Files to docs/ (Issue #41)

```bash
git mv README.md docs/README.md
git mv CHANGELOG.md docs/CHANGELOG.md
git mv CONTRIBUTING.md docs/CONTRIBUTING.md
```

Then:
1. Update any relative links inside `docs/README.md` referencing `./CONTRIBUTING.md` or `./CHANGELOG.md` — these remain valid (same directory)
2. Audit `.github/workflows/` for `CHANGELOG.md` references — update to `docs/CHANGELOG.md`
3. Search entire repo for references to root `README.md`: `grep -r "README.md" --include="*.yml" --include="*.json" --include="*.sh" .`
4. Verify `docs/README.md` is rendered on GitHub repository homepage

---

## P6 — Align Site Docs to Design Token Palette (Issue #46)

### `site/tilde/index.html`

Apply Tailwind class replacements:

| Find | Replace |
|------|---------|
| `text-gray-100` | `text-gray-50` |
| `text-gray-300` | `text-gray-400` |
| `text-gray-200` | `text-gray-50` |
| `text-gray-500` | `text-gray-400` |
| `border-gray-800` | `border-gray-700` |

### `site/docs` — Starlight theme

1. Create `site/docs/src/styles/tilde-theme.css`:

```css
:root {
  --sl-font: ui-monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
}

:root[data-theme='dark'] {
  --sl-color-accent-low:  #14532d;
  --sl-color-accent:      #4ade80;
  --sl-color-accent-high: #86efac;
  --sl-color-white:       #f9fafb;
  --sl-color-gray-1:      #f9fafb;
  --sl-color-gray-2:      #9ca3af;
  --sl-color-gray-3:      #6b7280;
  --sl-color-gray-4:      #374151;
  --sl-color-gray-5:      #1f2937;
  --sl-color-gray-6:      #111827;
  --sl-color-black:       #030712;
}
```

2. Update `site/docs/astro.config.mjs`:

```diff
  starlight({
    title: 'tilde',
+   customCss: ['./src/styles/tilde-theme.css'],
    ...
  })
```

---

## Verification Checklist

- [ ] `npm run build` succeeds (both tsconfig passes)
- [ ] `node dist/bin/tilde.js --version` prints version
- [ ] `npm run test:integration` passes (includes cli-regression.test.ts)
- [ ] `npm run test` (unit) passes — no regressions from src/index.tsx changes
- [ ] `docs/design/tilde-logo-variation.svg` shows single wave mark in browser
- [ ] `docs/design/thingstead-logo.svg` shows bracket mark + "Thingstead", no wave
- [ ] `docs/design/thingstead-logo.png` exported
- [ ] `docs/banner.svg` font updated
- [ ] `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md` absent from repo root
- [ ] `docs/README.md` exists and renders on GitHub
- [ ] All internal doc cross-links resolve
- [ ] No `CHANGELOG.md` root references in `.github/workflows/`
- [ ] `site/tilde/index.html` — 5 Tailwind replacements applied
- [ ] `site/docs/src/styles/tilde-theme.css` created
- [ ] `site/docs/astro.config.mjs` references `tilde-theme.css`
