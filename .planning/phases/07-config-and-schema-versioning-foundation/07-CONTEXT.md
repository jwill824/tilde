# Phase 07: Config and Schema Versioning Foundation - Context

**Gathered:** 2026-06-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 07 establishes tilde's config schema evolution foundation. It standardizes `tilde.config.json` schema version semantics, compatibility behavior, migration rewrite policy, and schema inspection surfaces. The phase includes a CLI schema viewer and a docs-site schema explorer powered by shared generated schema metadata. It does not add `repos.json` support; that roadmap item appears to be stray scope from another project because GitHub #81 does not resolve in this repo.

</domain>

<decisions>
## Implementation Decisions

### Config Schema Version Policy

- **D-01:** `schemaVersion` is the authoritative config format version for `tilde.config.json`.
- **D-02:** Use semver-style `major.minor` strings for schema versions, such as `"1.7"` and future `"2.0"`.
- **D-03:** Do not use patch versions in config `schemaVersion`; patch releases are package-level only unless the schema shape changes.
- **D-04:** Additive v1 schema changes should increment the minor version.
- **D-05:** Breaking schema changes should reserve a future major version, starting with `2.0`.
- **D-06:** Deprecate the existing top-level `version` field as meaningful config state; do not treat it as the source of schema truth.
- **D-07:** Successful migrations should keep the current atomic rewrite-on-load behavior.

### Compatibility and Validation Behavior

- **D-08:** Configs with missing `schemaVersion` are invalid. There is no real legacy-user compatibility burden yet because tilde is still establishing the base CLI tool.
- **D-09:** Future unsupported `schemaVersion` values should soft-block mutation and apply operations.
- **D-10:** Future unsupported configs may still be inspected through read/help/schema paths, and output should guide the user to upgrade tilde when ready.
- **D-11:** Unknown fields in supported-schema configs should be treated as likely user error.
- **D-12:** Unknown fields should produce clear warnings and be stripped on the next successful rewrite rather than preserved indefinitely.

### Scope Cleanup

- **D-13:** Remove `repos.json` from Phase 07 scope. GitHub issue #81 does not resolve in this repository, and the user identified it as likely stray scope related to `github-repo-factory`.
- **D-14:** Phase 07 should update roadmap/requirements before planning or execution so the widened website explorer scope is explicit and the `repos.json` requirement is removed.

### CLI Schema Viewer

- **D-15:** Add a CLI schema viewer at `tilde config schema`.
- **D-16:** Default CLI output should be a readable terminal tree with field type, required/default markers, and version notes.
- **D-17:** Add `tilde config schema --json` for machine-readable schema metadata.
- **D-18:** The schema viewer should serve both maintainers and end users, not only internal debugging.

### Docs-Site Schema Explorer

- **D-19:** Include the interactive docs-site schema explorer in Phase 07, widening the phase beyond the original CLI-only roadmap text.
- **D-20:** The explorer should be a dedicated Astro/Starlight page in the configuration section/sidebar.
- **D-21:** The explorer should use the same generated schema metadata as the CLI viewer to avoid documentation drift.
- **D-22:** The explorer should include a searchable schema tree, expand/collapse groups, and field details for type, default, required status, and version notes.
- **D-23:** Do not build a full in-browser config validator/playground in this phase.

### the agent's Discretion

- The planner may choose the internal generated metadata format, as long as it powers both `tilde config schema --json` and the website explorer.
- The planner may choose exact warning wording for unknown fields and future schema versions, as long as the behavior above is preserved.
- The planner may decide whether to remove or visually de-emphasize the top-level `version` field in docs first, as long as `schemaVersion` is clearly authoritative.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning

- `.planning/PROJECT.md` - Project goal, v1.1 milestone context, macOS-first/read-first constraints, and current active requirements.
- `.planning/REQUIREMENTS.md` - Current SCHEMA requirements; must be updated to remove stray `repos.json` scope and include docs-site schema explorer scope.
- `.planning/ROADMAP.md` - Phase 07 goal and success criteria; must be updated before planning to match the decisions in this context.
- `.planning/STATE.md` - Current milestone state and accumulated decisions.
- `.planning/phases/05-config-discovery-polish/05-CONTEXT.md` - Config discovery and strict explicit override behavior that this phase should not regress.
- `.planning/phases/06-stabilization-and-config-selection-polish/06-CONTEXT.md` - Stabilization decisions and config selection trust context preceding Phase 07.

### Existing Config Schema and Migration Code

- `src/config/schema.ts` - Current Zod config schema, `schemaVersion`, deprecated `version`, field defaults, and validation refinements.
- `src/config/migrations/runner.ts` - Current migration runner, `CURRENT_SCHEMA_VERSION`, future-version detection, and existing numeric comparison risk.
- `src/config/reader.ts` - Current config load, migration, validation, future-version warning, and rewrite behavior.
- `src/config/writer.ts` - Current config write path and schema version stamping.
- `src/modes/config-first.tsx` - Existing config-first migration validation/rewrite path.
- `src/modes/reconfigure.tsx` - Existing partial recovery and schema version behavior in reconfigure flow.
- `src/index.tsx` - CLI config subcommand routing and likely integration point for `tilde config schema`.

### Tests and Documentation

- `tests/contract/config-schema.test.ts` - Existing schemaVersion contract tests to update for new semantics.
- `tests/unit/config/migration-runner.test.ts` - Existing migration runner tests to update for semver major.minor ordering and future-version behavior.
- `tests/unit/config/schema-v2.test.ts` - Existing schemaVersion parse/default tests.
- `tests/integration/cli-regression.test.ts` - Existing CLI regression suite and likely home for `tilde config schema` coverage.
- `docs/config-format.md` - Current config format docs with known drift around schema version and old `packageManager`.
- `site/docs/src/content/docs/config-format.md` - Starlight docs page with current schema drift to correct or supersede.
- `site/docs/src/content/docs/config-reference.md` - Starlight config reference to align with generated schema metadata.
- `site/docs/astro.config.mjs` - Docs sidebar integration point for the schema explorer page.
- `site/docs/package.json` - Astro/Starlight docs project scripts and dependencies.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/config/schema.ts`: Zod remains the runtime validation boundary and should be the source or input for generated schema metadata.
- `src/config/migrations/runner.ts`: Existing migration runner can be retained but needs semver-aware comparison instead of `parseFloat`.
- `src/config/reader.ts` and `src/config/writer.ts`: Existing atomic migration/write paths are the right integration points for rewrite-on-load, warning, stripping, and future-version soft-block behavior.
- `site/docs`: Existing Astro/Starlight docs site can host the explorer without introducing a new web framework.

### Established Patterns

- Config changes need schema, migrations, docs, and tests together.
- Config loading currently migrates before validation and rewrites migrated configs atomically.
- CLI subcommands write deterministic stdout/stderr and exit with explicit codes.
- Docs currently drift from runtime schema, which supports using shared/generated metadata rather than another hand-maintained table.

### Integration Points

- `tilde config schema` should integrate under the existing config subcommand routing in `src/index.tsx`.
- Shared schema metadata should be generated or exposed in a way both the Node CLI and `site/docs` can consume without duplicating schema definitions.
- Roadmap/requirements cleanup should happen before plan execution so Phase 07 no longer plans nonexistent `repos.json` work.

</code_context>

<specifics>
## Specific Ideas

- The user wants semver-style room for a future `2.0`, with additive v1 changes incrementing the minor version.
- Patch versions should not appear in config `schemaVersion`; patches remain package-release details.
- Future-version handling should follow a best-practice posture: avoid stranding users, but do not let an older tilde mutate a config it may not understand.
- The website explorer should be an interactive field browser, not a full JSON validation playground.
- The CLI and website should share generated schema metadata to avoid the current docs drift pattern.

</specifics>

<deferred>
## Deferred Ideas

None. The requested website schema explorer was explicitly folded into Phase 07, and `repos.json` was removed as stray scope rather than deferred.

</deferred>

---

*Phase: 07-Config and Schema Versioning Foundation*
*Context gathered: 2026-06-21*
