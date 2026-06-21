# Phase 1: Tool Metadata Registry - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 1-Tool Metadata Registry
**Areas discussed:** Registry ownership and shape, First migration target, Metadata strictness, Lookup behavior

---

## Registry Ownership and Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Separate metadata registry | Add a dedicated module like `src/tools/metadata.ts` or `src/metadata/tools.ts`. Wizard steps and plugins consume it without forcing all plugin contracts to change in Phase 1. | |
| Extend `PluginRegistry` | Move toward one runtime registry for plugins plus metadata, broader because browser/editor/AI-tool plugins do not currently implement the full `TildePlugin` shape. | |
| Metadata beside each plugin, aggregated centrally | Keep metadata near each first-party plugin or tool family and export an aggregate registry for cross-step lookup. | ✓ |

**User's choice:** Metadata beside each plugin, aggregated centrally.
**Notes:** User asked what is best long term. The recommendation was to colocate metadata by family and aggregate centrally because it keeps edits local, supports lookup, avoids broadening uneven plugin contracts too early, and works for non-plugin catalogs.

---

## Central Aggregate API

| Option | Description | Selected |
|--------|-------------|----------|
| Typed array plus lookup helpers | Each family exports `ToolMetadata[]`; central registry imports them and exposes helpers such as `getToolMetadata(id)`, `getToolsByCategory(category)`, and `getToolsWithDotfiles()`. | ✓ |
| Class-based registry | Mirror `PluginRegistry` with `register()`, `get()`, and `getAll()`. Useful if runtime registration matters, but heavier than needed for first-party static metadata. | |
| Plain object keyed by ID | Simple `Record<string, ToolMetadata>`. Easy lookup, but weaker for grouping multiple install identifiers, variants, and categories. | |

**User's choice:** Typed arrays plus lookup helpers.
**Notes:** This preserves static first-party metadata while making cross-step queries easy.

---

## First Migration Target

| Option | Description | Selected |
|--------|-------------|----------|
| Browser step | `src/steps/browser.tsx` duplicates browser metadata while `src/plugins/first-party/browser/index.ts` also defines `BROWSER_PLUGINS`. | ✓ |
| AI tools step | Already consumes `AI_TOOL_PLUGINS`, so migration is smaller, but tests currently expect older names that differ from implementation. | |
| Note-taking/tools step | `src/steps/tools.tsx` has inline `NOTE_TAKING_CATALOG`, useful for non-plugin metadata, but broader because it also includes manual additional tools. | |

**User's choice:** Browser step.
**Notes:** Browser is the clearest proof of shared metadata because duplication already exists.

---

## Browser Metadata Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All browser catalog fields | Move `id`, `label`, `appPath`, `brewCask`, `defaultBrowserId`, supported platforms, and plugin category into metadata. | ✓ |
| Only duplicated display/install fields | Move `id`, `label`, `appPath`, and `brewCask` first; leave `defaultBrowserId` in browser-specific code. | |
| Minimal proof of concept | Move only labels and install IDs to prove wiring, then defer richer fields. | |

**User's choice:** All browser catalog fields.
**Notes:** Browser behavior should remain visibly unchanged.

---

## Metadata Strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Strict for required core fields, optional for future fields | Require `id`, `label`, `category`, `supportedPlatforms`, and install identifiers when applicable. Allow optional `configPaths` and `dotfilePaths` to be empty now, but validate their shape if provided. | ✓ |
| Strict for every field immediately | Every seeded tool must include complete install, config, dotfile, category, label, and platform metadata now. | |
| Loose schema with warnings | Accept partial metadata and warn in tests/runtime. Faster, but weaker as a foundation. | |

**User's choice:** Strict core fields, optional future fields.
**Notes:** This gives later phases a reliable foundation without forcing all dotfile and provenance research into Phase 1.

---

## Lookup Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Practical core set | `getToolMetadata(id)`, `getToolsByCategory(category)`, `getToolsByPlatform(platform)`, `getToolsWithDotfiles()`, and install-ID lookup for Homebrew formula/cask IDs. | |
| Full query surface now | Include all practical helpers plus config-path lookup, dotfile-path lookup, variant lookup, source lookup, and fuzzy/search-like matching. | ✓ |
| Minimal browser-driven set | Only what the browser migration needs: category/platform lookup plus ID lookup. | |

**User's choice:** Full query surface now.
**Notes:** The first registry should serve later inventory, dotfile mapping, and provenance phases, not just the browser migration.

---

## the agent's Discretion

- Exact module path and naming for the metadata layer.
- Exact simple search/fuzzy implementation, provided it is deterministic and testable.

## Deferred Ideas

- Full `PluginRegistry` consolidation after the metadata model stabilizes.
- Complete config paths, dotfile paths, and provenance hints for every tool family in later phases.
