# Research: UI/UX and Branding Consolidation

**Branch**: `005-ui-branding-consolidation` | **Date**: 2026-03-30

---

## Finding 1: Non-Interactive Install Fix

**Decision**: Fix in two places — `install.sh` (primary) and `src/index.tsx` (safety guard).

**Root Cause**: `install.sh` ends with `exec tilde "$@"`, which launches the Ink CLI. When invoked via `curl | bash`, the parent shell's stdin is a pipe, not a TTY. Ink requires raw mode (`process.stdin.setRawMode`), which only works on TTY streams. This throws "Raw mode is not supported on the current process.stdin."

**Fix in `install.sh`**:
```bash
# Replace the final `exec tilde "$@"` with a TTY check:
if [ -t 0 ] && [ -t 1 ]; then
  exec tilde "$@"
else
  success "Run 'tilde' in a new interactive terminal to complete setup."
fi
```
`-t 0` tests stdin is a TTY; `-t 1` tests stdout is a TTY. Both must be true for Ink to work.

**Fix in `src/index.tsx`** (safety guard — prevents crash if launched non-interactively by other means):
Before calling `render()`, add a stdin TTY check. If `process.stdin.isTTY` is falsy and mode is not `non-interactive`/`ci`, print a message and exit cleanly rather than crashing.

**Duplicate React Keys**: The error mentions a key value that looks like a stack trace — this is because the key value is a deeply nested object being stringified. This is likely in the `Static` component in `app.tsx` or in the wizard step list. Need to audit all `.map()` calls that lack a stable unique `key` prop, particularly in `src/ui/splash.tsx` (uses index `i` as key — fragile) and anywhere steps are rendered dynamically.

**Alternatives Considered**: Wrapping `render()` in a try/catch — rejected, because it doesn't prevent the crash, only hides it.

---

## Finding 2: Astro Docs Routing Fix

**Decision**: Change `base` in `astro.config.mjs` from `/tilde/docs` to `/tilde/docs/` (add trailing slash) and verify Starlight sidebar slug format.

**Root Cause**: Astro v4+ expects `base` to end without a trailing slash for path resolution, but Starlight's internal link generation for sidebar items can behave inconsistently depending on version when the base path has sub-segments (`/tilde/docs` vs `/tilde`). The symptom — links dropping the full base to just `/installation/` — is a known Starlight issue when the `base` contains multiple path segments without a trailing slash.

**Investigation needed at implementation time**: Check `@astrojs/starlight` version in `site/docs/package.json` and cross-reference with Starlight changelog for base-path routing fixes. May require a version bump.

**Alternatives Considered**:
- Hardcoding full URLs in sidebar — rejected, fragile and unmaintainable.
- Moving docs to `thingstead.io/docs` (no sub-path) — rejected, out of scope for this iteration.

---

## Finding 3: tilde.sh Domain References

**Decision**: Replace `https://tilde.sh/config-schema/v1.json` with `https://thingstead.io/tilde/config-schema/v1.json` across all active source files.

**Affected files** (confirmed via grep):
| File | Type | Action |
|------|------|--------|
| `src/config/schema.ts` | Source | Replace schema URL |
| `docs/config-format.md` | Docs | Replace schema URL |
| `site/docs/src/content/docs/config-reference.md` | Docs | Replace schema URL |
| `README.md` | Docs | Replace schema URL |
| `tests/fixtures/tilde.config.json` | Fixture | Replace schema URL |
| `tests/unit/*.test.ts` (multiple) | Tests | Replace schema URL in test fixtures |
| `tests/integration/*.test.ts` | Tests | Replace schema URL in test fixtures |
| `tests/contract/*.test.ts` | Tests | Replace schema URL |

**Do NOT change**: `specs/001-*/` and `specs/002-*/` — historical spec artifacts. `site/docs/dist/` — built output, regenerates from source.

**Note**: The schema URL is embedded in `TildeConfig.$schema` default in `schema.ts`. Changing it may cause schema validation failures for existing config files that have the old URL. The schema validator should accept both old and new URLs during a transition window, or ignore the `$schema` field during validation (it's typically informational only).

**Alternatives Considered**: Keeping tilde.sh as a redirect domain — deferred decision outside this feature's scope; replace references regardless.

---

## Finding 4: Brand Assets & Design Tokens

**Decision**: Create `docs/design/` directory containing `thingstead-logo.svg`, `thingstead-logo.png`, `tilde-logo-variation.svg`, and `design-tokens.md`.

**Existing assets**:
- `site/docs/src/assets/tilde-logo.svg` — tilde product logo (already in use by Starlight)
- `site/tilde/index.html` — inline SVG tilde wordmark (green wave + text)

**New Thingstead logo**: Should be distinct from the tilde product logo. The tilde logo uses a green wave + "tilde" wordmark. The Thingstead parent brand logo should follow the same visual language (green color `#4ade80`, monospace typeface) but represent the company, not the product.

**`design-tokens.md` contents**:
- Primary color: `#4ade80` (green-400 in Tailwind)
- Background dark: `#030712` (gray-950)
- Background medium: `#111827` (gray-900)
- Text primary: `#f9fafb` (gray-50)
- Text muted: `#9ca3af` (gray-400)
- Typeface: `ui-monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace`
- These are already in use in `site/tilde/index.html` — formalizing them as canonical tokens.

**Storybook upgrade path**: Design tokens defined as documented values in `design-tokens.md` can be converted to Style Dictionary token JSON (`.json` or `.yaml`) in a future iteration, which Storybook consumes natively. No rework required.

---

## Finding 5: docs/ vs site/docs/ Architecture

**Decision**: Keep content in `site/docs/src/content/docs/` (Starlight's content directory). Use root `docs/` for contributor reference material and brand assets only. Do NOT reconfigure Astro to read from root `docs/` — it would require restructuring Starlight's content collection setup and is higher risk than benefit.

**Migration (issue #23)**: Move `docs/config-format.md` into `site/docs/src/content/docs/config-format.md` as the canonical user-facing config reference. The root `docs/` retains only `design/` (brand assets) and any contributor-only reference material that should not be on the public docs site.

**Alternatives Considered**:
- Symlink `docs/` into `site/docs/src/content/docs/` — rejected, adds complexity without benefit.
- Configure Astro `srcDir` to root — rejected, Starlight expects its own `src/content/` structure.

---

## Finding 6: README Consolidation

**Current state**: README.md is 200+ lines with installation, config examples, full usage docs.  
**Target**: Tagline + install command + short feature highlights + one link to full docs.  
**Content to migrate**: Any content not already in `site/docs/src/content/docs/` should be added to the relevant docs page before trimming from README.
