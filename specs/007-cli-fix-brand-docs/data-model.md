# Data Model: CLI Fix, Brand Consolidation & Docs Reorganization

**Branch**: `007-cli-fix-brand-docs`  
**Phase**: 1 — Design  
**Date**: 2025-07-17

This feature involves no database or persistent state model changes. The "data model" here captures the structural changes to source files, configuration entities, and design assets that define the implementation surface.

---

## 1. CLI Entry Architecture

### Module Boundary

| Module | Role | Side Effects | Exported Symbols |
|--------|------|-------------|-----------------|
| `bin/tilde.ts` | CLI entry point — compiled to `dist/bin/tilde.js` | **Yes** — unconditionally calls `main()` on import | None (entry-only) |
| `src/index.tsx` | Library module | **None** — no top-level execution | `main`, `readPackageVersion`, `parseCliArgs`, all types |

### `bin/tilde.ts` Structure

```typescript
#!/usr/bin/env node
import { main } from '../src/index.js';  // resolves to dist/index.js at runtime

main().catch((err: Error) => {
  // Re-uses the same error-dispatch logic currently in src/index.tsx isMain block
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
```

**Key constraint**: The shebang line (`#!/usr/bin/env node`) and the unconditional `main()` call — no `isMain` guard, no env var checks, no conditional invocation.

### `src/index.tsx` Changes

```diff
- // Guard: only execute the CLI when this file is run directly (not imported as a module in tests)
- const isMain = process.argv[1] != null && fileURLToPath(import.meta.url).endsWith(...)
-   || process.argv[1] === fileURLToPath(import.meta.url);
- 
- if (isMain || process.env.TILDE_FORCE_RUN === '1') {
-   main().catch((err: Error) => { ... });
- }
+ // No top-level execution — import this module; use bin/tilde.ts to run the CLI
+ export { main };  // ensure main is a named export
```

### TypeScript Build Configuration

**New file: `tsconfig.bin.json`**

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

**`package.json` changes**:

```diff
  "scripts": {
-   "build": "tsc",
+   "build": "tsc && tsc -p tsconfig.bin.json",
    "dev": "tsx src/index.tsx",
  },
  "bin": {
-   "tilde": "dist/index.js"
+   "tilde": "dist/bin/tilde.js"
  },
  "main": "./dist/index.js",
```

### File Layout (post-change)

```text
bin/
└── tilde.ts              # NEW — CLI entry wrapper

src/
├── index.tsx             # CHANGED — library module only, no isMain guard
├── app.tsx               # unchanged
└── ...

dist/                     # compiled output
├── index.js              # library module (unchanged path)
├── index.d.ts            # type declarations (unchanged)
├── bin/
│   └── tilde.js          # NEW — compiled CLI entry
└── ...

tsconfig.json             # unchanged (rootDir: src)
tsconfig.bin.json         # NEW — compiles bin/ → dist/bin/
```

---

## 2. Integration Test Entity

### `tests/integration/cli-regression.test.ts`

| Property | Value |
|----------|-------|
| Test suite | `CLI regression — #45` |
| Test runner | Vitest (via `vitest.integration.config.ts`) |
| Spawn target | `dist/bin/tilde.js` (compiled output) |
| Spawn mechanism | `execa` (already in production dependencies) |
| Assertions | `stdout.length > 0` (non-empty output); `exitCode === 0` |
| Timeout | 10 000 ms (matches integration test config `testTimeout: 60000`) |
| Invocation | `--version` and `--help` flags (non-interactive, no TTY required) |
| CI requirement | Must pass on every CI run (SC-001) |

### `vitest.integration.config.ts` (current — no changes needed)

```typescript
// Already covers: tests/integration/**/*.test.ts
// testTimeout: 60000 — sufficient
// environment: 'node' — correct for child_process spawning
```

---

## 3. Brand Asset Inventory

### Current State vs Required State

| File | Current State | Required State | Issue |
|------|--------------|----------------|-------|
| `docs/design/tilde-logo-variation.svg` | Wave bezier mark + `~` glyph text | **Deleted** — removed from repository during implementation | #42 |
| `docs/banner.svg` | Animated `~` chars, cyan `#22d3ee` color | Updated — all 16 `#22d3ee` instances replaced with `#4ade80` (brand green) | #44 |
| `docs/design/thingstead-logo.svg` | Tilde wave bezier + "thingstead" wordmark | `[ Thingstead ]` framed wordmark — rectilinear bracket paths, no bezier curves | #43 |
| `docs/design/thingstead-logo.png` | Placeholder / copy of tilde logo | **Deleted** — PNG export was generated then removed; SVG is the authoritative asset | #43 |
| `site/docs/src/assets/tilde-logo.svg` | Existing (not described as broken) | Verified aligned with design tokens; no changes needed | #44 |

### SVG Element Inventory

#### `docs/design/tilde-logo-variation.svg` — **Deleted**

This file was removed from the repository during implementation. The duplicate-glyph issue was resolved by deletion rather than correction. No SVG spec is required.

#### `docs/design/thingstead-logo.svg` — Actual Implementation

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 154 48" fill="none" role="img"
     aria-label="Thingstead">
  <title>Thingstead</title>
  <!-- Left bracket: single continuous path for clean miter corners -->
  <path d="M12 8 L4 8 L4 40 L12 40"
        stroke="#4ade80" stroke-width="2.5"
        stroke-linecap="butt" stroke-linejoin="miter" fill="none"/>
  <!-- Right bracket: single continuous path for clean miter corners -->
  <path d="M142 8 L150 8 L150 40 L142 40"
        stroke="#4ade80" stroke-width="2.5"
        stroke-linecap="butt" stroke-linejoin="miter" fill="none"/>
  <!-- Wordmark centered between bracket inner arms (x=12 to x=142, center=77) -->
  <text x="77" y="33" text-anchor="middle"
        font-family="ui-monospace,'Cascadia Code','Fira Code','JetBrains Mono',monospace"
        font-size="20" font-weight="600" fill="#f9fafb" letter-spacing="-0.5">Thingstead</text>
</svg>
```

**Design decisions**:
- `viewBox="0 0 154 48"` — tight viewBox with minimal padding around brackets
- Brackets drawn as **single continuous paths** (`M … L … L … L`) with `stroke-linecap="butt"` and `stroke-linejoin="miter"` — eliminates corner pixel artifacts that occur with two-subpath approaches
- `stroke-width="2.5"` — thinner than the original data-model spec (`3.5`) for cleaner rendering at small sizes
- Text centered at `x="77"` (midpoint of viewBox) with `text-anchor="middle"` — ensures visual centering between bracket arms regardless of system font metrics
- No background `<rect>` — transparent background for flexible use on dark/light surfaces

---

## 4. Documentation File Relocation Map

### Files Being Moved

| Source Path | Destination Path | Status |
|-------------|-----------------|--------|
| `README.md` | `docs/README.md` | Move |
| `CHANGELOG.md` | `docs/CHANGELOG.md` | Move |
| `CONTRIBUTING.md` | `docs/CONTRIBUTING.md` | Move |

**No stub created at root** — GitHub renders `docs/README.md` automatically when no `README.md` exists at root.

### Internal Cross-Link Updates

| In File | Link Text | Current Target | Updated Target |
|---------|-----------|---------------|----------------|
| `docs/README.md` | Contributing | `./CONTRIBUTING.md` | `./CONTRIBUTING.md` (same dir — no change after move) |
| `docs/README.md` | Changelog | `./CHANGELOG.md` | `./CHANGELOG.md` (same dir — no change after move) |
| `docs/CONTRIBUTING.md` | Back to README | `./README.md` or `../README.md` | `./README.md` (same dir) |

**Note**: After moving all three files into `docs/`, relative links between them remain identical (they are all in the same directory). Only links from other files (e.g., `package.json#homepage`) referencing root-level markdown need updating.

### Tooling Reference Audit

| File | Reference | Action |
|------|-----------|--------|
| `.github/workflows/release.yml` (if exists) | `CHANGELOG.md` path | Update to `docs/CHANGELOG.md` |
| `package.json` | No direct markdown path refs | Verify |
| `eslint.config.js` | No markdown refs | Verify |
| `scripts/` | Any shell scripts referencing README/CHANGELOG | Audit and update |
| CI badge URLs in README | Relative links | No change needed (absolute GitHub URLs) |

---

## 5. Site Color Token Mapping

### `site/tilde/index.html` — Tailwind Class Changes

| Role | Current Class | Current Hex | Token | Token Hex | Replacement Class |
|------|--------------|-------------|-------|-----------|-------------------|
| Body text | `text-gray-100` | `#f3f4f6` | `--color-text` | `#f9fafb` | `text-gray-50` |
| Description paragraph | `text-gray-300` | `#d1d5db` | `--color-text-muted` | `#9ca3af` | `text-gray-400` |
| Method label text | `text-gray-200` | `#e5e7eb` | `--color-text` | `#f9fafb` | `text-gray-50` |
| Section heading caps | `text-gray-500` | `#6b7280` | `--color-text-muted` | `#9ca3af` | `text-gray-400` |
| Footer divider border | `border-gray-800` | `#1f2937` | `--color-border` | `#374151` | `border-gray-700` |

**Classes that already match** (no change): `bg-gray-950`, `bg-gray-900`, `text-green-400`, `border-gray-700`, `text-gray-400`, `bg-gray-800`, `text-green-300`.

### `site/docs` — New Starlight Theme File

**New file: `site/docs/src/styles/tilde-theme.css`**

```css
/* Tilde design token overrides for Starlight docs theme */

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

**`site/docs/astro.config.mjs` change** — add inside `starlight({...})`:
```js
customCss: ['./src/styles/tilde-theme.css'],
```

---

## 6. Validation Rules

### CLI Module Boundary
- `bin/tilde.ts` MUST NOT import from or re-export anything except calling `main()`
- `src/index.tsx` MUST export `main` as a named export
- `src/index.tsx` MUST NOT contain any top-level `if` block that calls `main()` or guards execution

### Design Assets
- Every SVG in `docs/design/` MUST use `#030712` background (or transparent), `#4ade80` mark color, and the monospace font stack
- `thingstead-logo.svg` MUST NOT contain any bezier path producing a wave curve
- `tilde-logo-variation.svg` MUST NOT contain more than one visual tilde element

### Site Colors
- Every primary color value in `site/tilde/index.html` MUST resolve to a value present in `docs/design/design-tokens.md`
- `site/docs` Starlight theme MUST apply CSS overrides via `tilde-theme.css`

### Documentation Links
- No broken relative links after markdown files are moved to `docs/`
- `docs/README.md` MUST exist (not be deleted)
- No `README.md` at repository root after the move
