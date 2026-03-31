# Research: CLI Fix, Brand Consolidation & Docs Reorganization

**Branch**: `007-cli-fix-brand-docs`  
**Phase**: 0 — Research  
**Date**: 2025-07-17

---

## RES-001: CLI Silent-Exit Root Cause

**Decision**: The regression is caused by the `isMain` guard in `src/index.tsx` failing when the CLI is invoked via the npm bin symlink.

**Rationale**:

The guard logic at the bottom of `src/index.tsx` is:

```typescript
const isMain = process.argv[1] != null && fileURLToPath(import.meta.url).endsWith(process.argv[1].replace(/\\/g, '/'))
  || process.argv[1] === fileURLToPath(import.meta.url);
```

When `tilde` is invoked as a global CLI command, `process.argv[1]` resolves to the npm bin symlink path (e.g., `/usr/local/bin/tilde` or an `npx`-managed path in a cache directory). `fileURLToPath(import.meta.url)` resolves to the real file path of the compiled module (e.g., `/path/to/project/dist/index.js`). Neither the `.endsWith()` check nor the strict `===` comparison matches a symlink path against the resolved module path, so `isMain` evaluates to `false` and `main()` is never called.

**Fix**: Create `bin/tilde.ts` as a thin wrapper that unconditionally calls `main()` exported from `src/index.tsx`. Remove the `isMain` guard from `src/index.tsx` entirely (it becomes a pure library module).

**Alternatives considered**:
- Resolving symlinks via `fs.realpathSync(process.argv[1])` before comparing — fragile, platform-dependent, unnecessary complexity.
- Using `import.meta.main` (Bun-only, not available in Node.js ESM).
- Setting `TILDE_FORCE_RUN=1` env var in the bin — works but requires env var gymnastics and is not idiomatic.

---

## RES-002: TypeScript Compilation for `bin/tilde.ts`

**Decision**: Add a `tsconfig.bin.json` that compiles `bin/` independently to `dist/bin/`, keeping the existing `tsconfig.json` (and its `rootDir: "src"`) unchanged.

**Rationale**:

The existing `tsconfig.json` has `"rootDir": "src"` which maps `src/foo.ts` → `dist/foo.js`. Changing `rootDir` to `.` would shift all output paths to `dist/src/foo.js`, breaking all existing import paths. Instead, a separate `tsconfig.bin.json` with `rootDir: "bin"` and `outDir: "dist/bin"` compiles `bin/tilde.ts` → `dist/bin/tilde.js` without touching the src output layout.

`bin/tilde.ts` imports from `src/index.tsx` using the compiled-output path:
```typescript
import { main } from '../index.js'; // resolves to dist/index.js at runtime
```

The `build` script in `package.json` must be updated:
```json
"build": "tsc && tsc -p tsconfig.bin.json"
```

**`tsconfig.bin.json`**:
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
- `"bin": { "tilde": "dist/bin/tilde.js" }` (was `dist/index.js`)
- `"main": "./dist/index.js"` — unchanged (library entry stays)
- `"files": ["dist", "bootstrap.sh"]` — unchanged (dist/ still covers dist/bin/)

**Alternatives considered**:
- Single tsconfig with `rootDir: "."` — breaks all dist/ import paths across src/
- Project references (`tsc --build`) — unnecessary complexity for a single additional file
- Ship `bin/tilde.ts` uncompiled and rely on `tsx` at runtime — not suitable for a published npm package

---

## RES-003: Integration Test Strategy for CLI Regression

**Decision**: Integration test spawns `dist/bin/tilde.js` via Node.js `child_process` (requires a prior build). For CI it uses the built artifact. For local development, the test can also be run via `tsx bin/tilde.ts` using `execa` (already a project dependency).

**Rationale**:

The spec states the test spawns `bin/tilde.ts` via `child_process`. In practice, test files that run TypeScript source directly need a loader; running via `tsx` (already in devDependencies) is the correct local approach. CI always runs after `npm run build`, so spawning `node dist/bin/tilde.js` is reliable in the pipeline.

The integration test pattern:

```typescript
// tests/integration/cli-regression.test.ts
import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const BIN = resolve(ROOT, 'dist/bin/tilde.js');

describe('CLI regression — #45', () => {
  it('produces visible output when invoked interactively (TTY simulated)', async () => {
    const result = await execa('node', [BIN], {
      env: { ...process.env, TERM: 'xterm', TILDE_CI: '1', TILDE_FORCE_RUN: '1' },
      reject: false,
      timeout: 10_000,
    });
    expect(result.stdout.length + result.stderr.length).toBeGreaterThan(0);
    expect(result.exitCode).toBe(0);
  });
});
```

**Note on TTY**: Spawning via `child_process`/`execa` creates a non-TTY child process. To assert output without triggering the `isTTY` guard that exits with a short message, the test uses `TILDE_CI=1` (non-interactive mode, which skips the Ink render path) or `TILDE_FORCE_RUN=1`. The critical assertion is that `stdout` is non-empty and the process does not silently exit with zero output.

**Alternatives considered**:
- `ink-testing-library` — unit test only; does not test the CLI entry invocation path
- Mocking `process.argv[1]` — tests the library not the binary boundary
- PTY emulation (`node-pty`) — heavy dependency, overkill for this regression test

---

## RES-004: `src/index.tsx` Library Module Changes

**Decision**: Remove the `isMain` guard block entirely from `src/index.tsx`. Export `main` as a named export. Keep all other exports (`readPackageVersion`, `parseCliArgs`, types) stable.

**Rationale**:

With `bin/tilde.ts` handling the CLI entry, `src/index.tsx` becomes a pure module. Any code after the `main()` definition that performs side effects (`isMain` guard, `main().catch(...)` invocation) must be removed. The `main` function must be exported:

```typescript
// src/index.tsx — library module, no top-level side effects
export async function main(): Promise<void> { ... }
export function readPackageVersion(): string { ... }
```

**Alternatives considered**: None — this is the canonical solution specified in the spec (FR-001a).

---

## RES-005: Logo and SVG Correction Strategy

**Decision**: Fix `docs/design/tilde-logo-variation.svg` by removing the second tilde `<text>` character element; retain the bezier wave mark and the single wordmark label as the variation.

**Rationale**:

Examining `tilde-logo-variation.svg`: the current file shows both a bezier wave mark AND a `<text>` element with the `~` glyph character. The "variation" the spec intends is a version of the logo that shows either:
- The wave mark only (without a text `~` character), OR
- The text `~` character only (without the bezier wave)

The wave mark bezier (`M4 22 C8 10, 14 10, 16 22...`) is the canonical brand mark per `design-tokens.md`. The "variation" should be the mark-only form (no character glyph), which is a legitimate logo variation. The current file has both, making it read as a double-tilde.

**Fix**: Remove the `<text>` element containing the `~` glyph character. Keep the bezier path as the sole graphical element. This produces a mark-only variation.

**For `docs/banner.svg`**: Uses `Courier New` font and animated `~` characters in cyan (`#22d3ee`). The design tokens spec the static brand color as green (`#4ade80`). The banner intentionally uses animated cyan for the splash animation effect (documented in `design-tokens.md`: "The animated wave in `src/ui/splash.tsx` uses `color="cyan"`"). No color change is needed; the animation cyan is a documented intentional choice. However, the font should be updated to match the design token font stack (`ui-monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace`).

**Alternatives considered**:
- Replacing the `~` glyph text with `tilde` wordmark text — changes the variation semantics
- Keeping both elements but fixing proportions — doesn't resolve the two-tilde visual problem

---

## RES-006: Thingstead Logo Design Constraints

**Decision**: The new Thingstead logo mark must use a non-tilde geometric symbol. The current `thingstead-logo.svg` contains a tilde wave bezier mark, which violates FR-010. The replacement mark uses a stylized "T" or interlocking rings glyph — independently designed, no wave curves.

**Rationale**:

The current `thingstead-logo.svg` opens with:
```svg
<path d="M8 32 C13 18, 21 18, 26 32 C31 46, 39 46, 44 32" stroke="#4ade80".../>
```
This is exactly the tilde wave bezier — explicitly prohibited by FR-010 ("The symbol/mark MUST be independently designed with no tilde wave or tilde character").

**Proposed mark**: A stylized square bracket or angular-T mark rendered as clean geometric paths — distinct from the organic curve of the tilde wave. The mark uses `#4ade80` (brand green) and `#f9fafb` (text white) from the shared design token palette. Typeface remains the monospace stack.

**What may be shared with Tilde**:
- Color palette: all tokens from `docs/design/design-tokens.md` (confirmed by spec)
- Typeface: `ui-monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace`

**What must differ**:
- The mark/symbol (no tilde wave, no `~` character glyph)
- The wordmark text ("thingstead" vs "tilde")

**Alternatives considered**:
- Purely typographic wordmark (no symbol) — valid per spec; mark-only constraint is about distinctness not symbol presence
- Abstract geometric shapes — all acceptable as long as no wave/tilde element is present

---

## RES-007: Docs Reorganization — Tooling Impact Audit

**Decision**: Before moving `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md` to `docs/`, audit and update all references in: `package.json`, CI workflow files (`.github/`), `eslint.config.js`, and `scripts/`.

**Rationale**:

The spec requires that any tooling referencing root-level markdown paths be updated (FR-015). Known reference points to check:

| File | Reference Type | Action |
|------|---------------|--------|
| `.github/workflows/*.yml` | `CHANGELOG.md` in release workflow | Update path to `docs/CHANGELOG.md` |
| `package.json` | `"homepage"`, any markdown scripts | Verify no direct references |
| `src/**` | Internal links in docs | Update to `docs/`-relative paths |
| Cross-links in README/CHANGELOG/CONTRIBUTING | Relative markdown links | Update from `./CONTRIBUTING.md` to `./CONTRIBUTING.md` or `../docs/CONTRIBUTING.md` |

GitHub renders `docs/README.md` automatically when no root `README.md` exists — confirmed by GitHub documentation (no stub needed per FR-014).

**Alternatives considered**: None — moving the files is the only approach.

---

## RES-008: Site Documentation Color Token Alignment

**Decision (site/tilde/index.html)**: Replace off-palette Tailwind classes with their exact design-token equivalents.

**Tailwind color audit — mismatches**:

| Current class | Current hex | Required token | Token hex | Correct class |
|---------------|-------------|----------------|-----------|---------------|
| `text-gray-100` (body text) | `#f3f4f6` | `--color-text` | `#f9fafb` | `text-gray-50` |
| `text-gray-300` (description paragraph) | `#d1d5db` | `--color-text-muted` | `#9ca3af` | `text-gray-400` |
| `text-gray-200` (method labels) | `#e5e7eb` | `--color-text` | `#f9fafb` | `text-gray-50` |
| `text-gray-500` (section heading caps) | `#6b7280` | `--color-text-muted` | `#9ca3af` | `text-gray-400` |
| `border-gray-800` (footer divider) | `#1f2937` | `--color-border` | `#374151` | `border-gray-700` |

**Classes that already match design tokens** (no change needed):

| Class | Hex | Token |
|-------|-----|-------|
| `bg-gray-950` | `#030712` | `--color-bg` ✅ |
| `bg-gray-900` | `#111827` | `--color-surface` ✅ |
| `text-green-400` | `#4ade80` | `--color-brand` ✅ |
| `border-gray-700` | `#374151` | `--color-border` ✅ |
| `text-gray-400` | `#9ca3af` | `--color-text-muted` ✅ |

**Note on `bg-green-900` / `text-green-300`** (recommended badge): `bg-green-900` (`#14532d`) and `text-green-300` (`#86efac`) are semantic badge colors — not primary UI elements. These are UI component colors, not backgrounds/text/links/headings/borders as defined in FR-016. They are acceptable as design decisions outside the token palette restriction for primary UI elements.

**Decision (site/docs — Starlight)**: Add a custom CSS file that overrides Starlight's built-in CSS variables to match the design token palette. Starlight supports `customCss` in `astro.config.mjs`.

**Starlight CSS variable mapping**:

```css
/* site/docs/src/styles/tilde-theme.css */
:root {
  --sl-font: ui-monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
}

:root[data-theme='dark'] {
  --sl-color-accent-low:  #14532d;   /* dark accent surface */
  --sl-color-accent:      #4ade80;   /* --color-brand */
  --sl-color-accent-high: #86efac;   /* lighter brand on dark */
  --sl-color-white:       #f9fafb;   /* --color-text */
  --sl-color-gray-1:      #f9fafb;   /* primary text */
  --sl-color-gray-2:      #9ca3af;   /* --color-text-muted */
  --sl-color-gray-3:      #6b7280;   /* mid gray */
  --sl-color-gray-4:      #374151;   /* --color-border */
  --sl-color-gray-5:      #1f2937;   /* --color-surface-raised */
  --sl-color-gray-6:      #111827;   /* --color-surface */
  --sl-color-black:       #030712;   /* --color-bg */
}
```

No custom CSS currently exists in the Starlight site (`site/docs/src/` has no `.css` files).

**`astro.config.mjs` change** — add inside `starlight({...})`:
```js
customCss: ['./src/styles/tilde-theme.css'],
```

**Alternatives considered**:
- Overriding via Starlight `theme` option — Starlight 0.x does not support a `theme` config key; `customCss` is the correct mechanism
- Tailwind CSS integration in Starlight — not currently configured; `customCss` is simpler and sufficient

---

## RES-009: `docs/banner.svg` Consolidation

**Decision**: Update `docs/banner.svg` font reference from `'Courier New',Courier,monospace` to `ui-monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace` to align with the design token font stack. Colors (cyan animation, green accents) remain unchanged — they are documented intentional choices in `design-tokens.md`.

**Rationale**: The only concrete misalignment between banner and design tokens is the font family. The animated cyan wave is an explicitly documented brand choice for the animated banner context. The static text elements in the banner use the `tilde` wordmark in green (`#4ade80`) which matches `--color-brand`.

---

## Summary: All NEEDS CLARIFICATION Resolved

| Item | Resolution |
|------|-----------|
| CLI entry mechanism | `bin/tilde.ts` unconditional `main()` call; `src/index.tsx` library-only |
| TypeScript compilation for bin/ | Separate `tsconfig.bin.json`; build script updated |
| Integration test spawn mechanism | `execa` / `node dist/bin/tilde.js` in `tests/integration/cli-regression.test.ts` |
| Logo variation fix | Remove `<text>~</text>` glyph from SVG; retain bezier mark only |
| Thingstead mark design | New non-wave geometric mark; shared palette and typeface |
| Banner consolidation | Font family update only; animated colors are intentional |
| Docs relocation tooling impact | Audit `.github/`, `package.json`, `scripts/`, and cross-links |
| site/tilde color alignment | 5 Tailwind class replacements per audit table |
| site/docs Starlight theming | New `tilde-theme.css` + `customCss` in astro.config.mjs |
| No root README stub | Confirmed — GitHub renders `docs/README.md` automatically |
