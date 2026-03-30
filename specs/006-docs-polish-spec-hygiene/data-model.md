# Data Model: Documentation Polish and Spec Hygiene

**Branch**: `006-docs-polish-spec-hygiene`  
**Phase**: 1 — Design  
**Derived from**: `spec.md` + `research.md`

---

## Overview

This spec is a documentation and hygiene feature. There are no new runtime data structures. The "entities" are:

1. **Config Format Document** — the `docs/config-format.md` file and its structural schema
2. **tilde.config.json schema** — existing Zod-defined schema (reference only; no changes)
3. **Tilde Logo Variation** — the `docs/design/tilde-logo-variation.svg` asset
4. **Runtime Version Value** — the string read from `package.json` at startup
5. **Spec 005 Corrections** — editorial changes to spec artifacts (no runtime entities)

---

## Entity 1: Config Format Document (`docs/config-format.md`)

### Purpose
Standalone Markdown reference at the mandated repo path `docs/config-format.md`. Audience: non-technical users authoring `tilde.config.json` without the wizard.

### Document Structure

```
docs/config-format.md
├── Header / intro (1 paragraph)
├── Quick-start annotated example (complete JSON with inline comments)
├── Top-level fields table
├── Sub-schemas (one section per object type)
│   ├── VersionManager
│   ├── Language
│   ├── DeveloperContext
│   │   └── EnvVarReference (nested)
│   ├── ConfigurationDomains
│   └── Account
├── Secrets backends (reference table)
├── File locations (where tilde writes dotfiles)
├── Environment variables (CLI env var reference)
└── Schema versioning and migration
    ├── What schemaVersion means
    ├── v1: Inaugural schema (no migration required)
    ├── How the migration runner works
    └── Future migration template skeleton
```

### Wizard-Equivalent Phrasing Map (FR-005)

| Field (technical name) | Wizard question / purpose-driven description |
|---|---|
| `authMethod` | "How will you authenticate to GitHub in this context?" — `gh-cli`: use the GitHub CLI; `https`: HTTPS with a credential helper; `ssh`: SSH key pair |
| `envVars` | "Environment variables to load when you're working in this context (use your secrets backend references — not raw tokens)" |
| `secretsBackend` | "Where should tilde store and retrieve your secrets?" — `1password`: 1Password CLI (`op://` references); `keychain`: macOS Keychain; `env-only`: a local non-tracked file |
| `vscodeProfile` | "Which VS Code profile should be active in this context?" |
| `isDefault` | "Is this the context tilde should use when you're not inside any named workspace path?" |
| `configurations.direnv` | "Should tilde manage `.envrc` files for automatic context switching?" |
| `configurations.osDefaults` | "Should tilde apply macOS system preferences defined in your dotfiles?" |

### Validation Rules (from Zod schema — document in plain English)

| Rule | Plain-English description |
|---|---|
| `contexts` array minimum length: 1 | At least one developer context is required |
| `contexts[].label` uniqueness | Each context must have a different name |
| `languages[].manager` reference | Every language manager must match one of the listed version managers |
| `envVars[].value` pattern block | Values starting with `ghp_`, `sk-`, `AKIA`, or `xox[bp]-` are rejected — use a secrets backend reference |
| `dotfilesRepo` path format | Must be an absolute path or start with `~/` |
| `git.email` format | Must be a valid email address |

---

## Entity 2: tilde.config.json Schema (Reference — No Changes)

The canonical schema is defined in `src/config/schema.ts`. This spec does not modify the schema. The schema is documented in `docs/config-format.md` (Entity 1).

**Schema version**: `1` (inaugural — no prior versions exist)  
**Zod type export**: `TildeConfig` (used by `loadConfig()` in `src/config/reader.ts`)

### Schema Version Lifecycle

```
schemaVersion = 1 (inaugural)
  │
  │  On load: tilde compares file schemaVersion to current supported version
  │  If same version → validate directly
  │  If older version → run migration steps additively → write back → notify user
  │  If newer version → warn user → open config read-only → prompt to upgrade tilde
  │
  └─► tilde v2 (future): will introduce schemaVersion = 2
       - All migrations additive and non-destructive
       - New fields added with defaults; deprecated fields renamed, not removed
       - Migration failure: warn user, preserve original, offer wizard re-run
```

---

## Entity 3: Tilde Logo Variation (`docs/design/tilde-logo-variation.svg`)

### Purpose
A tilde-specific product logomark derived from the Thingstead brand. Used in the README header (FR-010). Distinguishing element: the `~` tilde character incorporated into the mark.

### SVG Specification

| Attribute | Value | Source |
|---|---|---|
| `viewBox` | `0 0 120 60` | Sized for README `width="160"` rendering |
| Background fill | `#030712` (brand bg) | `docs/design/design-tokens.md` → `--color-bg` |
| Primary colour | `#4ade80` (brand green) | `docs/design/design-tokens.md` → `--color-brand` |
| Wave path stroke | `#4ade80`, `stroke-width="4"`, `stroke-linecap="round"`, `fill="none"` | design-tokens.md Wave mark spec |
| Wave bezier | `M4 22 C8 10, 14 10, 16 22 C18 34, 24 34, 28 22` (scaled to viewBox) | design-tokens.md Wave mark spec |
| Tilde text glyph | SVG `<text>` element, monospace font, `#4ade80` fill | Distinguishing product element |
| No fixed width/height | Scales to container | GitHub README responsive |

### Structural elements

```svg
<svg viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg">
  <!-- Dark background (required for dark-on-dark terminal aesthetic) -->
  <rect width="120" height="60" fill="#030712" rx="8"/>
  <!-- Wave mark (from design tokens) -->
  <path ... stroke="#4ade80" .../> 
  <!-- Tilde character logomark -->
  <text ... fill="#4ade80">~</text>
  <!-- Optional: "tilde" wordmark in brand green -->
  <text ... fill="#4ade80" opacity="0.7">tilde</text>
</svg>
```

### State transitions
N/A — static asset

---

## Entity 4: Runtime Version Value

### Purpose
The tilde version string displayed on the splash screen and `--version` output. Must be read dynamically from `package.json` at startup (not hardcoded).

### Data flow

```
package.json { "version": "1.2.0" }
        │
        │ readFileSync + JSON.parse
        │ resolved via import.meta.url → ../package.json
        ▼
readPackageVersion(): string  (in src/index.tsx)
        │
        │ const VERSION = readPackageVersion()  (replaces hardcoded '0.1.0')
        ▼
App props: { version: VERSION }
        │
        ▼
captureEnvironment(version) → EnvironmentSnapshot.tildeVersion
        │
        ▼
Splash: v{environment.tildeVersion}
CompactHeader: v{tildeVersion}
--version flag: `tilde v${VERSION}`
```

### Fallback state

| Condition | Behaviour |
|---|---|
| `package.json` not found | Returns `'unknown'` |
| JSON parse error | Returns `'unknown'` |
| `version` field missing | Returns `'unknown'` |
| Normal operation | Returns semver string, e.g. `'1.2.0'` |

---

## Entity 5: Spec 005 Corrections (Editorial — No Runtime Entities)

### spec.md FR-006 change

| | Before | After |
|---|---|---|
| Surfaces listed | README, install page, docs site, CLI splash screen | install page, docs site, CLI splash screen |
| Rationale for removal | GitHub Markdown cannot receive custom CSS/colours | Enforceable surfaces only |

### tasks.md dependency additions

| Task | New dependency | Rationale |
|---|---|---|
| T0021 | T0011 | Both modify `site/docs/astro.config.mjs`; must run sequentially |
| T0025 | T0011 | Both modify `site/docs/astro.config.mjs`; must run sequentially |

---

## No New Persistent State

This feature introduces no new database tables, no new config fields, no new API endpoints, and no new plugin contracts. All changes are to:
- Static documentation files
- A single SVG asset
- A single line of source code (`const VERSION` declaration)
- Spec artifact corrections (editorial only)
