# Phase 1: Tool Metadata Registry - Research

**Researched:** 2026-06-13
**Domain:** TypeScript metadata registry, Ink wizard refactor, runtime validation, Vitest coverage
**Confidence:** HIGH for codebase shape; MEDIUM for external library docs

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
## Implementation Decisions

### Registry Ownership and Shape
- **D-01:** Tool metadata should be colocated beside each tool or plugin family, then aggregated centrally for lookup.
- **D-02:** Phase 1 must not force every tool metadata entry to become a full `TildePlugin`.
- **D-03:** The central registry should include both plugin-backed catalogs and non-plugin catalogs.
- **D-04:** Keep `PluginRegistry` integration as a later consolidation path; do not broaden its contract in this phase.
- **D-05:** Each tool family should export typed `ToolMetadata[]` data.
- **D-06:** The central aggregate registry should import family metadata and expose lookup helpers.

### First Migration Target
- **D-07:** Migrate the browser step first because browser metadata is currently duplicated between `src/steps/browser.tsx` and `src/plugins/first-party/browser/index.ts`.
- **D-08:** Move all browser catalog fields into shared metadata in this phase: `id`, `label`, `appPath`, `brewCask`, `defaultBrowserId`, supported platforms, and plugin category.
- **D-09:** `BrowserStep` should preserve its current visible behavior while reading catalog data from the shared metadata layer.

### Metadata Validation
- **D-10:** Validation should be strict for required core fields and shape-validating for optional future fields.
- **D-11:** Required core fields are `id`, `label`, `category`, `supportedPlatforms`, and install identifiers when applicable.
- **D-12:** `configPaths`, `dotfilePaths`, and richer provenance hints may be empty or absent in Phase 1, but must validate when provided.

### Lookup Surface
- **D-13:** Phase 1 should include a broad lookup surface, not only helpers needed by the browser migration.
- **D-14:** Required helpers include `getToolMetadata(id)`, `getToolsByCategory(category)`, `getToolsByPlatform(platform)`, Homebrew formula/cask install-ID lookup, config-path lookup, dotfile-path lookup, variant lookup, source lookup, and simple search or fuzzy matching where useful.

### the agent's Discretion
- The exact module path and naming are the agent's discretion, as long as metadata is colocated by family and centrally aggregated.
- The exact fuzzy/search matching implementation is the agent's discretion, as long as it is simple, deterministic, and testable.

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

- Unifying all plugin families under the current `PluginRegistry` is deferred until the metadata model is stable.
- Completing config paths, dotfile paths, and provenance hints for every tool family is deferred to later inventory, dotfiles, and provenance phases.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| META-01 | Developer can define tool metadata in one shared location instead of duplicating step-specific maps. | Use colocated family `ToolMetadata[]` exports plus one aggregate lookup module; browser duplication is verified in `src/steps/browser.tsx` and `src/plugins/first-party/browser/index.ts`. [VERIFIED: codebase grep] |
| META-02 | Tool metadata can describe install method, package identifiers, plugin category, display label, supported platforms, config paths, and dotfile locations. | Define a Zod-backed `ToolMetadataSchema` with required core fields and optional validated arrays for config/dotfile paths. [CITED: https://zod.dev/v4] |
| META-03 | Existing wizard steps can read metadata from the shared registry without changing their visible behavior. | Migrate `BrowserStep` to consume browser metadata while preserving current detect, preselect, install, and default-browser flow. [VERIFIED: codebase grep] |
| META-04 | Registry lookups can answer cross-step questions such as "which tools have dotfiles under ~/.config?". | Expose category, platform, Homebrew install ID, config path, dotfile path, variant, source, and deterministic search helpers from the aggregate registry. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md] |
| META-05 | Tests protect metadata loading, validation, and at least one existing step migration. | Add unit tests for validation/lookups and an Ink component regression around browser rendering/selection using `ink-testing-library`. [CITED: https://github.com/vadimdemedes/ink-testing-library/blob/master/readme.md] |
</phase_requirements>

## Summary

Phase 1 should create a small static metadata layer, not a runtime plugin rewrite. The existing `PluginRegistry` accepts only `TildePlugin`, while browser/editor/AI-tool interfaces are uneven and do not all implement that shape. The planner should keep metadata as colocated first-party arrays aggregated by a central lookup module. [VERIFIED: codebase grep]

The browser step is the best first migration because browser data is duplicated in `src/steps/browser.tsx` and `src/plugins/first-party/browser/index.ts`: `id`, `label`, `appPath`, `brewCask`, and `defaultBrowserId` appear in both places, and `supportedPlatforms`/`category` are missing from the step-local array. [VERIFIED: codebase grep]

Validation should use the existing `zod` dependency and tests should use the existing Vitest/Ink stack. No new runtime or dev package is required for this phase. [VERIFIED: package.json/package-lock]

**Primary recommendation:** Implement `src/tools/` as the metadata boundary: `types.ts`, `schema.ts`, `registry.ts`, and colocated family metadata under first-party tool/plugin folders. [ASSUMED]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Tool metadata definitions | CLI application source | Plugin/tool family modules | Static first-party data belongs in source and should be edited near the family it describes. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md] |
| Metadata validation | CLI application source | Test suite | Validation runs against static arrays and test fixtures before metadata is consumed by wizard flows. [CITED: https://zod.dev/v4] |
| Registry lookup helpers | CLI application source | Wizard UI | Cross-step queries should be pure functions that UI components call without owning metadata. [VERIFIED: codebase grep] |
| Browser wizard migration | Ink UI step | Metadata registry and package-manager utility | `BrowserStep` owns terminal interaction state; registry owns data; install/default actions remain separate behavior. [VERIFIED: codebase grep] |
| Future inventory/provenance support | CLI application source | Scanner/dotfile phases | Later phases need registry facts but should not be implemented in Phase 1. [VERIFIED: .planning/ROADMAP.md] |

## Project Constraints (from AGENTS.md)

- Runtime is Node.js >=20, TypeScript NodeNext, and ESM; new local TypeScript imports must use `.js` extensions. [VERIFIED: AGENTS.md]
- UI is Ink/React terminal UI; migrated wizard behavior must remain terminal-friendly and non-interactive paths must stay supported where relevant. [VERIFIED: AGENTS.md]
- Platform target is macOS-first; Homebrew, app bundles, shell rc files, and dotfiles discovery should prioritize macOS. [VERIFIED: AGENTS.md]
- Discovery and metadata work must be non-destructive by default. [VERIFIED: AGENTS.md]
- Raw secrets must not be resolved or persisted; secret references remain backend references. [VERIFIED: AGENTS.md]
- External commands including `brew`, `gh`, `op`, `vfox`, and `defaultbrowser` must be mocked in automated tests. [VERIFIED: AGENTS.md]
- Source files use two-space indentation, single quotes, semicolons, strict TypeScript, and relative imports without path aliases. [VERIFIED: AGENTS.md]
- Keep schema changes, migrations, docs, and tests together when schema behavior changes. [VERIFIED: AGENTS.md]
- Use existing plugin interfaces instead of hardcoding new integrations inside wizard steps. [VERIFIED: AGENTS.md]
- Do not broaden `PluginRegistry` in this phase because user decisions explicitly defer that consolidation. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | locked 5.4.5; npm latest 6.0.3 modified 2026-04-16 | Type metadata types, discriminated unions, strict compile checks | Project already compiles all `src/**/*` with `moduleResolution: NodeNext` and strict mode. [VERIFIED: package-lock/npm view/codebase grep] |
| Zod | locked 4.3.6; npm latest 4.4.3 modified 2026-05-04 | Runtime validation for metadata arrays and optional shape checks | Existing project schema boundary uses Zod, and Zod 4 supports parse/safeParse validation. [VERIFIED: package-lock/npm view/codebase grep] [CITED: https://zod.dev/v4] |
| Vitest | locked 4.1.2; npm latest 4.1.8 modified 2026-06-12 | Unit and integration tests for registry helpers and migrated step behavior | Existing test scripts and configs already use Vitest for unit/integration/contract suites. [VERIFIED: package-lock/npm view/codebase grep] |
| Ink / React | Ink locked 6.8.0; React locked 19.2.4 | Existing terminal wizard UI | `BrowserStep`, `AIToolsStep`, and other steps are React components rendered by Ink. [VERIFIED: package-lock/codebase grep] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ink-testing-library | locked 4.0.0; npm latest 4.0.0 modified 2024-05-22 | Render Ink components and drive stdin in tests | Use for migrated `BrowserStep` regression tests around visible output and keyboard selection. [VERIFIED: package-lock/npm view] [CITED: https://github.com/vadimdemedes/ink-testing-library/blob/master/readme.md] |
| execa | locked 9.6.1 | External command execution for plugin/package-manager behavior | Do not call directly from registry helpers; keep command behavior in existing plugins/utilities. [VERIFIED: package-lock/codebase grep] |
| Node `fs/promises` | Node v22.22.2 locally | App bundle detection by path | `BrowserStep` and browser plugins currently use `access()` for detection; keep filesystem reads mockable in tests. [VERIFIED: codebase grep/environment probe] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod validation | TypeScript `satisfies` only | `satisfies` catches compile-time shape drift but cannot validate dynamically imported arrays or test malformed fixture data. [ASSUMED] |
| Static aggregate module | Runtime class registry | A class registry mirrors `PluginRegistry`, but Phase 1 decisions favor static family arrays and helper functions. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md] |
| Central-only metadata file | Colocated metadata files | A single large file is simple but conflicts with D-01 colocated ownership. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md] |

**Installation:**

```bash
# No new package installation is recommended for Phase 1.
```

**Version verification:** npm registry checks initially failed in the sandbox with DNS `ENOTFOUND`, then succeeded with approved network access for `zod`, `vitest`, `typescript`, `ink`, `react`, and `ink-testing-library`. [VERIFIED: npm view]

## Package Legitimacy Audit

Phase 1 should not install external packages. The existing packages above are already present in `package.json` and `package-lock.json`; the package-legitimacy gate is therefore not required as an install gate. [VERIFIED: package.json/package-lock]

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| none | npm | n/a | n/a | n/a | n/a | No new package install recommended. [VERIFIED: package.json/package-lock] |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: package.json/package-lock]
**Packages flagged as suspicious [SUS]:** none for install, because no package install is recommended. A separate seam probe against existing dependencies returned unknown signals and should not be used as an install decision for this phase. [VERIFIED: gsd-tools package-legitimacy output]

## Architecture Patterns

### System Architecture Diagram

```text
Family metadata files
  src/plugins/first-party/browser/metadata.ts
  src/plugins/first-party/ai-tools/metadata.ts
  optional future non-plugin catalogs
        |
        v
ToolMetadataSchema.safeParse() at aggregate load/test boundary
        |
        v
src/tools/registry.ts
  - allToolMetadata
  - getToolMetadata(id)
  - getToolsByCategory(category)
  - getToolsByPlatform(platform)
  - getToolsByHomebrewId(id)
  - getToolsByConfigPath(path)
  - getToolsByDotfilePath(path)
  - getToolsByVariant(variant)
  - getToolsBySource(source)
  - searchTools(query)
        |
        +------------------------+
        |                        |
        v                        v
BrowserStep data rendering       Future scanner/dotfile/provenance phases
  - detection remains read-only     - inventory facts
  - installs still use utils        - dotfile ownership
  - defaultbrowser unchanged        - provenance labels
```

### Recommended Project Structure

```text
src/
├── tools/
│   ├── metadata.ts        # ToolMetadata types and Zod schema exports
│   ├── registry.ts        # Aggregate metadata array and lookup helpers
│   └── registry.test-data.ts? # Optional malformed fixtures should stay in tests instead
├── plugins/
│   └── first-party/
│       ├── browser/
│       │   ├── index.ts   # BrowserPlugin behavior; imports metadata where useful
│       │   └── metadata.ts
│       └── ai-tools/
│           ├── index.ts
│           └── metadata.ts
└── steps/
    └── browser.tsx        # Uses registry/family metadata for visible list data
```

Use `src/tools/` rather than `src/plugins/registry.ts` so the planner can honor D-04 and avoid changing `PluginRegistry` contracts. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md]

### Pattern 1: Static Metadata Schema

**What:** Define a TypeScript type inferred from a Zod schema, then validate arrays in tests and at the aggregate boundary. [CITED: https://zod.dev/v4]
**When to use:** Use for first-party catalogs whose data will be consumed by UI, scanners, and later provenance logic. [VERIFIED: .planning/ROADMAP.md]
**Example:**

```typescript
// Source: Context7 Zod docs and existing src/config/schema.ts style.
import { z } from 'zod';
import type { PluginCategory } from '../plugins/api.js';

export const PlatformSchema = z.enum(['darwin', 'linux', 'win32']);
export const ToolMetadataSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  category: z.custom<PluginCategory>(),
  supportedPlatforms: z.array(PlatformSchema).min(1),
  install: z.object({
    homebrew: z.object({
      formula: z.string().min(1).optional(),
      cask: z.string().min(1).optional(),
    }).optional(),
    appPath: z.string().min(1).optional(),
  }).optional(),
  configPaths: z.array(z.string().min(1)).optional(),
  dotfilePaths: z.array(z.string().min(1)).optional(),
  variants: z.array(z.string().min(1)).optional(),
  source: z.enum(['first-party', 'community', 'local']).default('first-party'),
});

export type ToolMetadata = z.infer<typeof ToolMetadataSchema>;
```

### Pattern 2: Pure Lookup Helpers

**What:** Aggregate a readonly array and expose deterministic filter/find helpers. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md]
**When to use:** Use when wizard steps and later scanners need the same facts without owning duplicate catalogs. [VERIFIED: .planning/REQUIREMENTS.md]
**Example:**

```typescript
// Source: Phase CONTEXT D-13/D-14 plus existing static LANGUAGE_CATALOG pattern.
import { browserToolMetadata } from '../plugins/first-party/browser/metadata.js';

export const allToolMetadata = [
  ...browserToolMetadata,
] as const;

export function getToolMetadata(id: string) {
  return allToolMetadata.find(tool => tool.id === id);
}

export function getToolsByCategory(category: string) {
  return allToolMetadata.filter(tool => tool.category === category);
}

export function searchTools(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return allToolMetadata.filter(tool =>
    tool.id.toLowerCase().includes(q) ||
    tool.label.toLowerCase().includes(q)
  );
}
```

### Pattern 3: Browser Behavior Uses Metadata, Not Registry Side Effects

**What:** Convert `KNOWN_BROWSERS` to derive from browser metadata while keeping detection/install/default behavior in existing code paths. [VERIFIED: codebase grep]
**When to use:** Use for Phase 1 proof migration; do not migrate all wizard steps unless the planner has spare capacity after browser tests are green. [VERIFIED: .planning/ROADMAP.md]
**Example:**

```typescript
// Source: existing src/steps/browser.tsx behavior and Phase CONTEXT D-07/D-09.
import { getToolsByCategory } from '../tools/registry.js';

const KNOWN_BROWSERS = getToolsByCategory('browser').map(tool => ({
  id: tool.id,
  label: tool.label,
  appPath: tool.install?.appPath,
  brewCask: tool.install?.homebrew?.cask,
  defaultBrowserId: tool.externalIds?.defaultbrowser,
}));
```

### Anti-Patterns to Avoid

- **Broadening `PluginRegistry`:** The current registry is typed around `TildePlugin`, while browser/editor/AI-tool interfaces are not uniform. Keep this phase separate. [VERIFIED: codebase grep] [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md]
- **Retyping expected catalogs inside tests:** `tests/unit/ai-tools.test.ts` currently uses a hardcoded expected list that no longer matches `AI_TOOL_PLUGINS`, creating drift risk. Import actual metadata in tests. [VERIFIED: codebase grep]
- **Running real external commands in tests:** Browser install/default behavior touches Homebrew and `defaultbrowser`; tests must mock those boundaries. [VERIFIED: AGENTS.md] [VERIFIED: codebase grep]
- **Making optional future fields required:** `configPaths` and `dotfilePaths` may be absent/empty in Phase 1, but must validate when provided. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Runtime schema validation | Custom `if`/`throw` validators | Existing `zod` | Keeps validation consistent with `src/config/schema.ts` and provides `safeParse` result handling. [VERIFIED: codebase grep] [CITED: https://zod.dev/v4] |
| Ink component testing | Manual stdout stream harness | `ink-testing-library` | Existing dependency returns `lastFrame`, `frames`, and `stdin.write()` for UI assertions. [CITED: https://github.com/vadimdemedes/ink-testing-library/blob/master/readme.md] |
| Module mocking | Ad hoc monkey patching after imports | Vitest `vi.mock` before dynamic imports | Vitest docs state `vi.mock` is hoisted; existing tests already mock filesystem and command modules this way. [CITED: https://github.com/vitest-dev/vitest/blob/main/docs/guide/mocking.md] [VERIFIED: codebase grep] |
| Fuzzy search | New fuzzy-search dependency | Case-insensitive `includes` over id/label/aliases | Phase context asks for simple, deterministic, testable search where useful. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md] |
| Plugin consolidation | New plugin inheritance hierarchy | Static metadata aggregate plus existing plugin interfaces | User decisions defer `PluginRegistry` consolidation. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md] |

**Key insight:** The registry is product data plus query helpers, not a command execution layer. Keeping those concerns separate avoids making inventory/provenance depend on Homebrew, app bundle checks, or Ink state. [ASSUMED]

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None - the project has no database/backend service and Phase 1 does not rename persisted config keys such as `browser.selected` or `browser.default`. [VERIFIED: codebase grep] | No data migration. |
| Live service config | None - no external service configuration is part of Phase 1 metadata registry work. [VERIFIED: .planning/ROADMAP.md] | No service patch. |
| OS-registered state | None - browser `.app` paths and `defaultbrowser` identifiers are read/used at runtime but this phase does not register OS services. [VERIFIED: codebase grep] | No re-registration. |
| Secrets/env vars | None - metadata fields in scope are labels, ids, paths, install ids, category, platforms, and provenance hints; raw secret resolution is explicitly out of scope. [VERIFIED: AGENTS.md] [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md] | Preserve secret-safety constraints. |
| Build artifacts | `dist/` exists but source changes will rebuild through `npm run build`; no old package name or generated registry artifact is in scope. [VERIFIED: filesystem/codebase grep] | Run build after implementation. |

## Common Pitfalls

### Pitfall 1: Accidentally Rewriting Plugin Architecture
**What goes wrong:** Metadata work turns into `PluginRegistry` consolidation. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md]
**Why it happens:** Existing plugin category interfaces share names with metadata categories but are not all `TildePlugin`. [VERIFIED: codebase grep]
**How to avoid:** Keep `src/tools/registry.ts` pure and static; use plugin modules only as optional consumers/producers of metadata. [ASSUMED]
**Warning signs:** Tasks modify `src/plugins/registry.ts` public API or force `BrowserPlugin`/`AIToolPlugin` to extend `TildePlugin`. [VERIFIED: codebase grep]

### Pitfall 2: Browser UI Regressions Hidden by Weak Tests
**What goes wrong:** The browser list still renders, but selection defaults, install filtering, or default-browser values change. [VERIFIED: codebase grep]
**Why it happens:** `BrowserStep` contains local state transitions and derives initial `selected` from saved values or installed state. [VERIFIED: codebase grep]
**How to avoid:** Add an Ink test with mocked `node:fs/promises.access`, `installCask`, and `execa`, then assert labels, selected output, install calls, and completion payload. [CITED: https://github.com/vadimdemedes/ink-testing-library/blob/master/readme.md] [CITED: https://github.com/vitest-dev/vitest/blob/main/docs/guide/mocking.md]
**Warning signs:** Tests only assert `typeof frame === 'string'` after rendering. [VERIFIED: codebase grep]

### Pitfall 3: Required Install Identifiers Are Too Rigid
**What goes wrong:** Safari or App Store-only tools fail validation because they have no Homebrew cask/formula. [VERIFIED: codebase grep]
**Why it happens:** "Install identifiers when applicable" is not the same as "every tool has a Homebrew id". [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md]
**How to avoid:** Model install identifiers as optional branches, but enforce at least one install/discovery hint for installable tools where applicable. [ASSUMED]
**Warning signs:** `safari` metadata is forced to have `brewCask`, or `bear`-style App Store tools cannot be represented later. [VERIFIED: codebase grep]

### Pitfall 4: Search Helper Becomes Fuzzy Magic
**What goes wrong:** Search results become nondeterministic or require a new dependency. [ASSUMED]
**Why it happens:** D-14 says "fuzzy matching where useful", which can invite overbuilding. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md]
**How to avoid:** Implement deterministic lowercase `includes` over `id`, `label`, aliases, install ids, and variants. [ASSUMED]
**Warning signs:** Planner adds a fuzzy-search package or ranking engine. [ASSUMED]

## Code Examples

Verified patterns from official sources and this codebase:

### Validate Metadata With SafeParse

```typescript
// Source: Context7 Zod docs plus existing src/config/schema.ts pattern.
import { z } from 'zod';

const ToolMetadataArraySchema = z.array(ToolMetadataSchema);

export function validateToolMetadata(metadata: unknown) {
  const result = ToolMetadataArraySchema.safeParse(metadata);
  if (!result.success) {
    throw new Error(`Invalid tool metadata: ${result.error.message}`);
  }
  return result.data;
}
```

### Mock Dynamic Imports in Browser Step Tests

```typescript
// Source: Vitest docs and existing tests/integration/wizard-flow.test.tsx pattern.
import { render } from 'ink-testing-library';
import React from 'react';
import { vi, expect, it } from 'vitest';

vi.mock('node:fs/promises', () => ({
  access: vi.fn().mockRejectedValue(new Error('ENOENT')),
}));

it('renders browser metadata from the registry', async () => {
  const { BrowserStep } = await import('../../src/steps/browser.js');
  const onComplete = vi.fn();
  const { lastFrame } = render(<BrowserStep onComplete={onComplete} />);

  await new Promise(resolve => setTimeout(resolve, 200));
  expect(lastFrame()).toContain('Google Chrome');
});
```

### Lookup Dotfile Owners Later Without Reworking API

```typescript
// Source: Phase requirement META-04.
export function getToolsByDotfilePath(path: string) {
  return allToolMetadata.filter(tool =>
    tool.dotfilePaths?.some(candidate => candidate === path || path.startsWith(`${candidate}/`))
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Step-local inline browser catalog | Shared family metadata plus aggregate lookups | Phase 1 target | Removes duplicated browser facts without UI behavior change. [VERIFIED: .planning/ROADMAP.md] |
| Plugin-only catalogs | Metadata catalogs that can cover plugin-backed and non-plugin tools | Phase 1 target | Allows note-taking/App Store/manual tools to be represented later. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md] |
| Test constants copied from implementation ideas | Tests import real metadata and add malformed fixtures separately | Phase 1 recommendation | Reduces drift seen in AI tools test naming. [VERIFIED: codebase grep] |

**Deprecated/outdated:**
- Treating `BrowserStep` as the owner of browser catalog data should stop in Phase 1; it should own interaction state only. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md]
- Treating `PluginRegistry` as the immediate consolidation point is out of scope for Phase 1. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `src/tools/` is the preferred module path for the metadata boundary. | Summary, Architecture Patterns | Low - CONTEXT leaves exact path to agent discretion; planner can choose equivalent naming. |
| A2 | Static metadata plus pure lookup helpers are sufficient without runtime registration. | Don't Hand-Roll, Architecture Patterns | Medium - if later phases need dynamic/community plugins sooner than expected, API may need extension. |
| A3 | Deterministic lowercase `includes` search is enough for Phase 1. | Common Pitfalls, Don't Hand-Roll | Low - D-14 only asks for simple search/fuzzy where useful. |
| A4 | Registry helpers should not call command execution or filesystem APIs. | Don't Hand-Roll | Medium - if planner mixes detection into metadata, tests and inventory boundaries get harder. |
| A5 | Install identifier validation should be conditional by install/discovery mode. | Common Pitfalls | Medium - too-loose validation could miss malformed installable tools; too-strict validation could reject Safari/manual apps. |

## Open Questions (RESOLVED)

1. **Phase 1 metadata seed scope**
   - Decision: Phase 1 seeds browser metadata plus the small non-plugin note-taking slice required by D-03. The note-taking seed comes from `src/steps/tools.tsx` and includes Obsidian, Notion, and Bear. [VERIFIED: codebase grep]
   - Decision: AI tool metadata stays out of Phase 1 unless an existing test needs to read it for comparison. `AIToolsStep` migration is not part of this phase. [VERIFIED: .planning/ROADMAP.md]
   - Plan alignment: `01-01-PLAN.md` creates `browserToolMetadata`, `noteTakingToolMetadata`, and a central aggregate registry; later plans preserve the browser migration path. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-01-PLAN.md]

2. **Homebrew install identifier validation**
   - Decision: Homebrew formula and cask ids are optional because some valid tools, such as Safari and Bear, are not represented by a Homebrew id in this phase. [VERIFIED: codebase grep]
   - Decision: When a Homebrew id is present, validation should reject empty strings, whitespace, control characters, and shell metacharacters. It should allow valid formula/cask names containing slashes, dots, pluses, at signs, and hyphens. [ASSUMED]
   - Plan alignment: `01-01-PLAN.md` directs `ToolInstallSchema` to enforce this strict-but-compatible shape and tests it in `tests/unit/tool-metadata.test.ts`. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-01-PLAN.md]

3. **Browser default identifier placement**
   - Decision: Browser default identifiers live under generic `externalIds.defaultbrowser`, not a browser-only field. Browser consumers can map this generic external id back into the existing `defaultBrowserId` runtime field. [VERIFIED: codebase grep]
   - Plan alignment: `01-01-PLAN.md` defines `externalIds.defaultbrowser`; `01-02-PLAN.md` preserves the browser migration path by mapping it into `BrowserStep` and `BROWSER_PLUGINS` behavior. [VERIFIED: .planning/phases/01-tool-metadata-registry/01-01-PLAN.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | TypeScript build/tests | yes | v22.22.2 | Must be >=20 per project constraints. [VERIFIED: environment probe/AGENTS.md] |
| npm | Test/build scripts and package metadata checks | yes | 10.9.7 | none needed. [VERIFIED: environment probe] |
| ctx7 | Documentation lookup fallback | yes | 0.4.0 | Context7 MCP was not exposed; CLI fallback worked with network approval. [VERIFIED: environment probe] |
| npm registry network | Version verification | yes with approval | n/a | Use `package-lock.json` for locked installed versions when offline. [VERIFIED: npm view/package-lock] |

**Missing dependencies with no fallback:** none. [VERIFIED: environment probe]

**Missing dependencies with fallback:** Context7 MCP tool unavailable in this session; `ctx7` CLI fallback was available. [VERIFIED: environment probe]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest locked 4.1.2 with unit, integration, and contract configs. [VERIFIED: package-lock/codebase grep] |
| Config file | `vitest.config.ts` for unit tests; `vitest.integration.config.ts` for Ink integration tests; `vitest.contract.config.ts` for contracts. [VERIFIED: codebase grep] |
| Quick run command | `npm run test -- tests/unit/tool-metadata.test.ts -x` [ASSUMED] |
| Full suite command | `npm test` plus `npm run test:integration` if browser component behavior is migrated. [VERIFIED: package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| META-01 | Metadata is defined once and imported by browser consumers. | unit | `npm run test -- tests/unit/tool-metadata.test.ts -x` | No - Wave 0 |
| META-02 | Schema accepts valid install/config/dotfile/platform/category metadata and rejects malformed required fields. | unit | `npm run test -- tests/unit/tool-metadata.test.ts -x` | No - Wave 0 |
| META-03 | Browser step renders the same browser labels and completion payload after consuming registry data. | integration/component | `npm run test:integration -- tests/integration/wizard-flow.test.tsx -t "browser"` | Existing file, needs stronger assertion. [VERIFIED: codebase grep] |
| META-04 | Lookup helpers answer category, platform, Homebrew id, config path, dotfile path, variant, source, and search queries. | unit | `npm run test -- tests/unit/tool-metadata.test.ts -x` | No - Wave 0 |
| META-05 | Tests fail for missing/malformed metadata and protect migrated browser behavior. | unit/integration | `npm test` and targeted integration test | Partial - needs new unit file and stronger browser test. [VERIFIED: codebase grep] |

### Sampling Rate

- **Per task commit:** `npm run test -- tests/unit/tool-metadata.test.ts -x` after metadata work; targeted browser integration after step migration. [ASSUMED]
- **Per wave merge:** `npm test` [VERIFIED: package.json]
- **Phase gate:** `npm run build`, `npm run lint`, `npm test`, and targeted integration coverage for browser behavior. [VERIFIED: package.json]

### Wave 0 Gaps

- [ ] `tests/unit/tool-metadata.test.ts` - validates schema, malformed fixtures, uniqueness, and lookup helpers for META-01/META-02/META-04/META-05. [ASSUMED]
- [ ] Strengthen `tests/integration/wizard-flow.test.tsx` browser test - assert actual labels and output/payload rather than only `typeof frame === 'string'`. [VERIFIED: codebase grep]
- [ ] Optional `tests/unit/browser-metadata.test.ts` - preserves current `BROWSER_PLUGINS` metadata expectations through shared metadata source. [ASSUMED]

## Security Domain

Security enforcement is enabled in `.planning/config.json`, so Phase 1 planning must include a security control map. [VERIFIED: .planning/config.json]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | No authentication surface in static metadata registry. [VERIFIED: .planning/ROADMAP.md] |
| V3 Session Management | no | No sessions or cookies in CLI metadata registry. [VERIFIED: .planning/ROADMAP.md] |
| V4 Access Control | no | No multi-user authorization boundary in local CLI metadata. [VERIFIED: .planning/ROADMAP.md] |
| V5 Input Validation | yes | Zod schema validation for metadata arrays and strict tests for required fields. [CITED: https://zod.dev/v4] |
| V6 Cryptography | no | No crypto or secret material should be introduced; raw secrets remain out of scope. [VERIFIED: AGENTS.md] |

### Known Threat Patterns for TypeScript CLI Metadata

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed install identifiers later passed to command execution | Tampering | Validate install ids as plain package/cask strings and keep command execution in existing argument-array wrappers, not shell interpolation. [VERIFIED: codebase grep] |
| Metadata path traversal or unsafe absolute writes in later phases | Tampering | Treat config/dotfile paths as read-only metadata in Phase 1; later writer/scanner phases must validate before writes. [VERIFIED: AGENTS.md] |
| Raw secrets accidentally recorded as config path/provenance hints | Information Disclosure | Keep metadata limited to tool ids, labels, install ids, paths, categories, platforms, variants, and source; do not resolve env values. [VERIFIED: AGENTS.md] |
| UI spoofing through labels containing control characters | Spoofing | Require non-empty labels and consider rejecting control characters in metadata validation. [ASSUMED] |

## Sources

### Primary (HIGH confidence)

- `AGENTS.md` - project constraints, stack, conventions, security/testability rules. [VERIFIED: codebase grep]
- `.planning/phases/01-tool-metadata-registry/01-CONTEXT.md` - locked Phase 1 decisions and deferred scope. [VERIFIED: codebase grep]
- `.planning/REQUIREMENTS.md` - META-01 through META-05. [VERIFIED: codebase grep]
- `.planning/ROADMAP.md` - phase goal, success criteria, and plan slices. [VERIFIED: codebase grep]
- `src/plugins/api.ts`, `src/plugins/registry.ts`, `src/plugins/first-party/browser/index.ts`, `src/steps/browser.tsx`, `src/plugins/first-party/ai-tools/index.ts`, `src/steps/ai-tools.tsx`, `src/steps/tools.tsx` - current implementation shape. [VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)

- Context7 `/websites/zod_dev_v4` - Zod 4 parse/safeParse and refinement behavior. [CITED: https://zod.dev/v4]
- Context7 `/vitest-dev/vitest` - `vi.mock` module mocking and hoisting behavior. [CITED: https://github.com/vitest-dev/vitest/blob/main/docs/guide/mocking.md]
- Context7 `/vadimdemedes/ink-testing-library` - `render`, `lastFrame`, `frames`, and `stdin.write()` API. [CITED: https://github.com/vadimdemedes/ink-testing-library/blob/master/readme.md]
- OWASP ASVS project page - security category framing used by the configured GSD security domain. [CITED: https://owasp.org/www-project-application-security-verification-standard/]

### Tertiary (LOW confidence)

- No web-only ecosystem recommendations were used. [VERIFIED: research process]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - package versions verified from `package-lock.json` and current npm registry metadata where network approval was available. [VERIFIED: package-lock/npm view]
- Architecture: HIGH - constrained by locked context and existing code shape. [VERIFIED: codebase grep]
- Pitfalls: HIGH for plugin/browser/test drift issues found in code; MEDIUM for recommended exact helper names and search behavior. [VERIFIED: codebase grep] [ASSUMED]

**Research date:** 2026-06-13
**Valid until:** 2026-07-13 for codebase-specific findings; 2026-06-20 for npm registry freshness. [ASSUMED]
