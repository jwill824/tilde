# Research: Documentation Polish and Spec Hygiene

**Branch**: `006-docs-polish-spec-hygiene`  
**Phase**: 0 — Pre-design research  
**Date**: 2026-03-31

---

## RES-001: ESM-Safe Runtime Version Reading (FR-006, FR-007, FR-008)

**Question**: What is the correct way to read `package.json` at runtime given `"type": "module"` in package.json and Node ≥ 20, without import assertions or `createRequire`?

**Decision**: Use `readFileSync` + `JSON.parse` resolved via `import.meta.url`

**Implementation pattern**:

```typescript
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

function readPackageVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const pkgPath = resolve(__dirname, '../package.json');
    const raw = readFileSync(pkgPath, 'utf8');
    return (JSON.parse(raw) as { version?: string }).version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}
```

**Path resolution**: `dist/index.js` → `../package.json` (one level up from `dist/`). The `tsconfig.json` emits to `outDir: "dist"`, so source files at `src/*.ts` become `dist/*.js`, and `package.json` at repo root is one `..` from `dist/`.

**Rationale**:
- `readFileSync` + `JSON.parse` is standard, dependency-free, Node ≥ 12 compatible
- `import.meta.url` is the correct ESM anchor (not `__dirname`, not `process.cwd()`)
- Works identically whether invoked as `npx`, `npm install -g`, or direct `node dist/index.js`
- `createRequire` is an unnecessary complexity when `readFileSync` suffices
- Import assertions (`import pkg from './package.json' assert { type: 'json' }`) are still non-stable in Node 20 and explicitly excluded by the spec
- `process.env.npm_package_version` is not set when tilde is invoked via `npx` in some environments — explicitly excluded by the spec

**Fallback**: Wrap in try/catch; return `'unknown'` on any error (file not found, JSON parse failure, unexpected install layout).

**Integration point**: `src/index.tsx` line 15 (`const VERSION = '0.1.0'`) → replace with `readPackageVersion()` call. `version: VERSION` on line 287 feeds `App` props → `captureEnvironment(version)` (app.tsx line 76) → `EnvironmentSnapshot.tildeVersion` → `Splash` component. The entire chain is already correct; only the source value is wrong.

**Alternatives considered**:
- `createRequire(import.meta.url)('./package.json').version` — works but adds cognitive overhead and an unnecessary `module` module import
- Baking version at build time via `esbuild` define / `tsc` const — would break the "update without source changes" scenario in SC-002
- `process.env.npm_package_version` — unreliable outside npm script context

---

## RES-002: `docs/config-format.md` — Scope and Authoritative Source (FR-001–FR-005)

**Question**: Is there existing content that can serve as a base, and what fields are missing?

**Decision**: The file at `site/docs/src/content/docs/config-format.md` is a near-complete but Starlight-scoped draft. It must be adapted into a standalone `docs/config-format.md` at the repo root `docs/` folder (removing Astro frontmatter, adding missing wizard-phrasing, completing schema versioning section per FR-004).

**Gap analysis against `src/config/schema.ts`**:

| Schema field / sub-schema | In Starlight draft? | Gap |
|---|---|---|
| `$schema` | ✅ yes | — |
| `version` (literal `"1"`) | ✅ yes | — |
| `schemaVersion` | ✅ yes | FR-004 migration section needs inaugural v1 callout + template skeleton |
| `os` | ✅ yes | — |
| `shell` | ✅ yes | — |
| `packageManager` | ✅ yes | — |
| `versionManagers` | ✅ yes | — |
| `languages` | ✅ yes | — |
| `workspaceRoot` | ✅ yes | — |
| `dotfilesRepo` | ✅ yes | — |
| `contexts` | ✅ yes | — |
| `contexts[].authMethod` | ✅ yes | FR-005: description must use wizard-equivalent phrasing ("How will you authenticate to GitHub for this context?") not raw enum label |
| `contexts[].envVars` | ✅ yes | FR-005: describe as "Environment variables for this context (use secrets backend references, not raw values)" |
| `contexts[].vscodeProfile` | ✅ yes | — |
| `contexts[].isDefault` | ✅ yes | — |
| `tools` | ✅ yes | — |
| `configurations` | ✅ yes | — |
| `accounts` | ✅ yes | — |
| `secretsBackend` | ✅ yes | FR-005: describe as "Where should tilde store and retrieve your secrets?" not internal enum |
| `schemaVersion` migration section | ⚠️ partial | Missing: inaugural v1 statement, migration runner behaviour details, future migration template skeleton |
| `EnvVarReference` security validation | ✅ yes (note about blocked patterns) | — |
| Annotated example covering all required fields | ⚠️ partial | "Minimal Example" is present but needs `schemaVersion`, `accounts`, and annotations per FR-003 |

**Decision**: Base `docs/config-format.md` on the Starlight draft content, strip Astro frontmatter, expand schema versioning section per FR-004, add wizard-equivalent phrasing for `authMethod`/`envVars`/`secretsBackend`, add annotated full example.

**Rationale**: The Starlight draft is accurate and battle-tested against the Zod schema. Reusing it avoids divergence. The two files serve different audiences (docs site vs GitHub raw) but share the same schema truth.

---

## RES-003: Tilde Logo Variation SVG (FR-009)

**Question**: What visual constraints apply to `tilde-logo-variation.svg`, and what SVG structure should be used?

**Decision**: The SVG is a self-contained file using the brand wave path from `docs/design/design-tokens.md` plus the literal `~` character. It is optimised for GitHub README rendering (works on both light and dark themes, dark background with brand green).

**Constraints from `docs/design/design-tokens.md`**:
- Primary accent colour: `#4ade80` (brand green)
- Background: `#030712` (dark)
- Stroke only, no fill — consistent with the existing wave mark SVG path documented in design-tokens.md
- Wave path: `M4 22 C8 10, 14 10, 16 22 C18 34, 24 34, 28 22` (exact path from design tokens)
- Monospace typeface stack for any text elements

**Tilde-specific distinguishing element**: The `~` character incorporated into the logomark. This can be achieved via:
1. SVG `<text>` element with the `~` glyph in a monospace font — simple and semantically clear
2. A second bezier path forming a `~` — more precise but requires custom path data

**Decision**: Approach 1 (SVG `<text>`) for the variation logo. The `~` character is the primary brand mark of this product (product is literally named "tilde"); rendering it as a text glyph is semantically unambiguous and readable at all sizes. The wave bezier path (from design tokens) is retained as the secondary graphical element.

**SVG dimensions**: `viewBox="0 0 120 60"`, no fixed `width`/`height` (scales to container). README `<img>` will specify `width="160"`.

**Light/dark compatibility**: SVG uses a `<rect>` background in `#030712` so the logo has its own dark background regardless of GitHub theme. This is the same pattern used by `docs/banner.svg`.

**Alternatives considered**:
- CSS-based dark/dark theme switching via `prefers-color-scheme` in SVG — overly complex for a simple logomark; the existing banner.svg uses a fixed dark background
- Using the existing tilde wave favicon (`site/docs/public/favicon.svg`) as the base — favicon is 32×32 and optimised for small sizes; the variation logo needs to be legible at README width (~160px)

---

## RES-004: README Logo Placement (FR-010)

**Question**: How should the tilde logo variation be added to README.md without breaking existing rendering?

**Decision**: Insert an `<img>` tag for `docs/design/tilde-logo-variation.svg` inside the existing `<div align="center">` block, above the current `banner.svg` `<img>`. Use a relative path (not raw GitHub URL) so it works in both GitHub and local preview.

**Current README header**:
```html
<div align="center">
  <img src="docs/banner.svg" alt="tilde — developer environment bootstrap" width="560"/>
  [badges]
</div>
```

**Updated pattern**:
```html
<div align="center">
  <img src="docs/design/tilde-logo-variation.svg" alt="tilde" width="160"/>
  <br/><br/>
  <img src="docs/banner.svg" alt="tilde — developer environment bootstrap" width="560"/>
  [badges]
</div>
```

**Rationale**: Relative paths work on GitHub.com for files in the same repo (GitHub resolves them from repo root when rendering README.md). The `<br/>` spacing ensures the logo and banner don't crowd each other. Width 160px is appropriate for a product logomark in a README header.

---

## RES-005: Root-Level Markdown Audit (FR-011)

**Question**: Are there any non-exception `.md` files at the repo root?

**Findings**: Repository root currently contains:
- `README.md` — permitted exception
- `CHANGELOG.md` — permitted exception  
- `CONTRIBUTING.md` — permitted exception
- `LICENSE` — not markdown (no `.md` extension)

**No action required for FR-011 migration**: The repo root is already compliant with the four-exception rule. SC-003 will pass immediately. The `docs/` folder also contains no misplaced files. FR-011 is satisfied by confirming compliance; no migration work is needed.

**Note**: The spec states "Any markdown files found at the repository root that are not among the four permitted exceptions are either stale or have been superseded." No such files were found.

---

## RES-006: Spec 005 Editorial Changes (FR-012, FR-013)

**Question**: What exactly needs to change in `specs/005-ui-branding-consolidation/spec.md` (FR-006) and `tasks.md` (T0021/T0025)?

**Spec 005 spec.md FR-006 (current)**:
```
- **FR-006**: Brand colors and typeface MUST be defined and applied consistently across: README, install page, docs site, and CLI splash screen.
```

**Problem**: "README" cannot receive custom CSS/colours via GitHub Markdown; the requirement is unenforceable for that surface. The clause must be narrowed to exclude GitHub Markdown surfaces.

**Revised FR-006**: Remove "README" from the surface list; restrict to enforceable surfaces only (install page, docs site, CLI splash screen).

**Spec 005 tasks.md (current T0021 and T0025)**: No dependency on T0011 declared. Both tasks modify `site/docs/astro.config.mjs` — the same file that T0011 modifies — creating sequential dependency.

**Required additions**:
- T0021: Add "Depends on: T0011 (both modify `site/docs/astro.config.mjs`; run sequentially)"
- T0025: Add "Depends on: T0011 (both modify `site/docs/astro.config.mjs`; run sequentially)"

---

## Summary of Technical Decisions

| # | Decision | Rationale |
|---|---|---|
| RES-001 | `readFileSync + JSON.parse` via `import.meta.url` for runtime version reading | ESM-safe, dependency-free, Node 20+ standard |
| RES-002 | Base `docs/config-format.md` on Starlight draft; remove frontmatter; expand versioning section | Avoids drift; draft is schema-accurate |
| RES-003 | SVG `<text>` tilde character on dark background with brand green wave path | Semantically clear; consistent with design tokens |
| RES-004 | Logo `<img>` above banner `<img>` inside existing `<div align="center">` | Non-destructive; uses relative path |
| RES-005 | No root markdown migration needed — root is already compliant | Audit confirmed; FR-011 is a verification task |
| RES-006 | Narrow spec 005 FR-006 to remove README; add T0011 deps to T0021+T0025 | Editorial fix only; no scope change to spec 005 |

All NEEDS CLARIFICATION items resolved. No blockers for Phase 1.
